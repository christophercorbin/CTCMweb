import { Pool, PoolClient, QueryResult } from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

interface DatabaseCredentials {
  username: string;
  password: string;
  host: string;
  port: number;
  dbname: string;
}

interface DatabaseConfig {
  secretArn: string;
  region: string;
  maxConnections?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
}

let pool: Pool | null = null;
let credentials: DatabaseCredentials | null = null;

/**
 * Retrieves database credentials from AWS Secrets Manager
 */
async function getCredentials(secretArn: string, region: string): Promise<DatabaseCredentials> {
  if (credentials) {
    return credentials;
  }

  const client = new SecretsManagerClient({ region });
  
  try {
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const response = await client.send(command);
    
    if (!response.SecretString) {
      throw new Error('Secret value is empty');
    }

    credentials = JSON.parse(response.SecretString);
    return credentials!;
  } catch (error) {
    console.error('Failed to retrieve database credentials:', error);
    throw new Error('Database credentials retrieval failed');
  }
}

/**
 * Initializes the database connection pool
 * Reuses existing pool for Lambda container reuse
 */
export async function initializePool(config: DatabaseConfig): Promise<Pool> {
  if (pool) {
    return pool;
  }

  const creds = await getCredentials(config.secretArn, config.region);

  pool = new Pool({
    host: creds.host,
    port: creds.port,
    database: creds.dbname,
    user: creds.username,
    password: creds.password,
    max: config.maxConnections || 10,
    idleTimeoutMillis: config.idleTimeoutMs || 30000,
    connectionTimeoutMillis: config.connectionTimeoutMs || 10000,
    // Enable SSL for RDS
    ssl: {
      rejectUnauthorized: false,
    },
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });

  return pool;
}

/**
 * Gets the database pool, initializing if necessary
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool first.');
  }
  return pool;
}

/**
 * Executes a query with automatic retry logic
 */
export async function query<T = unknown>(
  text: string,
  params?: unknown[],
  retries = 2
): Promise<QueryResult<T>> {
  const pool = getPool();
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await pool.query<T>(text, params);
    } catch (error: unknown) {
      const isLastAttempt = attempt === retries;
      const err = error as { code?: string; message?: string };
      const isRetryable = err.code === 'ECONNRESET' || 
                          err.code === 'ETIMEDOUT' ||
                          err.code === '57P03'; // cannot_connect_now

      if (isLastAttempt || !isRetryable) {
        console.error('Database query failed:', {
          error: err.message,
          code: err.code,
          attempt: attempt + 1,
        });
        throw error;
      }

      // Wait before retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Query failed after all retries');
}

/**
 * Executes a transaction with automatic rollback on error
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction failed and rolled back:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Closes the database pool
 * Should be called during Lambda shutdown (rarely needed due to container reuse)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    credentials = null;
  }
}

/**
 * Health check for database connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health');
    return result.rows.length === 1 && result.rows[0].health === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
