import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ShipmentService } from '../services/shipment-service.js';
import { extractUserContext } from '../lib/auth.js';
import { successResponse, errorResponse } from '../lib/response.js';
import type {
  CreateShipmentInput,
  UpdateShipmentInput,
  ShipmentFilters,
} from '@ctcm/types';

const shipmentService = new ShipmentService();

/**
 * Lambda handler for shipment operations
 * Routes: GET /shipments, GET /shipments/:id, POST /shipments, PUT /shipments/:id
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Shipment API request:', {
    method: event.httpMethod,
    path: event.path,
    user: event.requestContext.authorizer?.claims?.sub,
    role: event.requestContext.authorizer?.claims?.['cognito:groups'],
  });

  try {
    const userContext = extractUserContext(event);
    const method = event.httpMethod;
    const pathParts = event.path.split('/').filter(Boolean);

    // GET /shipments - List all shipments with filters
    if (method === 'GET' && pathParts.length === 1) {
      return await listShipments(event, userContext);
    }

    // GET /shipments/:id - Get shipment by ID
    if (method === 'GET' && pathParts.length === 2) {
      return await getShipment(pathParts[1], userContext);
    }

    // POST /shipments - Create new shipment
    if (method === 'POST' && pathParts.length === 1) {
      return await createShipment(event, userContext);
    }

    // PUT /shipments/:id - Update shipment
    if (method === 'PUT' && pathParts.length === 2) {
      return await updateShipment(pathParts[1], event, userContext);
    }

    return errorResponse('Method not allowed', 405);
  } catch (error) {
    console.error('Handler error:', error);
    return errorResponse('An unexpected error occurred', 500);
  }
}

/**
 * List shipments with optional filters
 */
async function listShipments(
  event: APIGatewayProxyEvent,
  userContext: ReturnType<typeof extractUserContext>
): Promise<APIGatewayProxyResult> {
  const queryParams = event.queryStringParameters || {};

  const filters: ShipmentFilters = {
    status: queryParams.status as ShipmentFilters['status'],
    customerId: queryParams.customerId,
    startDate: queryParams.startDate ? new Date(queryParams.startDate) : undefined,
    endDate: queryParams.endDate ? new Date(queryParams.endDate) : undefined,
    search: queryParams.search,
  };

  const shipments = await shipmentService.getShipments(filters);

  return successResponse(shipments);
}

/**
 * Get shipment by ID or tracking number
 */
async function getShipment(
  identifier: string,
  userContext: ReturnType<typeof extractUserContext>
): Promise<APIGatewayProxyResult> {
  // Check if identifier is a tracking number (starts with CTCM-)
  let shipment;
  if (identifier.startsWith('CTCM-')) {
    shipment = await shipmentService.getShipmentByTrackingNumber(identifier);
  } else {
    shipment = await shipmentService.getShipmentById(identifier);
  }

  if (!shipment) {
    return errorResponse('Shipment not found', 404);
  }

  return successResponse(shipment);
}

/**
 * Create new shipment
 */
async function createShipment(
  event: APIGatewayProxyEvent,
  userContext: ReturnType<typeof extractUserContext>
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse('Request body is required', 400);
  }

  let input: CreateShipmentInput;
  try {
    input = JSON.parse(event.body);
  } catch {
    return errorResponse('Invalid JSON in request body', 400);
  }

  // Validate required fields
  if (!input.customerId) {
    return errorResponse('Missing required field: customerId', 422);
  }

  const shipment = await shipmentService.createShipment(input);

  return successResponse(shipment, 201);
}

/**
 * Update shipment
 */
async function updateShipment(
  id: string,
  event: APIGatewayProxyEvent,
  userContext: ReturnType<typeof extractUserContext>
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse('Request body is required', 400);
  }

  let input: UpdateShipmentInput;
  try {
    input = JSON.parse(event.body);
  } catch {
    return errorResponse('Invalid JSON in request body', 400);
  }

  try {
    const shipment = await shipmentService.updateShipment(id, input);

    if (!shipment) {
      return errorResponse('Shipment not found', 404);
    }

    return successResponse(shipment);
  } catch (error) {
    // Handle status transition errors
    if (error instanceof Error && error.message.includes('Invalid status transition')) {
      return errorResponse(error.message, 422);
    }
    throw error;
  }
}
