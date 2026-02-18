/**
 * Amplify Function Handler for Document Operations
 * 
 * This handler reuses the existing document logic from apps/api/src/handlers/documents.ts
 * and integrates it with Amplify's function infrastructure.
 * 
 * Routes:
 * - POST /documents/upload - Generate presigned URL and create document metadata
 * - GET /documents/:id - Get document and generate download URL
 * - GET /documents - List documents with filters
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { initializePool } from '../shared/db';

// Import the existing handler logic
import { handler as documentsHandler } from '../../../apps/api/src/handlers/documents';

/**
 * Main Lambda handler
 * Initializes database connection and delegates to the documents handler
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Initialize database connection pool
    await initializePool({
      secretArn: process.env.DATABASE_SECRET_ARN!,
      region: process.env.AWS_REGION || 'us-east-1',
      maxConnections: 5,
    });

    // Delegate to existing handler
    return await documentsHandler(event);
  } catch (error) {
    console.error('Documents function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      },
      body: JSON.stringify({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        },
      }),
    };
  }
};
