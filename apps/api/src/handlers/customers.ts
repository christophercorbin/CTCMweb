import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { initializePool } from '../lib/database';
import { getUserContext } from '../lib/auth';
import { successResponse, errorResponse, handleError } from '../lib/response';
import { CustomerService } from '../services/customer-service';
import type { CreateCustomerInput, UpdateCustomerInput, UserContext } from '@ctcm/types';

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
 * Main Lambda handler for customer operations
 * Routes requests based on HTTP method and path
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Initialize database connection
    await ensurePoolInitialized();

    // Extract user context from JWT
    const userContext = getUserContext(event);

    // Log request for debugging
    console.log('Customer API request:', {
      method: event.httpMethod,
      path: event.path,
      user: userContext.sub,
      role: userContext.role,
    });

    // Route based on HTTP method
    const method = event.httpMethod;
    const pathParameters = event.pathParameters || {};

    if (method === 'GET' && !pathParameters.id) {
      return await handleListCustomers(userContext);
    }

    if (method === 'GET' && pathParameters.id) {
      return await handleGetCustomer(pathParameters.id, userContext);
    }

    if (method === 'POST') {
      return await handleCreateCustomer(event, userContext);
    }

    if (method === 'PUT' && pathParameters.id) {
      return await handleUpdateCustomer(pathParameters.id, event, userContext);
    }

    if (method === 'DELETE' && pathParameters.id) {
      return await handleDeleteCustomer(pathParameters.id, userContext);
    }

    return errorResponse('Method not allowed', 405);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * GET /customers
 * Lists all customers (with tenant isolation)
 */
async function handleListCustomers(userContext: UserContext): Promise<APIGatewayProxyResult> {
  const service = new CustomerService();
  const customers = await service.getAllCustomers(userContext);
  return successResponse(customers);
}

/**
 * GET /customers/:id
 * Gets a specific customer by ID
 */
async function handleGetCustomer(
  id: string,
  userContext: UserContext
): Promise<APIGatewayProxyResult> {
  const service = new CustomerService();
  const customer = await service.getCustomerById(id, userContext);
  return successResponse(customer);
}

/**
 * POST /customers
 * Creates a new customer (admin only)
 */
async function handleCreateCustomer(
  event: APIGatewayProxyEvent,
  userContext: UserContext
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse('Request body is required', 400);
  }

  let input: CreateCustomerInput;
  try {
    input = JSON.parse(event.body);
  } catch {
    return errorResponse('Invalid JSON in request body', 400);
  }

  // Validate required fields
  if (!input.userId || !input.name || !input.email) {
    return errorResponse('Missing required fields: userId, name, email', 422);
  }

  const service = new CustomerService();
  const customer = await service.createCustomer(input, userContext);
  return successResponse(customer, 201);
}

/**
 * PUT /customers/:id
 * Updates a customer
 */
async function handleUpdateCustomer(
  id: string,
  event: APIGatewayProxyEvent,
  userContext: UserContext
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse('Request body is required', 400);
  }

  let input: UpdateCustomerInput;
  try {
    input = JSON.parse(event.body);
  } catch {
    return errorResponse('Invalid JSON in request body', 400);
  }

  const service = new CustomerService();
  const customer = await service.updateCustomer(id, input, userContext);
  return successResponse(customer);
}

/**
 * DELETE /customers/:id
 * Deletes a customer (admin only)
 */
async function handleDeleteCustomer(
  id: string,
  userContext: UserContext
): Promise<APIGatewayProxyResult> {
  const service = new CustomerService();
  await service.deleteCustomer(id, userContext);
  return successResponse({ message: 'Customer deleted successfully' });
}
