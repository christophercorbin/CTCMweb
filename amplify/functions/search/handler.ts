/**
 * Amplify Function Handler for Search Operations
 * 
 * This handler reuses the existing search logic from apps/api/src/handlers/search.ts
 * and integrates it with Amplify's function infrastructure.
 * 
 * Routes:
 * - GET /search - Search across shipments, customers, and invoices
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { initializePool } from '../shared/db';

// Import the existing handler logic
import { handler as searchHandler } from '../../../apps/api/src/handlers/search';

/**
 * Main Lambda handler
 * Initializes database connection and delegates to the search handler
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
    return await searchHandler(event);
  } catch (error) {
    console.error('Search function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
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
