import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShipmentRepository } from './shipment-repository.js';
import type { UserContext, CreateShipmentInput } from '@ctcm/types';
import type { QueryResult, QueryResultRow } from 'pg';

// Create mock query function using vi.hoisted to avoid hoisting issues
const mockQuery = vi.hoisted(() => vi.fn());

// Mock the database module
vi.mock('../lib/database.js', () => ({
  query: mockQuery,
  getPool: vi.fn(() => ({
    query: vi.fn(),
  })),
}));

describe('ShipmentRepository', () => {
  let repository: ShipmentRepository;
  let adminContext: UserContext;
  let customerContext: UserContext;

  beforeEach(() => {
    repository = new ShipmentRepository();
    vi.clearAllMocks();

    adminContext = {
      sub: 'admin-123',
      email: 'admin@ctcm.com',
      role: 'admin',
      groups: ['admin'],
    };

    customerContext = {
      sub: 'customer-123',
      email: 'customer@ctcm.com',
      role: 'customer',
      tenantId: 'cust-456',
      groups: ['customer'],
    };
  });

  describe('generateTrackingNumber', () => {
    it('should generate tracking number with correct format', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as unknown as QueryResult<QueryResultRow>);

      const trackingNumber = await repository.generateTrackingNumber();

      expect(trackingNumber).toMatch(/^CTCM-\d{8}-\d{4}$/);
    });

    it('should increment sequence number for same day', async () => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const datePrefix = `${year}${month}${day}`;

      mockQuery.mockResolvedValue({
        rows: [{ tracking_number: `CTCM-${datePrefix}-0005` }],
      } as unknown as QueryResult<QueryResultRow>);

      const trackingNumber = await repository.generateTrackingNumber();

      expect(trackingNumber).toBe(`CTCM-${datePrefix}-0006`);
    });

    it('should start at 0001 for new day', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as unknown as QueryResult<QueryResultRow>);

      const trackingNumber = await repository.generateTrackingNumber();

      expect(trackingNumber).toMatch(/-0001$/);
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow valid transitions', () => {
      expect(repository.validateStatusTransition('received', 'processing')).toBe(true);
      expect(repository.validateStatusTransition('processing', 'ready')).toBe(true);
      expect(repository.validateStatusTransition('ready', 'shipped')).toBe(true);
      expect(repository.validateStatusTransition('shipped', 'delivered')).toBe(true);
    });

    it('should allow backward transitions', () => {
      expect(repository.validateStatusTransition('processing', 'received')).toBe(true);
      expect(repository.validateStatusTransition('ready', 'processing')).toBe(true);
      expect(repository.validateStatusTransition('shipped', 'ready')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(repository.validateStatusTransition('received', 'shipped')).toBe(false);
      expect(repository.validateStatusTransition('processing', 'delivered')).toBe(false);
      expect(repository.validateStatusTransition('delivered', 'shipped')).toBe(false);
    });

    it('should allow staying in same status', () => {
      expect(repository.validateStatusTransition('received', 'received')).toBe(true);
      expect(repository.validateStatusTransition('processing', 'processing')).toBe(true);
    });
  });

  describe('calculateVolumetricWeight', () => {
    it('should calculate volumetric weight correctly', () => {
      const weight = repository.calculateVolumetricWeight(50, 40, 30);
      expect(weight).toBe(12); // (50 * 40 * 30) / 5000 = 12
    });

    it('should round to 2 decimal places', () => {
      const weight = repository.calculateVolumetricWeight(33, 33, 33);
      expect(weight).toBe(7.19); // (33 * 33 * 33) / 5000 = 7.1874 -> 7.19
    });

    it('should handle small dimensions', () => {
      const weight = repository.calculateVolumetricWeight(10, 10, 10);
      expect(weight).toBe(0.2); // (10 * 10 * 10) / 5000 = 0.2
    });
  });

  describe('create', () => {
    it('should create shipment with generated tracking number', async () => {
      const input: CreateShipmentInput = {
        customerId: 'cust-123',
        shipperName: 'Test Shipper',
        consigneeName: 'Test Consignee',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] } as unknown as QueryResult<QueryResultRow>) // generateTrackingNumber
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'ship-123',
              tracking_number: 'CTCM-20260215-0001',
              warehouse_receipt_number: null,
              customer_id: 'cust-123',
              status: 'received',
              received_date: new Date().toISOString(),
              shipper_name: 'Test Shipper',
              shipper_address: null,
              consignee_name: 'Test Consignee',
              consignee_address: null,
              carrier_name: null,
              carrier_tracking: null,
              warehouse_location: null,
              description: null,
              notes: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        } as unknown as QueryResult<QueryResultRow>);

      const shipment = await repository.create(input, adminContext);

      expect(shipment.trackingNumber).toMatch(/^CTCM-\d{8}-\d{4}$/);
      expect(shipment.customerId).toBe('cust-123');
      expect(shipment.status).toBe('received');
      expect(shipment.shipperName).toBe('Test Shipper');
    });
  });

  describe('updateShipment', () => {
    it('should update shipment with valid status transition', async () => {
      // Mock query for getting current shipment
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'ship-123',
            tracking_number: 'CTCM-20260215-0001',
            warehouse_receipt_number: null,
            customer_id: 'cust-123',
            status: 'received',
            received_date: new Date().toISOString(),
            shipper_name: 'Test Shipper',
            shipper_address: null,
            consignee_name: 'Test Consignee',
            consignee_address: null,
            carrier_name: null,
            carrier_tracking: null,
            warehouse_location: null,
            description: null,
            notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      } as unknown as QueryResult<QueryResultRow>);

      // Mock query for update
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'ship-123',
            tracking_number: 'CTCM-20260215-0001',
            warehouse_receipt_number: null,
            customer_id: 'cust-123',
            status: 'processing',
            received_date: new Date().toISOString(),
            shipper_name: 'Test Shipper',
            shipper_address: null,
            consignee_name: 'Test Consignee',
            consignee_address: null,
            carrier_name: null,
            carrier_tracking: null,
            warehouse_location: null,
            description: null,
            notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      } as unknown as QueryResult<QueryResultRow>);

      const updated = await repository.updateShipment(
        'ship-123',
        { status: 'processing' },
        adminContext
      );

      expect(updated?.status).toBe('processing');
    });

    it('should throw error for invalid status transition', async () => {
      // Mock query for getting current shipment
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'ship-123',
            tracking_number: 'CTCM-20260215-0001',
            warehouse_receipt_number: null,
            customer_id: 'cust-123',
            status: 'received',
            received_date: new Date().toISOString(),
            shipper_name: 'Test Shipper',
            shipper_address: null,
            consignee_name: 'Test Consignee',
            consignee_address: null,
            carrier_name: null,
            carrier_tracking: null,
            warehouse_location: null,
            description: null,
            notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      } as unknown as QueryResult<QueryResultRow>);

      await expect(
        repository.updateShipment('ship-123', { status: 'delivered' }, adminContext)
      ).rejects.toThrow('Invalid status transition');
    });

    it('should return null if shipment not found', async () => {
      // Mock query for getting current shipment (not found)
      mockQuery.mockResolvedValueOnce({ rows: [] } as unknown as QueryResult<QueryResultRow>);

      const updated = await repository.updateShipment(
        'nonexistent',
        { status: 'processing' },
        adminContext
      );

      expect(updated).toBeNull();
    });
  });

  describe('findWithFilters', () => {
    it('should filter by status', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 'ship-123',
            tracking_number: 'CTCM-20260215-0001',
            warehouse_receipt_number: null,
            customer_id: 'cust-123',
            status: 'processing',
            received_date: new Date().toISOString(),
            shipper_name: 'Test Shipper',
            shipper_address: null,
            consignee_name: 'Test Consignee',
            consignee_address: null,
            carrier_name: null,
            carrier_tracking: null,
            warehouse_location: null,
            description: null,
            notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      } as unknown as QueryResult<QueryResultRow>);

      const shipments = await repository.findWithFilters(
        { status: 'processing' },
        adminContext
      );

      expect(shipments).toHaveLength(1);
      expect(shipments[0].status).toBe('processing');
    });

    it('should apply tenant isolation for customer users', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as unknown as QueryResult<QueryResultRow>);

      await repository.findWithFilters({}, customerContext);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('customer_id = $1'),
        expect.arrayContaining(['cust-456'])
      );
    });

    it('should filter by date range', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as unknown as QueryResult<QueryResultRow>);

      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      await repository.findWithFilters({ startDate, endDate }, adminContext);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('received_date >= $1'),
        expect.arrayContaining([startDate])
      );
    });

    it('should search by tracking number or receipt number', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as unknown as QueryResult<QueryResultRow>);

      await repository.findWithFilters({ search: 'CTCM-2026' }, adminContext);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('tracking_number ILIKE'),
        expect.arrayContaining(['%CTCM-2026%'])
      );
    });
  });

  describe('findByTrackingNumber', () => {
    it('should find shipment by tracking number', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 'ship-123',
            tracking_number: 'CTCM-20260215-0001',
            warehouse_receipt_number: null,
            customer_id: 'cust-123',
            status: 'received',
            received_date: new Date().toISOString(),
            shipper_name: 'Test Shipper',
            shipper_address: null,
            consignee_name: 'Test Consignee',
            consignee_address: null,
            carrier_name: null,
            carrier_tracking: null,
            warehouse_location: null,
            description: null,
            notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      } as unknown as QueryResult<QueryResultRow>);

      const shipment = await repository.findByTrackingNumber(
        'CTCM-20260215-0001',
        adminContext
      );

      expect(shipment).not.toBeNull();
      expect(shipment?.trackingNumber).toBe('CTCM-20260215-0001');
    });

    it('should apply tenant isolation for customer users', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as unknown as QueryResult<QueryResultRow>);

      await repository.findByTrackingNumber('CTCM-20260215-0001', customerContext);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND customer_id = $2'),
        expect.arrayContaining(['CTCM-20260215-0001', 'cust-456'])
      );
    });

    it('should return null if not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as unknown as QueryResult<QueryResultRow>);

      const shipment = await repository.findByTrackingNumber('nonexistent', adminContext);

      expect(shipment).toBeNull();
    });
  });
});
