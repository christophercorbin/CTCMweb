import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchRepository } from './search-repository';
import * as database from '../lib/database';
import type { UserContext } from '@ctcm/types';

// Mock the database module
vi.mock('../lib/database');

describe('SearchRepository', () => {
  let repository: SearchRepository;

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
    repository = new SearchRepository();
  });

  describe('searchShipments', () => {
    it('should search shipments using full-text search for admin', async () => {
      const mockShipments = [
        {
          id: 'shipment-1',
          tracking_number: 'CTCM-20260215-0001',
          warehouse_receipt_number: 'WR-001',
          customer_id: 'customer-1',
          status: 'received',
          received_date: '2026-02-15',
          shipper_name: 'Test Shipper',
          shipper_address: '123 Test St',
          consignee_name: null,
          consignee_address: null,
          carrier_name: 'UPS',
          carrier_tracking: null,
          warehouse_location: 'SP',
          description: 'Test shipment',
          notes: null,
          created_at: '2026-02-15T10:00:00Z',
          updated_at: '2026-02-15T10:00:00Z',
          customer_name: 'John Doe',
          rank: 0.5,
        },
      ];

      vi.mocked(database.query).mockResolvedValueOnce({
        rows: mockShipments,
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      vi.mocked(database.query).mockResolvedValueOnce({
        rows: [{ total: '1' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.searchShipments('test', 20, 0, adminContext);

      expect(result.shipments).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.shipments[0].trackingNumber).toBe('CTCM-20260215-0001');

      // Verify search query was called with correct parameters
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('plainto_tsquery'),
        ['test', 20, 0]
      );
    });

    it('should apply tenant isolation for customer users', async () => {
      vi.mocked(database.query).mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      vi.mocked(database.query).mockResolvedValueOnce({
        rows: [{ total: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.searchShipments('test', 20, 0, customerContext);

      // Verify tenant filter was applied
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('AND s.customer_id = $2'),
        ['test', 'customer-1', 20, 0]
      );
    });

    it('should not apply tenant isolation for admin users', async () => {
      vi.mocked(database.query).mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      vi.mocked(database.query).mockResolvedValueOnce({
        rows: [{ total: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.searchShipments('test', 20, 0, adminContext);

      // Verify no tenant filter was applied
      const calls = vi.mocked(database.query).mock.calls;
      expect(calls[0][0]).not.toContain('AND s.customer_id = $2');
      expect(calls[0][1]).toEqual(['test', 20, 0]);
    });

    it('should use correct limit and offset', async () => {
      vi.mocked(database.query).mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      vi.mocked(database.query).mockResolvedValueOnce({
        rows: [{ total: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.searchShipments('test', 50, 100, adminContext);

      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        ['test', 50, 100]
      );
    });

    it('should search across multiple fields', async () => {
      vi.mocked(database.query).mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      vi.mocked(database.query).mockResolvedValueOnce({
        rows: [{ total: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.searchShipments('test query', 20, 0, adminContext);

      const searchQuery = vi.mocked(database.query).mock.calls[0][0] as string;

      // Verify search includes full-text search
      expect(searchQuery).toContain('search_vector @@ plainto_tsquery');

      // Verify search includes ILIKE for tracking number
      expect(searchQuery).toContain('tracking_number ILIKE');

      // Verify search includes ILIKE for warehouse receipt number
      expect(searchQuery).toContain('warehouse_receipt_number ILIKE');

      // Verify search includes ILIKE for customer name
      expect(searchQuery).toContain('c.name ILIKE');
    });

    it('should order results by relevance rank', async () => {
      vi.mocked(database.query).mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      vi.mocked(database.query).mockResolvedValueOnce({
        rows: [{ total: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.searchShipments('test', 20, 0, adminContext);

      const searchQuery = vi.mocked(database.query).mock.calls[0][0] as string;
      expect(searchQuery).toContain('ORDER BY rank DESC');
    });

    it('should join with customers table', async () => {
      vi.mocked(database.query).mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      vi.mocked(database.query).mockResolvedValueOnce({
        rows: [{ total: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repository.searchShipments('test', 20, 0, adminContext);

      const searchQuery = vi.mocked(database.query).mock.calls[0][0] as string;
      expect(searchQuery).toContain('INNER JOIN customers c ON s.customer_id = c.id');
    });

    it('should return correct total count', async () => {
      vi.mocked(database.query).mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      vi.mocked(database.query).mockResolvedValueOnce({
        rows: [{ total: '42' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.searchShipments('test', 20, 0, adminContext);

      expect(result.total).toBe(42);
    });

    it('should handle zero results', async () => {
      vi.mocked(database.query).mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      vi.mocked(database.query).mockResolvedValueOnce({
        rows: [{ total: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.searchShipments('nonexistent', 20, 0, adminContext);

      expect(result.shipments).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should map database rows to Shipment entities correctly', async () => {
      const mockRow = {
        id: 'shipment-1',
        tracking_number: 'CTCM-20260215-0001',
        warehouse_receipt_number: 'WR-001',
        customer_id: 'customer-1',
        status: 'received',
        received_date: '2026-02-15T10:00:00Z',
        shipper_name: 'Test Shipper',
        shipper_address: '123 Test St',
        consignee_name: 'Test Consignee',
        consignee_address: '456 Test Ave',
        carrier_name: 'UPS',
        carrier_tracking: 'UPS123',
        warehouse_location: 'SP',
        description: 'Test shipment',
        notes: 'Test notes',
        created_at: '2026-02-15T10:00:00Z',
        updated_at: '2026-02-15T11:00:00Z',
        customer_name: 'John Doe',
        rank: 0.5,
      };

      vi.mocked(database.query).mockResolvedValueOnce({
        rows: [mockRow],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      vi.mocked(database.query).mockResolvedValueOnce({
        rows: [{ total: '1' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repository.searchShipments('test', 20, 0, adminContext);

      expect(result.shipments[0]).toEqual({
        id: 'shipment-1',
        trackingNumber: 'CTCM-20260215-0001',
        warehouseReceiptNumber: 'WR-001',
        customerId: 'customer-1',
        status: 'received',
        receivedDate: new Date('2026-02-15T10:00:00Z'),
        shipperName: 'Test Shipper',
        shipperAddress: '123 Test St',
        consigneeName: 'Test Consignee',
        consigneeAddress: '456 Test Ave',
        carrierName: 'UPS',
        carrierTracking: 'UPS123',
        warehouseLocation: 'SP',
        description: 'Test shipment',
        notes: 'Test notes',
        createdAt: new Date('2026-02-15T10:00:00Z'),
        updatedAt: new Date('2026-02-15T11:00:00Z'),
      });
    });
  });
});
