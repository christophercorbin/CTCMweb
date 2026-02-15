#!/usr/bin/env tsx

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const region = 'us-east-1';
const secretsManager = new SecretsManagerClient({ region });
const cloudformation = new CloudFormationClient({ region });

async function getStackOutput(stackName: string, outputKey: string): Promise<string> {
  const command = new DescribeStacksCommand({ StackName: stackName });
  const response = await cloudformation.send(command);
  const stack = response.Stacks?.[0];
  const output = stack?.Outputs?.find(o => o.OutputKey === outputKey);
  
  if (!output?.OutputValue) {
    throw new Error(`Output ${outputKey} not found in stack ${stackName}`);
  }
  
  return output.OutputValue;
}

async function main() {
  console.log('🚀 Starting database migration...\n');
  
  // Get database credentials from Secrets Manager
  console.log('📦 Fetching database credentials...');
  const secretArn = await getStackOutput('CtcmDevDataStack', 'DatabaseSecretArn');
  const secretCommand = new GetSecretValueCommand({ SecretId: secretArn });
  const secretResponse = await secretsManager.send(secretCommand);
  const secret = JSON.parse(secretResponse.SecretString!);
  
  // Get database endpoint
  const dbHost = await getStackOutput('CtcmDevDataStack', 'DatabaseEndpoint');
  
  console.log(`✓ Database Host: ${dbHost}`);
  console.log(`✓ Database User: ${secret.username}\n`);
  
  // Read migration SQL file
  const migrationFile = join(process.cwd(), 'infra/migrations/001_initial_schema.sql');
  console.log(`📄 Reading migration file: ${migrationFile}`);
  const sqlContent = readFileSync(migrationFile, 'utf-8');
  
  // Connect to database
  console.log('🔌 Connecting to database...');
  const client = new Client({
    host: dbHost,
    port: 5432,
    database: 'ctcm',
    user: secret.username,
    password: secret.password,
    ssl: {
      rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 10000,
  });
  
  try {
    await client.connect();
    console.log('✓ Connected to database\n');
    
    // Execute migration
    console.log('⚙️  Executing migration SQL...');
    await client.query(sqlContent);
    console.log('✓ Migration executed successfully\n');
    
    // Verify tables
    console.log('🔍 Verifying tables...');
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log(`✓ Found ${result.rows.length} tables:`);
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Count sample data
    console.log('\n📊 Sample data counts:');
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM shipments) as shipments,
        (SELECT COUNT(*) FROM packages) as packages,
        (SELECT COUNT(*) FROM invoices) as invoices;
    `);
    console.log(`  - Customers: ${counts.rows[0].customers}`);
    console.log(`  - Shipments: ${counts.rows[0].shipments}`);
    console.log(`  - Packages: ${counts.rows[0].packages}`);
    console.log(`  - Invoices: ${counts.rows[0].invoices}`);
    
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
