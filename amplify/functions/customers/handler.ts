/**
 * Amplify Function Handler for Customer Operations
 * 
 * This handler reuses the existing customer logic from apps/api/src/handlers/customers.ts
 * and integrates it with Amplify's function infrastructure.
 * 
 * Routes:
 * - GET /customers - List customers with filters
 * - GET /customers/:id - Get customer by ID
 * - POST /customers - Create new customer
 * - PUT /customers/:id - Update customer
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { initializePool } from '../shared/db';

// Import the existing handler logic
import { handler as customersHandler } from '../../../apps/api/src/handlers/customers';

/**
 * Main Lambda handler
 * Initializes database connection and delegates to the customers handler
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
    return await customersHandler(event);
  } catch (error) {
    console.error('Customers function error:', error);
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
