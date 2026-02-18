import { defineFunction } from '@aws-amplify/backend';

/**
 * Amplify Function for Invoice Operations
 * 
 * Handles all invoice-related API operations:
 * - GET /invoices - List invoices with filters
 * - GET /invoices/:id - Get invoice by ID
 * - POST /invoices - Create new invoice
 * - PUT /invoices/:id - Update invoice
 * 
 * Environment Variables:
 * - DATABASE_SECRET_ARN: ARN of the database credentials secret
 * - AWS_REGION: AWS region (auto-provided by Lambda)
 */
export const invoicesFunction = defineFunction({
  name: 'ctcm-invoices',
  entry: './handler.ts',
  runtime: 18,
  timeoutSeconds: 30,
  memoryMB: 512,
});
