import { Handler } from 'aws-lambda'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { Client } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' })

interface DbCredentials {
  username: string
  password: string
  host: string
  port: number
  dbname: string
}

export const handler: Handler = async (event) => {
  console.log('Starting database schema initialization...')
  
  const secretArn = process.env.DATABASE_SECRET_ARN
  const dbHost = process.env.DATABASE_HOST
  const dbName = process.env.DATABASE_NAME || 'ctcm'
  
  if (!secretArn || !dbHost) {
    throw new Error('Missing required environment variables: DATABASE_SECRET_ARN, DATABASE_HOST')
  }

  try {
    // Get database credentials from Secrets Manager
    console.log('Fetching database credentials from Secrets Manager...')
    const secretResponse = await secretsManager.send(
      new GetSecretValueCommand({ SecretId: secretArn })
    )
    
    if (!secretResponse.SecretString) {
      throw new Error('Secret value is empty')
    }
    
    const secret = JSON.parse(secretResponse.SecretString)
    const credentials: DbCredentials = {
      username: secret.username,
      password: secret.password,
      host: dbHost,
      port: 5432,
      dbname: dbName
    }

    // Connect to database
    console.log(`Connecting to database at ${credentials.host}...`)
    const client = new Client({
      host: credentials.host,
      port: credentials.port,
      database: credentials.dbname,
      user: credentials.username,
      password: credentials.password,
      ssl: {
        rejectUnauthorized: false // RDS uses self-signed certs
      }
    })

    await client.connect()
    console.log('Connected to database successfully')

    // Read schema SQL file
    const schemaPath = path.join(__dirname, '../migrations/001_initial_schema.sql')
    console.log(`Reading schema from ${schemaPath}...`)
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8')

    // Execute schema creation
    console.log('Executing schema creation...')
    await client.query(schemaSql)
    console.log('Schema created successfully')

    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    console.log('Tables created:', tablesResult.rows.map(r => r.table_name))

    await client.end()

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Database schema initialized successfully',
        tables: tablesResult.rows.map(r => r.table_name)
      })
    }
  } catch (error) {
    console.error('Error initializing database schema:', error)
    throw error
  }
}
