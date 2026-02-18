import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { initializePool, query } from '../lib/database';
import { getUserContext } from '../lib/auth';
import { successResponse, errorResponse, handleError } from '../lib/response';
import type { UserContext, UploadDocumentInput, UploadDocumentResponse, Document } from '@ctcm/types';

// Initialize S3 client
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

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
 * Main Lambda handler for document operations
 * Routes requests based on HTTP method and path
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Initialize database connection
    await ensurePoolInitialized();

    // Extract user context from JWT
    const userContext = getUserContext(event);

    // Log request for debugging
    console.log('Documents API request:', {
      method: event.httpMethod,
      path: event.path,
      user: userContext.sub,
      role: userContext.role,
    });

    // Route based on HTTP method
    const method = event.httpMethod;
    const pathParameters = event.pathParameters || {};

    // POST /documents/upload - Request presigned URL for upload
    if (method === 'POST' && event.path.includes('/upload')) {
      return await handleUploadRequest(event, userContext);
    }

    // GET /documents/:id - Get presigned URL for download
    if (method === 'GET' && pathParameters.id) {
      return await handleDownloadRequest(pathParameters.id, userContext);
    }

    // GET /documents - List documents
    if (method === 'GET' && !pathParameters.id) {
      return await handleListDocuments(event, userContext);
    }

    // DELETE /documents/:id - Delete document
    if (method === 'DELETE' && pathParameters.id) {
      return await handleDeleteDocument(pathParameters.id, userContext);
    }

    return errorResponse('Method not allowed', 405);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /documents/upload
 * Generate presigned URL for S3 upload and create document metadata
 */
async function handleUploadRequest(
  event: APIGatewayProxyEvent,
  userContext: UserContext
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return errorResponse('Request body is required', 400);
  }

  let input: UploadDocumentInput;
  try {
    input = JSON.parse(event.body);
  } catch {
    return errorResponse('Invalid JSON in request body', 400);
  }

  // Validate required fields
  if (!input.customerId || !input.documentType || !input.filename || !input.mimeType) {
    return errorResponse('Missing required fields: customerId, documentType, filename, mimeType', 422);
  }

  // Validate document type
  const validDocumentTypes = ['invoice', 'receipt', 'customs_document', 'packing_list'];
  if (!validDocumentTypes.includes(input.documentType)) {
    return errorResponse(`Invalid document type. Must be one of: ${validDocumentTypes.join(', ')}`, 422);
  }

  // Enforce tenant isolation: customer users can only upload to their own tenant
  if (userContext.role === 'customer' && input.customerId !== userContext.tenantId) {
    return errorResponse('Access denied: cannot upload documents for other customers', 403);
  }

  // Verify customer exists
  const customerCheck = await query(
    'SELECT id FROM customers WHERE id = $1',
    [input.customerId]
  );

  if (customerCheck.rows.length === 0) {
    return errorResponse('Customer not found', 404);
  }

  // If shipmentId provided, verify it exists and belongs to the customer
  if (input.shipmentId) {
    const shipmentCheck = await query(
      'SELECT id FROM shipments WHERE id = $1 AND customer_id = $2',
      [input.shipmentId, input.customerId]
    );

    if (shipmentCheck.rows.length === 0) {
      return errorResponse('Shipment not found or does not belong to customer', 404);
    }
  }

  // Generate unique document ID and S3 key
  const documentId = uuidv4();
  const bucketName = process.env.DOCUMENT_BUCKET;
  
  if (!bucketName) {
    throw new Error('DOCUMENT_BUCKET environment variable not set');
  }

  // Create S3 key with customer/shipment organization
  const s3Key = input.shipmentId
    ? `customers/${input.customerId}/shipments/${input.shipmentId}/${documentId}-${input.filename}`
    : `customers/${input.customerId}/documents/${documentId}-${input.filename}`;

  // Generate presigned URL for upload (15 minutes expiry)
  const putCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
    ContentType: input.mimeType,
    Metadata: {
      documentId,
      customerId: input.customerId,
      shipmentId: input.shipmentId || '',
      documentType: input.documentType,
      uploadedBy: userContext.sub,
    },
  });

  const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 900 }); // 15 minutes

  // Store document metadata in database
  const result = await query(
    `INSERT INTO documents (
      id, customer_id, shipment_id, document_type, file_name, 
      mime_type, s3_key, s3_bucket, uploaded_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, customer_id, shipment_id, document_type, file_name, 
              mime_type, s3_key, s3_bucket, uploaded_by, created_at`,
    [
      documentId,
      input.customerId,
      input.shipmentId || null,
      input.documentType,
      input.filename,
      input.mimeType,
      s3Key,
      bucketName,
      userContext.sub,
    ]
  );

  const response: UploadDocumentResponse = {
    documentId: result.rows[0].id,
    uploadUrl,
    expiresIn: 900,
  };

  return successResponse(response, 201);
}

/**
 * GET /documents/:id
 * Generate presigned URL for document download
 */
async function handleDownloadRequest(
  id: string,
  userContext: UserContext
): Promise<APIGatewayProxyResult> {
  // Fetch document metadata with tenant isolation
  let queryText = `
    SELECT d.id, d.customer_id, d.shipment_id, d.document_type, d.file_name,
           d.file_size, d.mime_type, d.s3_key, d.s3_bucket, d.uploaded_by, d.created_at
    FROM documents d
    WHERE d.id = $1
  `;

  const queryParams: any[] = [id];

  // Enforce tenant isolation for customer users
  if (userContext.role === 'customer') {
    queryText += ' AND d.customer_id = $2';
    queryParams.push(userContext.tenantId);
  }

  const result = await query(queryText, queryParams);

  if (result.rows.length === 0) {
    return errorResponse('Document not found', 404);
  }

  const document = result.rows[0];

  // Generate presigned URL for download (15 minutes expiry)
  const getCommand = new GetObjectCommand({
    Bucket: document.s3_bucket,
    Key: document.s3_key,
  });

  const downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 900 }); // 15 minutes

  return successResponse({
    documentId: document.id,
    filename: document.file_name,
    mimeType: document.mime_type,
    downloadUrl,
    expiresIn: 900,
  });
}

/**
 * GET /documents
 * List documents with optional filters
 */
async function handleListDocuments(
  event: APIGatewayProxyEvent,
  userContext: UserContext
): Promise<APIGatewayProxyResult> {
  const queryParams = event.queryStringParameters || {};
  const customerId = queryParams.customerId;
  const shipmentId = queryParams.shipmentId;

  // Build query with tenant isolation
  let queryText = `
    SELECT d.id, d.customer_id, d.shipment_id, d.document_type, d.file_name,
           d.file_size, d.mime_type, d.s3_key, d.s3_bucket, d.uploaded_by, d.created_at
    FROM documents d
    WHERE 1=1
  `;

  const params: any[] = [];
  let paramIndex = 1;

  // Enforce tenant isolation for customer users
  if (userContext.role === 'customer') {
    queryText += ` AND d.customer_id = $${paramIndex}`;
    params.push(userContext.tenantId);
    paramIndex++;
  } else if (customerId) {
    // Admin can filter by customer
    queryText += ` AND d.customer_id = $${paramIndex}`;
    params.push(customerId);
    paramIndex++;
  }

  // Filter by shipment if provided
  if (shipmentId) {
    queryText += ` AND d.shipment_id = $${paramIndex}`;
    params.push(shipmentId);
    paramIndex++;
  }

  queryText += ' ORDER BY d.created_at DESC';

  const result = await query(queryText, params);

  const documents: Document[] = result.rows.map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    shipmentId: row.shipment_id,
    documentType: row.document_type,
    filename: row.file_name,
    fileSizeBytes: row.file_size,
    mimeType: row.mime_type,
    s3Key: row.s3_key,
    s3Bucket: row.s3_bucket,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  }));

  return successResponse(documents);
}

/**
 * DELETE /documents/:id
 * Delete document (admin only)
 */
async function handleDeleteDocument(
  id: string,
  userContext: UserContext
): Promise<APIGatewayProxyResult> {
  // Only admins can delete documents
  if (userContext.role !== 'admin') {
    return errorResponse('Access denied: only admins can delete documents', 403);
  }

  // Check if document exists
  const checkResult = await query(
    'SELECT id FROM documents WHERE id = $1',
    [id]
  );

  if (checkResult.rows.length === 0) {
    return errorResponse('Document not found', 404);
  }

  // Delete from database (S3 cleanup can be done via lifecycle policy or separate process)
  await query('DELETE FROM documents WHERE id = $1', [id]);

  return successResponse({ message: 'Document deleted successfully' });
}
