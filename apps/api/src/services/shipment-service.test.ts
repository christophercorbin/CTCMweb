import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShipmentService } from './shipment-service.js';
import type { UserContext, CreateShipmentInput, Shipment } from '@ctcm/types';

// Mock the repository
vi.mock('../repositories/shipment-repository.js', () => ({
  ShipmentRepository: vi.fn(() => ({
    create: vi.fn(),
    updateShipment: vi.fn(),
    findById: vi.fn(),
    findWithFilters: vi.fn(),
    findByTrackingNumber: vi.fn(),
    calculateVolumetricWeight: vi.fn(),
    validateStatusTransition: vi.fn(),
  })),
}));

describe('ShipmentService', () => {
  let service: ShipmentService;
  let mockRepository: {
    create: ReturnType<typeof vi.fn>;
    updateShipment: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findWithFilters: ReturnType<typeof vi.fn>;
    findByTrackingNumber: ReturnType<typeof vi.fn>;
    calculateVolumetricWeight: ReturnType<typeof vi.fn>;
    validateStatusTransition: ReturnType<typeof vi.fn>;
  };
  let adminContext: UserContext;

  beforeEach(() => {
    service = new ShipmentService();
    mockRepository = (service as unknown as { repository: typeof mockRepository }).repository;

    adminContext = {
      sub: 'admin-123',
      email: 'admin@ctcm.com',
      role: 'admin',
      groups: ['admin'],
    };
  });

  describe('createShipment', () => {
    it('should create a new shipment', async () => {
      const input: CreateShipmentInput = {
        customerId: 'cust-123',
        shipperName: 'Test Shipper',
        consigneeName: 'Test Consignee',
      };

      const mockShipment: Shipment = {
        id: 'ship-123',
        trackingNumber: 'CTCM-20260215-0001',
        customerId: 'cust-123',
        status: 'received',
        shipperName: 'Test Shipper',
        consigneeName: 'Test Consignee',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValue(mockShipment);

      const result = await service.createShipment(input, adminContext);

      expect(result).toEqual(mockShipment);
      expect(mockRepository.create).toHaveBeenCalledWith(input, adminContext);
    });
  });

  describe('updateShipment', () => {
    it('should update an existing shipment', async () => {
      const mockShipment: Shipment = {
        id: 'ship-123',
        trackingNumber: 'CTCM-20260215-0001',
        customerId: 'cust-123',
        status: 'processing',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.updateShipment.mockResolvedValue(mockShipment);

      const result = await service.updateShipment(
        'ship-123',
        { status: 'processing' },
        adminContext
      );

      expect(result).toEqual(mockShipment);
      expect(mockRepository.updateShipment).toHaveBeenCalledWith(
        'ship-123',
        { status: 'processing' },
        adminContext
      );
    });

    it('should return null if shipment not found', async () => {
      mockRepository.updateShipment.mockResolvedValue(null);

      const result = await service.updateShipment(
        'nonexistent',
        { notes: 'test' },
        adminContext
      );

      expect(result).toBeNull();
    });
  });

  describe('getShipmentById', () => {
    it('should get shipment by ID', async () => {
      const mockShipment: Shipment = {
        id: 'ship-123',
        trackingNumber: 'CTCM-20260215-0001',
        customerId: 'cust-123',
        status: 'received',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(mockShipment);

      const result = await service.getShipmentById('ship-123', adminContext);

      expect(result).toEqual(mockShipment);
      expect(mockRepository.findById).toHaveBeenCalledWith('ship-123');
    });

    it('should return null if not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.getShipmentById('nonexistent', adminContext);

      expect(result).toBeNull();
    });
  });

  describe('getShipments', () => {
    it('should get all shipments with filters', async () => {
      const mockShipments: Shipment[] = [
        {
          id: 'ship-123',
          trackingNumber: 'CTCM-20260215-0001',
          customerId: 'cust-123',
          status: 'processing',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'ship-124',
          trackingNumber: 'CTCM-20260215-0002',
          customerId: 'cust-123',
          status: 'processing',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.findWithFilters.mockResolvedValue(mockShipments);

      const result = await service.getShipments({ status: 'processing' }, adminContext);

      expect(result).toEqual(mockShipments);
      expect(mockRepository.findWithFilters).toHaveBeenCalledWith(
        { status: 'processing' },
        adminContext
      );
    });

    it('should return empty array if no shipments found', async () => {
      mockRepository.findWithFilters.mockResolvedValue([]);

      const result = await service.getShipments({}, adminContext);

      expect(result).toEqual([]);
    });
  });

  describe('getShipmentByTrackingNumber', () => {
    it('should get shipment by tracking number', async () => {
      const mockShipment: Shipment = {
        id: 'ship-123',
        trackingNumber: 'CTCM-20260215-0001',
        customerId: 'cust-123',
        status: 'received',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByTrackingNumber.mockResolvedValue(mockShipment);

      const result = await service.getShipmentByTrackingNumber(
        'CTCM-20260215-0001',
        adminContext
      );

      expect(result).toEqual(mockShipment);
      expect(mockRepository.findByTrackingNumber).toHaveBeenCalledWith(
        'CTCM-20260215-0001',
        adminContext
      );
    });

    it('should return null if not found', async () => {
      mockRepository.findByTrackingNumber.mockResolvedValue(null);

      const result = await service.getShipmentByTrackingNumber('nonexistent', adminContext);

      expect(result).toBeNull();
    });
  });

  describe('calculateVolumetricWeight', () => {
    it('should calculate volumetric weight', () => {
      mockRepository.calculateVolumetricWeight.mockReturnValue(12);

      const result = service.calculateVolumetricWeight(50, 40, 30);

      expect(result).toBe(12);
      expect(mockRepository.calculateVolumetricWeight).toHaveBeenCalledWith(50, 40, 30);
    });
  });

  describe('validateStatusTransition', () => {
    it('should validate status transition', () => {
      mockRepository.validateStatusTransition.mockReturnValue(true);

      const result = service.validateStatusTransition('received', 'processing');

      expect(result).toBe(true);
      expect(mockRepository.validateStatusTransition).toHaveBeenCalledWith(
        'received',
        'processing'
      );
    });

    it('should reject invalid transition', () => {
      mockRepository.validateStatusTransition.mockReturnValue(false);

      const result = service.validateStatusTransition('received', 'delivered');

      expect(result).toBe(false);
    });
  });
});
