import { defineFunction } from '@aws-amplify/backend';

/**
 * Amplify Function for Search Operations
 * 
 * Handles search operations across all entities:
 * - GET /search - Search across shipments, customers, and invoices
 * 
 * Uses PostgreSQL full-text search for efficient querying.
 * 
 * Environment Variables:
 * - DATABASE_SECRET_ARN: ARN of the database credentials secret
 * - AWS_REGION: AWS region (auto-provided by Lambda)
 */
export const searchFunction = defineFunction({
  name: 'ctcm-search',
  entry: './handler.ts',
  runtime: 18,
  timeoutSeconds: 30,
  memoryMB: 512,
});
