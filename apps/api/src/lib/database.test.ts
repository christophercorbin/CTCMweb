import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Pool } from 'pg';

// Mock pg and AWS SDK
vi.mock('pg');
vi.mock('@aws-sdk/client-secrets-manager');

describe('Database Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up any pools
    const { closePool } = await import('./database');
    await closePool();
  });

  it('should initialize pool with credentials from Secrets Manager', async () => {
    // Mock Secrets Manager response
    const mockSend = vi.fn().mockResolvedValue({
      SecretString: JSON.stringify({
        username: 'testuser',
        password: 'testpass',
        host: 'localhost',
        port: 5432,
        dbname: 'testdb',
      }),
    });

    const { SecretsManagerClient } = await import('@aws-sdk/client-secrets-manager');
    vi.mocked(SecretsManagerClient).mockImplementation(() => ({
      send: mockSend,
    } as any));

    const { initializePool } = await import('./database');
    
    const pool = await initializePool({
      secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test',
      region: 'us-east-1',
    });

    expect(pool).toBeDefined();
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('should reuse existing pool on subsequent calls', async () => {
    const mockSend = vi.fn().mockResolvedValue({
      SecretString: JSON.stringify({
        username: 'testuser',
        password: 'testpass',
        host: 'localhost',
        port: 5432,
        dbname: 'testdb',
      }),
    });

    const { SecretsManagerClient } = await import('@aws-sdk/client-secrets-manager');
    vi.mocked(SecretsManagerClient).mockImplementation(() => ({
      send: mockSend,
    } as any));

    const { initializePool } = await import('./database');
    
    const pool1 = await initializePool({
      secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test',
      region: 'us-east-1',
    });

    const pool2 = await initializePool({
      secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test',
      region: 'us-east-1',
    });

    expect(pool1).toBe(pool2);
    expect(mockSend).toHaveBeenCalledTimes(1); // Should only fetch credentials once
  });

  it('should throw error when getting pool before initialization', async () => {
    const { getPool } = await import('./database');
    
    expect(() => getPool()).toThrow('Database pool not initialized');
  });
});
