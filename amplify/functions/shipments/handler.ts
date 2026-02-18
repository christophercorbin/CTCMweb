/**
 * Amplify Function Handler for Shipment Operations
 * 
 * This handler reuses the existing shipment logic from apps/api/src/handlers/shipments.ts
 * and integrates it with Amplify's function infrastructure.
 * 
 * Routes:
 * - GET /shipments - List shipments with filters
 * - GET /shipments/:id - Get shipment by ID or tracking number
 * - POST /shipments - Create new shipment
 * - PUT /shipments/:id - Update shipment
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { initializePool } from '../shared/db';

// Import the existing handler logic
// Note: In production, you would copy the service/repository files to the Amplify function
// or create a shared package. For now, we'll reference the existing implementation.
import { handler as shipmentsHandler } from '../../../apps/api/src/handlers/shipments';

/**
 * Main Lambda handler
 * Initializes database connection and delegates to the shipments handler
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
    return await shipmentsHandler(event);
  } catch (error) {
    console.error('Shipments function error:', error);
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
