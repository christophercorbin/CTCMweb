import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { initializePool } from '../lib/database';
import { getUserContext } from '../lib/auth';
import { successResponse, errorResponse, handleError } from '../lib/response';
import { SearchService } from '../services/search-service';
import type { UserContext } from '@ctcm/types';

// Initialize database pool (reused across Lambda invocations)
let poolInitialized = false;

async function ensurePoolInitialized() {
  if (!poolInitialized) {
    const secretArn = process.env.DB_SECRET_ARN;
    const region = process.env.AWS_REGION || 'us-east-1';

    if (!secretArn) {
      throw new Error('DB_SECRET_ARN environment variable not set');
    }

    await initializePool({ secretArn, region });
    poolInitialized = true;
  }
}

/**
 * Main Lambda handler for search operations
 * Routes: GET /search?q=query&page=1&limit=20
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Initialize database connection
    await ensurePoolInitialized();

    // Extract user context from JWT
    const userContext = getUserContext(event);

    // Log request for debugging
    console.log('Search API request:', {
      method: event.httpMethod,
      path: event.path,
      user: userContext.sub,
      role: userContext.role,
      query: event.queryStringParameters?.q,
    });

    // Only support GET method
    if (event.httpMethod !== 'GET') {
      return errorResponse('Method not allowed', 405);
    }

    return await handleSearch(event, userContext);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * GET /search?q=query&page=1&limit=20
 * Search shipments by tracking number, receipt number, customer name, or description
 */
async function handleSearch(
  event: APIGatewayProxyEvent,
  userContext: UserContext
): Promise<APIGatewayProxyResult> {
  const queryParams = event.queryStringParameters || {};

  // Validate query parameter
  const query = queryParams.q?.trim();
  if (!query) {
    return errorResponse('Query parameter "q" is required', 400);
  }

  // Parse pagination parameters
  const page = parseInt(queryParams.page || '1', 10);
  const limit = parseInt(queryParams.limit || '20', 10);

  // Validate pagination parameters
  if (page < 1) {
    return errorResponse('Page must be greater than 0', 400);
  }

  if (limit < 1 || limit > 100) {
    return errorResponse('Limit must be between 1 and 100', 400);
  }

  const service = new SearchService();
  const result = await service.searchShipments(query, page, limit, userContext);

  return successResponse(result);
}
