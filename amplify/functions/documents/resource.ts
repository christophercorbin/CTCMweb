import { defineFunction } from '@aws-amplify/backend';

/**
 * Amplify Function for Document Operations
 * 
 * Handles all document-related API operations:
 * - POST /documents/upload - Generate presigned URL and create document metadata
 * - GET /documents/:id - Get document and generate download URL
 * - GET /documents - List documents with filters
 * 
 * Environment Variables:
 * - DATABASE_SECRET_ARN: ARN of the database credentials secret
 * - AWS_REGION: AWS region (auto-provided by Lambda)
 */
export const documentsFunction = defineFunction({
  name: 'ctcm-documents',
  entry: './handler.ts',
  runtime: 18,
  timeoutSeconds: 30,
  memoryMB: 512,
});
