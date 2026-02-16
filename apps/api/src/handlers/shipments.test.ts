import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import type { Shipment } from '@ctcm/types';

// Create mock service methods using vi.hoisted to ensure they're available before imports
const { mockGetShipments, mockGetShipmentById, mockGetShipmentByTrackingNumber, mockCreateShipment, mockUpdateShipment } = vi.hoisted(() => ({
  mockGetShipments: vi.fn(),
  mockGetShipmentById: vi.fn(),
  mockGetShipmentByTrackingNumber: vi.fn(),
  mockCreateShipment: vi.fn(),
  mockUpdateShipment: vi.fn(),
}));

// Mock the service module
vi.mock('../services/shipment-service.js', () => ({
  ShipmentService: vi.fn(() => ({
    getShipments: mockGetShipments,
    getShipmentById: mockGetShipmentById,
    getShipmentByTrackingNumber: mockGetShipmentByTrackingNumber,
    createShipment: mockCreateShipment,
    updateShipment: mockUpdateShipment,
  })),
}));

// Mock auth
vi.mock('../lib/auth.js', () => ({
  extractUserContext: vi.fn(() => ({
    sub: 'user-123',
    email: 'admin@ctcm.com',
    role: 'admin',
    groups: ['admin'],
  })),
}));

// Import handler after mocks are set up
import { handler } from './shipments.js';

describe('Shipments Lambda Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const createMockEvent = (
    method: string,
    path: string,
    body?: string,
    queryStringParameters?: Record<string, string>
  ): APIGatewayProxyEvent => ({
    httpMethod: method,
    path,
    body: body || null,
    queryStringParameters: queryStringParameters || null,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    pathParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789012',
      apiId: 'api-id',
      protocol: 'HTTP/1.1',
      httpMethod: method,
      path,
      stage: 'dev',
      requestId: 'request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'resource-id',
      resourcePath: path,
      identity: {} as APIGatewayProxyEvent['requestContext']['identity'],
      authorizer: {
        claims: {
          sub: 'user-123',
          email: 'admin@ctcm.com',
          'cognito:groups': 'admin',
        },
      },
    },
    resource: path,
  });

  describe('Request Routing', () => {
    it('should route GET /shipments to list handler', async () => {
      const mockShipments: Shipment[] = [
        {
          id: 'ship-123',
          trackingNumber: 'CTCM-20260215-0001',
          customerId: 'cust-123',
          status: 'received',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockGetShipments.mockResolvedValue(mockShipments);

      const event = createMockEvent('GET', '/shipments');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockGetShipments).toHaveBeenCalled();
    });

    it('should route GET /shipments/:id to get handler', async () => {
      const mockShipment: Shipment = {
        id: 'ship-123',
        trackingNumber: 'CTCM-20260215-0001',
        customerId: 'cust-123',
        status: 'received',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGetShipmentById.mockResolvedValue(mockShipment);

      const event = createMockEvent('GET', '/shipments/ship-123');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockGetShipmentById).toHaveBeenCalledWith('ship-123');
    });

    it('should route GET /shipments/:trackingNumber to get handler', async () => {
      const mockShipment: Shipment = {
        id: 'ship-123',
        trackingNumber: 'CTCM-20260215-0001',
        customerId: 'cust-123',
        status: 'received',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGetShipmentByTrackingNumber.mockResolvedValue(mockShipment);

      const event = createMockEvent('GET', '/shipments/CTCM-20260215-0001');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockGetShipmentByTrackingNumber).toHaveBeenCalledWith(
        'CTCM-20260215-0001'
      );
    });

    it('should route POST /shipments to create handler', async () => {
      const mockShipment: Shipment = {
        id: 'ship-123',
        trackingNumber: 'CTCM-20260215-0001',
        customerId: 'cust-123',
        status: 'received',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateShipment.mockResolvedValue(mockShipment);

      const event = createMockEvent(
        'POST',
        '/shipments',
        JSON.stringify({ customerId: 'cust-123' })
      );
      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      expect(mockCreateShipment).toHaveBeenCalled();
    });

    it('should route PUT /shipments/:id to update handler', async () => {
      const mockShipment: Shipment = {
        id: 'ship-123',
        trackingNumber: 'CTCM-20260215-0001',
        customerId: 'cust-123',
        status: 'processing',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUpdateShipment.mockResolvedValue(mockShipment);

      const event = createMockEvent(
        'PUT',
        '/shipments/ship-123',
        JSON.stringify({ status: 'processing' })
      );
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockUpdateShipment).toHaveBeenCalledWith(
        'ship-123',
        { status: 'processing' }
      );
    });

    it('should return 405 for unsupported methods', async () => {
      const event = createMockEvent('DELETE', '/shipments/ship-123');
      const result = await handler(event);

      expect(result.statusCode).toBe(405);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Method not allowed');
    });
  });

  describe('List Shipments', () => {
    it('should list shipments with filters', async () => {
      const mockShipments: Shipment[] = [
        {
          id: 'ship-123',
          trackingNumber: 'CTCM-20260215-0001',
          customerId: 'cust-123',
          status: 'processing',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockGetShipments.mockResolvedValue(mockShipments);

      const event = createMockEvent('GET', '/shipments', undefined, {
        status: 'processing',
        customerId: 'cust-123',
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockGetShipments).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'processing',
          customerId: 'cust-123',
        })
      );
    });

    it('should handle date range filters', async () => {
      mockGetShipments.mockResolvedValue([]);

      const event = createMockEvent('GET', '/shipments', undefined, {
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockGetShipments).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });

    it('should handle search filter', async () => {
      mockGetShipments.mockResolvedValue([]);

      const event = createMockEvent('GET', '/shipments', undefined, {
        search: 'CTCM-2026',
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockGetShipments).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'CTCM-2026',
        })
      );
    });
  });

  describe('Get Shipment', () => {
    it('should return 404 if shipment not found', async () => {
      mockGetShipmentById.mockResolvedValue(null);

      const event = createMockEvent('GET', '/shipments/nonexistent');
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Shipment not found');
    });
  });

  describe('Create Shipment', () => {
    it('should return 400 for missing request body', async () => {
      const event = createMockEvent('POST', '/shipments');
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Request body is required');
    });

    it('should return 400 for invalid JSON', async () => {
      const event = createMockEvent('POST', '/shipments', 'invalid json');
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Invalid JSON in request body');
    });

    it('should return 422 for missing required fields', async () => {
      const event = createMockEvent('POST', '/shipments', JSON.stringify({}));
      const result = await handler(event);

      expect(result.statusCode).toBe(422);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Missing required field: customerId');
    });

    it('should create shipment successfully', async () => {
      const mockShipment: Shipment = {
        id: 'ship-123',
        trackingNumber: 'CTCM-20260215-0001',
        customerId: 'cust-123',
        status: 'received',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateShipment.mockResolvedValue(mockShipment);

      const event = createMockEvent(
        'POST',
        '/shipments',
        JSON.stringify({
          customerId: 'cust-123',
          shipperName: 'Test Shipper',
        })
      );
      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.trackingNumber).toBe('CTCM-20260215-0001');
    });
  });

  describe('Update Shipment', () => {
    it('should return 404 if shipment not found', async () => {
      mockUpdateShipment.mockResolvedValue(null);

      const event = createMockEvent(
        'PUT',
        '/shipments/nonexistent',
        JSON.stringify({ status: 'processing' })
      );
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Shipment not found');
    });

    it('should return 422 for invalid status transition', async () => {
      mockUpdateShipment.mockRejectedValue(
        new Error('Invalid status transition from received to delivered')
      );

      const event = createMockEvent(
        'PUT',
        '/shipments/ship-123',
        JSON.stringify({ status: 'delivered' })
      );
      const result = await handler(event);

      expect(result.statusCode).toBe(422);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Invalid status transition');
    });

    it('should update shipment successfully', async () => {
      const mockShipment: Shipment = {
        id: 'ship-123',
        trackingNumber: 'CTCM-20260215-0001',
        customerId: 'cust-123',
        status: 'processing',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUpdateShipment.mockResolvedValue(mockShipment);

      const event = createMockEvent(
        'PUT',
        '/shipments/ship-123',
        JSON.stringify({ status: 'processing' })
      );
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('processing');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockGetShipments.mockRejectedValue(new Error('Database error'));

      const event = createMockEvent('GET', '/shipments');
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('Response Format', () => {
    it('should return success response with correct structure', async () => {
      const mockShipments: Shipment[] = [
        {
          id: 'ship-123',
          trackingNumber: 'CTCM-20260215-0001',
          customerId: 'cust-123',
          status: 'received',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockGetShipments.mockResolvedValue(mockShipments);

      const event = createMockEvent('GET', '/shipments');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('metadata');
      expect(body.metadata).toHaveProperty('timestamp');
      expect(body.metadata).toHaveProperty('requestId');
    });
  });
});
