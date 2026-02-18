import { defineFunction } from '@aws-amplify/backend';

/**
 * Amplify Function for Shipment Operations
 * 
 * Handles all shipment-related API operations:
 * - GET /shipments - List shipments with filters
 * - GET /shipments/:id - Get shipment by ID or tracking number
 * - POST /shipments - Create new shipment
 * - PUT /shipments/:id - Update shipment
 * 
 * Environment Variables:
 * - DATABASE_SECRET_ARN: ARN of the database credentials secret
 * - AWS_REGION: AWS region (auto-provided by Lambda)
 */
export const shipmentsFunction = defineFunction({
  name: 'ctcm-shipments',
  entry: './handler.ts',
  runtime: 18,
  timeoutSeconds: 30,
  memoryMB: 512,
});
