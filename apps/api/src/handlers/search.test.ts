import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './search';
import * as database from '../lib/database';
import * as auth from '../lib/auth';
import { SearchService } from '../services/search-service';

// Mock dependencies
vi.mock('../lib/database');
vi.mock('../lib/auth');
vi.mock('../services/search-service');

describe('Search Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set environment variable
    process.env.DB_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test';

    // Mock database initialization
    vi.mocked(database.initializePool).mockResolvedValue(undefined);

    // Mock user context
    vi.mocked(auth.getUserContext).mockReturnValue({
      sub: 'test-user-id',
      email: 'test@example.com',
      role: 'admin',
      groups: ['admin'],
    });
  });

  const createEvent = (
    queryStringParameters?: Record<string, string>
  ): APIGatewayProxyEvent => ({
    httpMethod: 'GET',
    path: '/search',
    queryStringParameters: queryStringParameters || null,
    pathParameters: null,
    headers: {},
    body: null,
    isBase64Encoded: false,
    requestContext: {} as APIGatewayProxyEvent['requestContext'],
    resource: '',
    stageVariables: null,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
  });

  describe('GET /search', () => {
    it('should return search results for valid query', async () => {
      const mockSearchResult = {
        shipments: [
          {
            id: 'shipment-1',
            trackingNumber: 'CTCM-20260215-0001',
            customerId: 'customer-1',
            status: 'received' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      vi.mocked(SearchService.prototype.searchShipments).mockResolvedValue(mockSearchResult);

      const event = createEvent({ q: 'CTCM-20260215-0001' });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.shipments).toHaveLength(1);
      expect(body.data.pagination.total).toBe(1);
    });

    it('should return 400 if query parameter is missing', async () => {
      const event = createEvent({});
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Query parameter "q" is required');
    });

    it('should return 400 if query parameter is empty', async () => {
      const event = createEvent({ q: '   ' });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Query parameter "q" is required');
    });

    it('should use default pagination values', async () => {
      const mockSearchResult = {
        shipments: [],
        total: 1,
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      vi.mocked(SearchService.prototype.searchShipments).mockResolvedValue(mockSearchResult);

      const event = createEvent({ q: 'test' });
      await handler(event);

      expect(SearchService.prototype.searchShipments).toHaveBeenCalledWith(
        'test',
        1,
        20,
        expect.any(Object)
      );
    });

    it('should use custom pagination values', async () => {
      const mockSearchResult = {
        shipments: [],
        total: 1,
        pagination: {
          page: 2,
          limit: 50,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      };

      vi.mocked(SearchService.prototype.searchShipments).mockResolvedValue(mockSearchResult);

      const event = createEvent({ q: 'test', page: '2', limit: '50' });
      await handler(event);

      expect(SearchService.prototype.searchShipments).toHaveBeenCalledWith(
        'test',
        2,
        50,
        expect.any(Object)
      );
    });

    it('should return 400 if page is less than 1', async () => {
      const event = createEvent({ q: 'test', page: '0' });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Page must be greater than 0');
    });

    it('should return 400 if limit is less than 1', async () => {
      const event = createEvent({ q: 'test', limit: '0' });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Limit must be between 1 and 100');
    });

    it('should return 400 if limit is greater than 100', async () => {
      const event = createEvent({ q: 'test', limit: '101' });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Limit must be between 1 and 100');
    });

    it('should pass user context to search service', async () => {
      const mockUserContext = {
        sub: 'customer-user-id',
        email: 'customer@example.com',
        role: 'customer' as const,
        tenantId: 'customer-1',
        groups: ['customer'],
      };

      vi.mocked(auth.getUserContext).mockReturnValue(mockUserContext);

      const mockSearchResult = {
        shipments: [],
        total: 1,
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      vi.mocked(SearchService.prototype.searchShipments).mockResolvedValue(mockSearchResult);

      const event = createEvent({ q: 'test' });
      await handler(event);

      expect(SearchService.prototype.searchShipments).toHaveBeenCalledWith(
        'test',
        1,
        20,
        mockUserContext
      );
    });
  });

  describe('Method validation', () => {
    it('should return 405 for POST method', async () => {
      const event = createEvent({ q: 'test' });
      event.httpMethod = 'POST';
      const response = await handler(event);

      expect(response.statusCode).toBe(405);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Method not allowed');
    });

    it('should return 405 for PUT method', async () => {
      const event = createEvent({ q: 'test' });
      event.httpMethod = 'PUT';
      const response = await handler(event);

      expect(response.statusCode).toBe(405);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Method not allowed');
    });

    it('should return 405 for DELETE method', async () => {
      const event = createEvent({ q: 'test' });
      event.httpMethod = 'DELETE';
      const response = await handler(event);

      expect(response.statusCode).toBe(405);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Method not allowed');
    });
  });
});
