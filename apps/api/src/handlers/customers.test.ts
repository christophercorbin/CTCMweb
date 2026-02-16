import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from './customers';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Mock dependencies
vi.mock('../lib/database');
vi.mock('../services/customer-service');

describe('Customers Lambda Handler', () => {
  let mockEvent: Partial<APIGatewayProxyEvent>;

  beforeEach(() => {
    // Set environment variables
    process.env.DB_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test';
    process.env.AWS_REGION = 'us-east-1';

    // Base mock event
    mockEvent = {
      httpMethod: 'GET',
      path: '/customers',
      pathParameters: null,
      body: null,
      headers: {},
      requestContext: {
        accountId: '123456789012',
        apiId: 'test-api',
        protocol: 'HTTP/1.1',
        httpMethod: 'GET',
        path: '/customers',
        stage: 'test',
        requestId: 'test-request-id',
        requestTimeEpoch: Date.now(),
        resourceId: 'test-resource',
        resourcePath: '/customers',
        identity: {} as any,
        authorizer: {
          claims: {
            sub: 'user-123',
            email: 'test@example.com',
            'cognito:groups': 'admin',
          },
        },
      } as APIGatewayProxyEvent['requestContext'],
    };

    vi.clearAllMocks();
  });

  describe('Request Routing', () => {
    it('should route GET /customers to list handler', async () => {
      const { CustomerService } = await import('../services/customer-service');
      const mockGetAllCustomers = vi.fn().mockResolvedValue([]);
      vi.mocked(CustomerService).mockImplementation(() => ({
        getAllCustomers: mockGetAllCustomers,
      } as unknown as InstanceType<typeof CustomerService>));

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(mockGetAllCustomers).toHaveBeenCalled();
    });

    it('should route GET /customers/:id to get handler', async () => {
      mockEvent.pathParameters = { id: 'customer-123' };

      const { CustomerService } = await import('../services/customer-service');
      const mockGetCustomerById = vi.fn().mockResolvedValue({ id: 'customer-123' });
      vi.mocked(CustomerService).mockImplementation(() => ({
        getCustomerById: mockGetCustomerById,
      } as unknown as InstanceType<typeof CustomerService>));

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(mockGetCustomerById).toHaveBeenCalledWith('customer-123', expect.any(Object));
    });

    it('should route POST /customers to create handler', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({
        userId: 'user-123',
        name: 'Test Customer',
        email: 'test@example.com',
      });

      const { CustomerService } = await import('../services/customer-service');
      const mockCreateCustomer = vi.fn().mockResolvedValue({ id: 'new-customer' });
      vi.mocked(CustomerService).mockImplementation(() => ({
        createCustomer: mockCreateCustomer,
      } as unknown as InstanceType<typeof CustomerService>));

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(201);
      expect(mockCreateCustomer).toHaveBeenCalled();
    });

    it('should return 405 for unsupported methods', async () => {
      mockEvent.httpMethod = 'PATCH';

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(405);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for missing request body on POST', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = null;

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('Request body is required');
    });

    it('should return 400 for invalid JSON', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = 'invalid json{';

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('Invalid JSON');
    });

    it('should return 422 for missing required fields', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({ name: 'Test' }); // Missing userId and email

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(422);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('Missing required fields');
    });

    it('should handle service errors gracefully', async () => {
      const { CustomerService } = await import('../services/customer-service');
      const mockGetAllCustomers = vi.fn().mockRejectedValue(new Error('Database error'));
      vi.mocked(CustomerService).mockImplementation(() => ({
        getAllCustomers: mockGetAllCustomers,
      } as unknown as InstanceType<typeof CustomerService>));

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });
  });

  describe('Response Format', () => {
    it('should return success response with correct structure', async () => {
      const mockCustomers = [{ id: '1', name: 'Test' }];

      const { CustomerService } = await import('../services/customer-service');
      vi.mocked(CustomerService).mockImplementation(() => ({
        getAllCustomers: vi.fn().mockResolvedValue(mockCustomers),
      } as unknown as InstanceType<typeof CustomerService>));

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toHaveProperty('Content-Type', 'application/json');
      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('metadata');
      expect(body.metadata).toHaveProperty('timestamp');
      expect(body.metadata).toHaveProperty('requestId');
    });
  });
});
