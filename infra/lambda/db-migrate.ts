import { Handler } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Client } from 'pg';

const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION });

interface DbCredentials {
  username: string;
  password: string;
  host: string;
  port: number;
  dbname: string;
}

async function getDbCredentials(): Promise<DbCredentials> {
  const command = new GetSecretValueCommand({
    SecretId: process.env.DB_SECRET_ARN,
  });
  
  const response = await secretsManager.send(command);
  const secret = JSON.parse(response.SecretString!);
  
  return {
    username: secret.username,
    password: secret.password,
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '5432'),
    dbname: process.env.DB_NAME || 'ctcm',
  };
}

export const handler: Handler = async (event) => {
  console.log('Starting database migration...');
  
  const credentials = await getDbCredentials();
  
  const client = new Client({
    host: credentials.host,
    port: credentials.port,
    database: credentials.dbname,
    user: credentials.username,
    password: credentials.password,
    ssl: {
      rejectUnauthorized: false,
    },
  });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Read the SQL migration file content from the event
    const sqlContent = event.sqlContent || event.body;
    
    if (!sqlContent) {
      throw new Error('No SQL content provided');
    }
    
    console.log('Executing migration SQL...');
    await client.query(sqlContent);
    console.log('Migration completed successfully');
    
    // Verify tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('Tables created:', result.rows.map(r => r.table_name));
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Migration completed successfully',
        tables: result.rows.map(r => r.table_name),
      }),
    };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
};
