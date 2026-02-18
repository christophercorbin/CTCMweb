import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { initializePool } from '../lib/database';
import { getUserContext } from '../lib/auth';
import { successResponse, errorResponse, handleError } from '../lib/response';
import { InvoiceService } from '../services/invoice-service';
import type { CreateInvoiceInput, UpdateInvoiceInput, UserContext } from '@ctcm/types';

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
 * Main Lambda handler for invoice operations
 * Routes requests based on HTTP method and path
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Initialize database connection
    await ensurePoolInitialized();

    // Extract user context from JWT
    const userContext = getUserContext(event);

    // Log request for debugging
    console.log('Invoice API request:', {
      method: event.httpMethod,
      path: event.path,
      user: userContext.sub,
      role: userContext.role,
    });

    // Route based on HTTP method
    const method = event.httpMethod;
    const pathParameters = event.pathParameters || {};

    if (method === 'GET' && !pathParameters.id) {
      return await handleListInvoices(event, userContext);
    }

    if (method === 'GET' && pathParameters.id) {
      return await handleGetInvoice(pathParameters.id, userContext);
    }

    if (method === 'POST') {
      return await handleCreateInvoice(event, userContext);
    }

    if (method === 'PUT' && pathParameters.id) {
      return await handleUpdateInvoice(pathParameters.id, event, userContext);
    }

    return errorResponse('Method not allowed', 405);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * GET /invoices
 * Lists all invoices (with tenant isolation)
 */
async function handleListInvoices(
  event: APIGatewayProxyEvent,
  userContext: UserContext
): Promise<APIGatewayProxyResult> {
  const queryParams = event.queryStringParameters || {};
  
  const filters = {
    customerId: queryParams.customerId,
    status: queryParams.status,
    startDate: queryParams.startDate ? new Date(queryParams.startDate) : undefined,
    endDate: queryParams.endDate ? new Date(queryParams.endDate) : undefined,
  };

  const service = new InvoiceService();
  const invoices = await service.getAllInvoices(userContext, filters);
  return successResponse(invoices);
}

/**
 * GET /invoices/:id
 * Gets a specific invoice by ID
 */
async function handleGetInvoice(
  id: string,
  userContext: UserContext
): Promise<APIGatewayProxyResult> {
  const service = new InvoiceService();
  const invoice = await service.getInvoiceById(id, userContext);
  return successResponse(invoice);
}

/**
 * POST /invoices
 * Creates a new invoice (admin only)
 */
async function handleCreateInvoice(
  event: APIGatewayProxyEvent,
  userContext: UserContext
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse('Request body is required', 400);
  }

  let input: CreateInvoiceInput;
  try {
    input = JSON.parse(event.body);
  } catch {
    return errorResponse('Invalid JSON in request body', 400);
  }

  // Validate required fields
  if (!input.customerId || !input.invoiceNumber || !input.subtotal || !input.total || !input.issueDate || !input.dueDate) {
    return errorResponse('Missing required fields: customerId, invoiceNumber, subtotal, total, issueDate, dueDate', 422);
  }

  const service = new InvoiceService();
  const invoice = await service.createInvoice(input, userContext);
  return successResponse(invoice, 201);
}

/**
 * PUT /invoices/:id
 * Updates an invoice
 */
async function handleUpdateInvoice(
  id: string,
  event: APIGatewayProxyEvent,
  userContext: UserContext
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse('Request body is required', 400);
  }

  let input: UpdateInvoiceInput;
  try {
    input = JSON.parse(event.body);
  } catch {
    return errorResponse('Invalid JSON in request body', 400);
  }

  const service = new InvoiceService();
  const invoice = await service.updateInvoice(id, input, userContext);
  return successResponse(invoice);
}
