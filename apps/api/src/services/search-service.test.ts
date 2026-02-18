import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchService } from './search-service';
import { SearchRepository } from '../repositories/search-repository';
import type { UserContext } from '@ctcm/types';

// Mock the repository
vi.mock('../repositories/search-repository');

describe('SearchService', () => {
  let service: SearchService;
  let mockRepository: SearchRepository;

  const adminContext: UserContext = {
    sub: 'admin-user-id',
    email: 'admin@example.com',
    role: 'admin',
    groups: ['admin'],
  };

  const customerContext: UserContext = {
    sub: 'customer-user-id',
    email: 'customer@example.com',
    role: 'customer',
    tenantId: 'customer-1',
    groups: ['customer'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SearchService();
    mockRepository = (service as { repository: typeof mockRepository }).repository;
  });

  describe('searchShipments', () => {
    it('should return search results with pagination metadata', async () => {
      const mockShipments = [
        {
          id: 'shipment-1',
          trackingNumber: 'CTCM-20260215-0001',
          customerId: 'customer-1',
          status: 'received' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'shipment-2',
          trackingNumber: 'CTCM-20260215-0002',
          customerId: 'customer-1',
          status: 'processing' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(mockRepository.searchShipments).mockResolvedValue({
        shipments: mockShipments,
        total: 25,
      });

      const result = await service.searchShipments('test', 1, 10, adminContext);

      expect(result.shipments).toEqual(mockShipments);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('should calculate correct offset for page 1', async () => {
      vi.mocked(mockRepository.searchShipments).mockResolvedValue({
        shipments: [],
        total: 0,
      });

      await service.searchShipments('test', 1, 20, adminContext);

      expect(mockRepository.searchShipments).toHaveBeenCalledWith(
        'test',
        20,
        0,
        adminContext
      );
    });

    it('should calculate correct offset for page 2', async () => {
      vi.mocked(mockRepository.searchShipments).mockResolvedValue({
        shipments: [],
        total: 0,
      });

      await service.searchShipments('test', 2, 20, adminContext);

      expect(mockRepository.searchShipments).toHaveBeenCalledWith(
        'test',
        20,
        20,
        adminContext
      );
    });

    it('should calculate correct offset for page 3 with custom limit', async () => {
      vi.mocked(mockRepository.searchShipments).mockResolvedValue({
        shipments: [],
        total: 0,
      });

      await service.searchShipments('test', 3, 50, adminContext);

      expect(mockRepository.searchShipments).toHaveBeenCalledWith(
        'test',
        50,
        100,
        adminContext
      );
    });

    it('should indicate hasNextPage correctly when on first page', async () => {
      vi.mocked(mockRepository.searchShipments).mockResolvedValue({
        shipments: [],
        total: 50,
      });

      const result = await service.searchShipments('test', 1, 20, adminContext);

      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPreviousPage).toBe(false);
    });

    it('should indicate hasNextPage correctly when on last page', async () => {
      vi.mocked(mockRepository.searchShipments).mockResolvedValue({
        shipments: [],
        total: 50,
      });

      const result = await service.searchShipments('test', 3, 20, adminContext);

      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPreviousPage).toBe(true);
    });

    it('should indicate hasNextPage correctly when on middle page', async () => {
      vi.mocked(mockRepository.searchShipments).mockResolvedValue({
        shipments: [],
        total: 50,
      });

      const result = await service.searchShipments('test', 2, 20, adminContext);

      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPreviousPage).toBe(true);
    });

    it('should calculate totalPages correctly', async () => {
      vi.mocked(mockRepository.searchShipments).mockResolvedValue({
        shipments: [],
        total: 47,
      });

      const result = await service.searchShipments('test', 1, 10, adminContext);

      expect(result.pagination.totalPages).toBe(5); // 47 / 10 = 4.7, rounded up to 5
    });

    it('should handle zero results', async () => {
      vi.mocked(mockRepository.searchShipments).mockResolvedValue({
        shipments: [],
        total: 0,
      });

      const result = await service.searchShipments('test', 1, 20, adminContext);

      expect(result.shipments).toEqual([]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should pass customer context to repository', async () => {
      vi.mocked(mockRepository.searchShipments).mockResolvedValue({
        shipments: [],
        total: 0,
      });

      await service.searchShipments('test', 1, 20, customerContext);

      expect(mockRepository.searchShipments).toHaveBeenCalledWith(
        'test',
        20,
        0,
        customerContext
      );
    });

    it('should handle exact page boundary', async () => {
      vi.mocked(mockRepository.searchShipments).mockResolvedValue({
        shipments: [],
        total: 40,
      });

      const result = await service.searchShipments('test', 2, 20, adminContext);

      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPreviousPage).toBe(true);
    });
  });
});
