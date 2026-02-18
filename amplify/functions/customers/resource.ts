import { defineFunction } from '@aws-amplify/backend';

/**
 * Amplify Function for Customer Operations
 * 
 * Handles all customer-related API operations:
 * - GET /customers - List customers with filters
 * - GET /customers/:id - Get customer by ID
 * - POST /customers - Create new customer
 * - PUT /customers/:id - Update customer
 * 
 * Environment Variables:
 * - DATABASE_SECRET_ARN: ARN of the database credentials secret
 * - AWS_REGION: AWS region (auto-provided by Lambda)
 */
export const customersFunction = defineFunction({
  name: 'ctcm-customers',
  entry: './handler.ts',
  runtime: 18,
  timeoutSeconds: 30,
  memoryMB: 512,
});
