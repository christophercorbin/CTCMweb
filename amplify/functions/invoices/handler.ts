/**
 * Amplify Function Handler for Invoice Operations
 * 
 * This handler reuses the existing invoice logic from apps/api/src/handlers/invoices.ts
 * and integrates it with Amplify's function infrastructure.
 * 
 * Routes:
 * - GET /invoices - List invoices with filters
 * - GET /invoices/:id - Get invoice by ID
 * - POST /invoices - Create new invoice
 * - PUT /invoices/:id - Update invoice
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { initializePool } from '../shared/db';

// Import the existing handler logic
import { handler as invoicesHandler } from '../../../apps/api/src/handlers/invoices';

/**
 * Main Lambda handler
 * Initializes database connection and delegates to the invoices handler
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
    return await invoicesHandler(event);
  } catch (error) {
    console.error('Invoices function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
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
