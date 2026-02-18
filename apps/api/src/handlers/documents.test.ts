import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { handler } from './documents';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Mock dependencies
vi.mock('../lib/database', () => ({
  initializePool: vi.fn().mockResolvedValue(undefined),
  query: vi.fn(),
}));
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.amazonaws.com/presigned-url'),
}));
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123'),
}));

describe('Documents Lambda Handler', () => {
  let mockEvent: Partial<APIGatewayProxyEvent>;
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Set environment variables
    process.env.DB_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test';
    process.env.AWS_REGION = 'us-east-1';
    process.env.DOCUMENT_BUCKET = 'test-documents-bucket';

    // Base mock event
    mockEvent = {
      httpMethod: 'GET',
      path: '/documents',
      pathParameters: null,
      queryStringParameters: null,
      body: null,
      headers: {},
      requestContext: {
        accountId: '123456789012',
        apiId: 'test-api',
        protocol: 'HTTP/1.1',
        httpMethod: 'GET',
        path: '/documents',
        stage: 'test',
        requestId: 'test-request-id',
        requestTimeEpoch: Date.now(),
        resourceId: 'test-resource',
        resourcePath: '/documents',
        identity: {} as APIGatewayProxyEvent['requestContext']['identity'],
        authorizer: {
          claims: {
            sub: 'user-123',
            email: 'admin@example.com',
            'cognito:groups': 'admin',
          },
        },
      } as APIGatewayProxyEvent['requestContext'],
    };

    vi.clearAllMocks();
  });

  // Mock the database module before each test
  beforeEach(async () => {
    const { query } = await import('../lib/database');
    mockQuery = vi.mocked(query);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Upload Document', () => {
    beforeEach(() => {
      mockEvent.httpMethod = 'POST';
      mockEvent.path = '/documents/upload';
    });

    it('should generate presigned URL and create document metadata', async () => {
      const uploadInput = {
        customerId: 'customer-123',
        shipmentId: 'shipment-456',
        documentType: 'invoice',
        filename: 'invoice.pdf',
        mimeType: 'application/pdf',
      };

      mockEvent.body = JSON.stringify(uploadInput);

      // Mock customer exists
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'customer-123' }] });
      // Mock shipment exists
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'shipment-456' }] });
      // Mock document insert
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'doc-123',
          customer_id: 'customer-123',
          shipment_id: 'shipment-456',
          document_type: 'invoice',
          file_name: 'invoice.pdf',
          mime_type: 'application/pdf',
          s3_key: 'customers/customer-123/shipments/shipment-456/doc-123-invoice.pdf',
          s3_bucket: 'test-documents-bucket',
          uploaded_by: 'user-123',
          created_at: new Date(),
        }],
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('documentId');
      expect(body.data).toHaveProperty('uploadUrl');
      expect(body.data).toHaveProperty('expiresIn', 900);
      expect(body.data.uploadUrl).toContain('presigned-url');
    });

    it('should create document without shipmentId', async () => {
      const uploadInput = {
        customerId: 'customer-123',
        documentType: 'receipt',
        filename: 'receipt.jpg',
        mimeType: 'image/jpeg',
      };

      mockEvent.body = JSON.stringify(uploadInput);

      // Mock customer exists
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'customer-123' }] });
      // Mock document insert
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'doc-456',
          customer_id: 'customer-123',
          shipment_id: null,
          document_type: 'receipt',
          file_name: 'receipt.jpg',
          mime_type: 'image/jpeg',
          s3_key: 'customers/customer-123/documents/doc-456-receipt.jpg',
          s3_bucket: 'test-documents-bucket',
          uploaded_by: 'user-123',
          created_at: new Date(),
        }],
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });

    it('should return 400 for missing request body', async () => {
      mockEvent.body = null;

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('Request body is required');
    });

    it('should return 422 for missing required fields', async () => {
      mockEvent.body = JSON.stringify({ customerId: 'customer-123' });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(422);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('Missing required fields');
    });

    it('should return 422 for invalid document type', async () => {
      mockEvent.body = JSON.stringify({
        customerId: 'customer-123',
        documentType: 'invalid_type',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(422);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('Invalid document type');
    });

    it('should return 404 for non-existent customer', async () => {
      mockEvent.body = JSON.stringify({
        customerId: 'non-existent',
        documentType: 'invoice',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
      });

      // Mock customer not found
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('Customer not found');
    });

    it('should return 404 for non-existent shipment', async () => {
      mockEvent.body = JSON.stringify({
        customerId: 'customer-123',
        shipmentId: 'non-existent',
        documentType: 'invoice',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
      });

      // Mock customer exists
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'customer-123' }] });
      // Mock shipment not found
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('Shipment not found');
    });

    it('should enforce tenant isolation for customer users', async () => {
      // Change to customer user
      mockEvent.requestContext!.authorizer!.claims = {
        sub: 'customer-user-123',
        email: 'customer@example.com',
        'cognito:groups': 'customer',
        'custom:customerId': 'customer-999',
      };

      mockEvent.body = JSON.stringify({
        customerId: 'customer-123', // Different from customerId
        documentType: 'invoice',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('Access denied');
    });
  });

  describe('Download Document', () => {
    beforeEach(() => {
      mockEvent.httpMethod = 'GET';
      mockEvent.path = '/documents/doc-123';
      mockEvent.pathParameters = { id: 'doc-123' };
    });

    it('should generate presigned URL for download', async () => {
      // Mock document query
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'doc-123',
          customer_id: 'customer-123',
          shipment_id: 'shipment-456',
          document_type: 'invoice',
          file_name: 'invoice.pdf',
          file_size: 12345,
          mime_type: 'application/pdf',
          s3_key: 'customers/customer-123/shipments/shipment-456/doc-123-invoice.pdf',
          s3_bucket: 'test-documents-bucket',
          uploaded_by: 'user-123',
          created_at: new Date(),
        }],
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('documentId', 'doc-123');
      expect(body.data).toHaveProperty('filename', 'invoice.pdf');
      expect(body.data).toHaveProperty('mimeType', 'application/pdf');
      expect(body.data).toHaveProperty('downloadUrl');
      expect(body.data).toHaveProperty('expiresIn', 900);
    });

    it('should return 404 for non-existent document', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('Document not found');
    });

    it('should enforce tenant isolation for customer users', async () => {
      // Change to customer user
      mockEvent.requestContext!.authorizer!.claims = {
        sub: 'customer-user-123',
        email: 'customer@example.com',
        'cognito:groups': 'customer',
        'custom:customerId': 'customer-999',
      };

      // Mock document belonging to different customer
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No results due to tenant filter

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('Document not found');
    });
  });

  describe('List Documents', () => {
    beforeEach(() => {
      mockEvent.httpMethod = 'GET';
      mockEvent.path = '/documents';
      mockEvent.pathParameters = null;
    });

    it('should list all documents for admin', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          customer_id: 'customer-123',
          shipment_id: 'shipment-456',
          document_type: 'invoice',
          file_name: 'invoice1.pdf',
          file_size: 12345,
          mime_type: 'application/pdf',
          s3_key: 'customers/customer-123/shipments/shipment-456/doc-1-invoice1.pdf',
          s3_bucket: 'test-documents-bucket',
          uploaded_by: 'user-123',
          created_at: new Date(),
        },
        {
          id: 'doc-2',
          customer_id: 'customer-456',
          shipment_id: null,
          document_type: 'receipt',
          file_name: 'receipt1.jpg',
          file_size: 54321,
          mime_type: 'image/jpeg',
          s3_key: 'customers/customer-456/documents/doc-2-receipt1.jpg',
          s3_bucket: 'test-documents-bucket',
          uploaded_by: 'user-456',
          created_at: new Date(),
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockDocuments });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.data[0]).toHaveProperty('id', 'doc-1');
      expect(body.data[1]).toHaveProperty('id', 'doc-2');
    });

    it('should filter documents by customerId', async () => {
      mockEvent.queryStringParameters = { customerId: 'customer-123' };

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'doc-1',
          customer_id: 'customer-123',
          shipment_id: null,
          document_type: 'invoice',
          file_name: 'invoice1.pdf',
          file_size: 12345,
          mime_type: 'application/pdf',
          s3_key: 'customers/customer-123/documents/doc-1-invoice1.pdf',
          s3_bucket: 'test-documents-bucket',
          uploaded_by: 'user-123',
          created_at: new Date(),
        }],
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].customerId).toBe('customer-123');
    });

    it('should filter documents by shipmentId', async () => {
      mockEvent.queryStringParameters = { shipmentId: 'shipment-456' };

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'doc-1',
          customer_id: 'customer-123',
          shipment_id: 'shipment-456',
          document_type: 'invoice',
          file_name: 'invoice1.pdf',
          file_size: 12345,
          mime_type: 'application/pdf',
          s3_key: 'customers/customer-123/shipments/shipment-456/doc-1-invoice1.pdf',
          s3_bucket: 'test-documents-bucket',
          uploaded_by: 'user-123',
          created_at: new Date(),
        }],
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].shipmentId).toBe('shipment-456');
    });

    it('should enforce tenant isolation for customer users', async () => {
      // Change to customer user
      mockEvent.requestContext!.authorizer!.claims = {
        sub: 'customer-user-123',
        email: 'customer@example.com',
        'cognito:groups': 'customer',
        'custom:customerId': 'customer-123', // This is what auth.ts looks for
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'doc-1',
          customer_id: 'customer-123',
          shipment_id: null,
          document_type: 'invoice',
          file_name: 'invoice1.pdf',
          file_size: 12345,
          mime_type: 'application/pdf',
          s3_key: 'customers/customer-123/documents/doc-1-invoice1.pdf',
          s3_bucket: 'test-documents-bucket',
          uploaded_by: 'customer-user-123',
          created_at: new Date(),
        }],
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      // Verify query was called with tenant filter
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('d.customer_id = $1'),
        ['customer-123'] // The tenant ID from custom:customerId
      );
    });
  });

  describe('Delete Document', () => {
    beforeEach(() => {
      mockEvent.httpMethod = 'DELETE';
      mockEvent.path = '/documents/doc-123';
      mockEvent.pathParameters = { id: 'doc-123' };
    });

    it('should delete document for admin', async () => {
      // Mock document exists
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'doc-123' }] });
      // Mock delete
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.message).toContain('deleted successfully');
    });

    it('should return 403 for customer users', async () => {
      // Change to customer user
      mockEvent.requestContext!.authorizer!.claims = {
        sub: 'customer-user-123',
        email: 'customer@example.com',
        'cognito:groups': 'customer',
        'custom:customerId': 'customer-123',
      };

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('Access denied');
    });

    it('should return 404 for non-existent document', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('Document not found');
    });
  });

  describe('Error Handling', () => {
    it('should return 405 for unsupported methods', async () => {
      mockEvent.httpMethod = 'PATCH';

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(405);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockEvent.httpMethod = 'GET';
      mockEvent.path = '/documents';

      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });
  });
});
