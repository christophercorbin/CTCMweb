import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './invoices';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Mock dependencies
vi.mock('../lib/database');
vi.mock('../services/invoice-service');

describe('Invoices Lambda Handler', () => {
  let mockEvent: Partial<APIGatewayProxyEvent>;

  beforeEach(() => {
    // Set environment variables
    process.env.DB_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test';
    process.env.AWS_REGION = 'us-east-1';

    // Base mock event
    mockEvent = {
      httpMethod: 'GET',
      path: '/invoices',
      pathParameters: null,
      queryStringParameters: null,
      body: null,
      headers: {},
      requestContext: {
        accountId: '123456789012',
        apiId: 'test-api',
        protocol: 'HTTP/1.1',
        httpMethod: 'GET',
        path: '/invoices',
        stage: 'test',
        requestId: 'test-request-id',
        requestTimeEpoch: Date.now(),
        resourceId: 'test-resource',
        resourcePath: '/invoices',
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

  describe('Request Routing', () => {
    it('should route GET /invoices to list handler', async () => {
      const { InvoiceService } = await import('../services/invoice-service');
      const mockGetAllInvoices = vi.fn().mockResolvedValue([]);
      vi.mocked(InvoiceService).mockImplementation(() => ({
        getAllInvoices: mockGetAllInvoices,
      } as unknown as InstanceType<typeof InvoiceService>));

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(mockGetAllInvoices).toHaveBeenCalled();
    });

    it('should route GET /invoices/:id to get handler', async () => {
      mockEvent.pathParameters = { id: 'invoice-123' };

      const { InvoiceService } = await import('../services/invoice-service');
      const mockGetInvoiceById = vi.fn().mockResolvedValue({ 
        id: 'invoice-123',
        invoiceNumber: 'INV-001',
      });
      vi.mocked(InvoiceService).mockImplementation(() => ({
        getInvoiceById: mockGetInvoiceById,
      } as unknown as InstanceType<typeof InvoiceService>));

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(mockGetInvoiceById).toHaveBeenCalledWith('invoice-123', expect.any(Object));
    });

    it('should route POST /invoices to create handler', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({
        customerId: 'customer-123',
        invoiceNumber: 'INV-001',
        subtotal: 100.00,
        tax: 15.00,
        total: 115.00,
        issueDate: '2026-02-01',
        dueDate: '2026-03-01',
      });

      const { InvoiceService } = await import('../services/invoice-service');
      const mockCreateInvoice = vi.fn().mockResolvedValue({ 
        id: 'new-invoice',
        invoiceNumber: 'INV-001',
      });
      vi.mocked(InvoiceService).mockImplementation(() => ({
        createInvoice: mockCreateInvoice,
      } as unknown as InstanceType<typeof InvoiceService>));

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(201);
      expect(mockCreateInvoice).toHaveBeenCalled();
    });

    it('should route PUT /invoices/:id to update handler', async () => {
      mockEvent.httpMethod = 'PUT';
      mockEvent.pathParameters = { id: 'invoice-123' };
      mockEvent.body = JSON.stringify({
        status: 'paid',
        paidDate: '2026-02-15',
      });

      const { InvoiceService } = await import('../services/invoice-service');
      const mockUpdateInvoice = vi.fn().mockResolvedValue({ 
        id: 'invoice-123',
        status: 'paid',
      });
      vi.mocked(InvoiceService).mockImplementation(() => ({
        updateInvoice: mockUpdateInvoice,
      } as unknown as InstanceType<typeof InvoiceService>));

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(mockUpdateInvoice).toHaveBeenCalledWith('invoice-123', expect.any(Object), expect.any(Object));
    });

    it('should return 405 for unsupported methods', async () => {
      mockEvent.httpMethod = 'DELETE';

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(405);
    });
  });

  describe('Query Parameters', () => {
    it('should pass filters to service when listing invoices', async () => {
      mockEvent.queryStringParameters = {
        customerId: 'customer-123',
        status: 'pending',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      };

      const { InvoiceService } = await import('../services/invoice-service');
      const mockGetAllInvoices = vi.fn().mockResolvedValue([]);
      vi.mocked(InvoiceService).mockImplementation(() => ({
        getAllInvoices: mockGetAllInvoices,
      } as unknown as InstanceType<typeof InvoiceService>));

      await handler(mockEvent as APIGatewayProxyEvent);

      expect(mockGetAllInvoices).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          customerId: 'customer-123',
          status: 'pending',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });
  });

  describe('Request Validation', () => {
    it('should return 400 when POST body is missing', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = null;

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('Request body is required');
    });

    it('should return 400 when POST body is invalid JSON', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = 'invalid json';

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('Invalid JSON');
    });

    it('should return 422 when required fields are missing', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({
        customerId: 'customer-123',
        // Missing required fields
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(422);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('Missing required fields');
    });

    it('should return 400 when PUT body is missing', async () => {
      mockEvent.httpMethod = 'PUT';
      mockEvent.pathParameters = { id: 'invoice-123' };
      mockEvent.body = null;

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('Request body is required');
    });
  });

  describe('Tenant Isolation', () => {
    it('should extract user context from JWT claims', async () => {
      const { InvoiceService } = await import('../services/invoice-service');
      const mockGetAllInvoices = vi.fn().mockResolvedValue([]);
      vi.mocked(InvoiceService).mockImplementation(() => ({
        getAllInvoices: mockGetAllInvoices,
      } as unknown as InstanceType<typeof InvoiceService>));

      await handler(mockEvent as APIGatewayProxyEvent);

      expect(mockGetAllInvoices).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-123',
          email: 'admin@example.com',
          role: 'admin',
        }),
        expect.any(Object)
      );
    });

    it('should handle customer user context with tenant ID', async () => {
      mockEvent.requestContext!.authorizer!.claims = {
        sub: 'customer-456',
        email: 'customer@example.com',
        'cognito:groups': 'customer',
        'custom:customerId': 'customer-tenant-123',
      };

      const { InvoiceService } = await import('../services/invoice-service');
      const mockGetAllInvoices = vi.fn().mockResolvedValue([]);
      vi.mocked(InvoiceService).mockImplementation(() => ({
        getAllInvoices: mockGetAllInvoices,
      } as unknown as InstanceType<typeof InvoiceService>));

      await handler(mockEvent as APIGatewayProxyEvent);

      expect(mockGetAllInvoices).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'customer-456',
          email: 'customer@example.com',
          role: 'customer',
          tenantId: 'customer-tenant-123',
        }),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const { InvoiceService } = await import('../services/invoice-service');
      const mockGetAllInvoices = vi.fn().mockRejectedValue(new Error('Database error'));
      vi.mocked(InvoiceService).mockImplementation(() => ({
        getAllInvoices: mockGetAllInvoices,
      } as unknown as InstanceType<typeof InvoiceService>));

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
  });
});
