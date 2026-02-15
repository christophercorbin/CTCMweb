import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRepository, getTenantId, validateCustomerAccess } from './base-repository';
import type { UserContext } from '@ctcm/types';

// Mock the database module
vi.mock('../lib/database', () => ({
  query: vi.fn(),
  transaction: vi.fn((callback) => callback()),
}));

// Test implementation of BaseRepository
class TestRepository extends BaseRepository {
  async testFindMany<T>(baseQuery: string, params: any[], userContext: UserContext) {
    return this.findMany<T>(baseQuery, params, {
      userContext,
      tenantIsolation: { tableName: 'test_table', tenantColumn: 'customer_id' },
    });
  }

  async testInsert<T>(data: Record<string, any>, userContext: UserContext) {
    return this.insert<T>('test_table', data, {
      userContext,
      tenantIsolation: { tableName: 'test_table', tenantColumn: 'customer_id' },
    });
  }

  async testUpdate<T>(id: string, data: Record<string, any>, userContext: UserContext) {
    return this.update<T>('test_table', id, data, {
      userContext,
      tenantIsolation: { tableName: 'test_table', tenantColumn: 'customer_id' },
    });
  }

  async testVerifyAccess(resourceId: string, userContext: UserContext) {
    return this.verifyTenantAccess('test_table', resourceId, {
      userContext,
      tenantIsolation: { tableName: 'test_table', tenantColumn: 'customer_id' },
    });
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let adminUser: UserContext;
  let customerUser: UserContext;

  beforeEach(() => {
    repository = new TestRepository();
    
    adminUser = {
      sub: 'admin-123',
      email: 'admin@test.com',
      role: 'admin',
      groups: ['admin'],
    };

    customerUser = {
      sub: 'customer-123',
      email: 'customer@test.com',
      role: 'customer',
      tenantId: 'tenant-456',
      groups: ['customer'],
    };

    vi.clearAllMocks();
  });

  describe('Tenant Isolation', () => {
    it('should allow admin users to query all data without tenant filter', async () => {
      const { query } = await import('../lib/database');
      vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await repository.testFindMany('SELECT * FROM test_table', [], adminUser);

      expect(query).toHaveBeenCalledWith(
        'SELECT * FROM test_table ',
        []
      );
    });

    it('should apply tenant filter for customer users', async () => {
      const { query } = await import('../lib/database');
      vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await repository.testFindMany('SELECT * FROM test_table', [], customerUser);

      expect(query).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE customer_id = $1',
        ['tenant-456']
      );
    });

    it('should throw error if customer user has no tenantId', async () => {
      const invalidCustomer: UserContext = {
        ...customerUser,
        tenantId: undefined,
      };

      await expect(
        repository.testFindMany('SELECT * FROM test_table', [], invalidCustomer)
      ).rejects.toThrow('Customer user missing tenantId');
    });

    it('should inject tenant ID when customer user inserts data', async () => {
      const { query } = await import('../lib/database');
      vi.mocked(query).mockResolvedValue({ rows: [{ id: '1' }], rowCount: 1 } as any);

      const data = { name: 'Test' };
      await repository.testInsert(data, customerUser);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO test_table'),
        expect.arrayContaining(['Test', 'tenant-456'])
      );
    });

    it('should not inject tenant ID for admin user inserts', async () => {
      const { query } = await import('../lib/database');
      vi.mocked(query).mockResolvedValue({ rows: [{ id: '1' }], rowCount: 1 } as any);

      const data = { name: 'Test', customer_id: 'custom-tenant' };
      await repository.testInsert(data, adminUser);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO test_table'),
        ['Test', 'custom-tenant']
      );
    });

    it('should verify tenant access for customer users on update', async () => {
      const { query } = await import('../lib/database');
      vi.mocked(query).mockResolvedValue({ rows: [{ id: '1' }], rowCount: 1 } as any);

      await repository.testUpdate('1', { name: 'Updated' }, customerUser);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND customer_id = $3'),
        ['Updated', '1', 'tenant-456']
      );
    });

    it('should allow admin users to update any record', async () => {
      const { query } = await import('../lib/database');
      vi.mocked(query).mockResolvedValue({ rows: [{ id: '1' }], rowCount: 1 } as any);

      await repository.testUpdate('1', { name: 'Updated' }, adminUser);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $2'),
        ['Updated', '1']
      );
      expect(query).not.toHaveBeenCalledWith(
        expect.stringContaining('customer_id'),
        expect.anything()
      );
    });
  });

  describe('verifyTenantAccess', () => {
    it('should allow admin users to access any resource', async () => {
      await expect(
        repository.testVerifyAccess('resource-123', adminUser)
      ).resolves.not.toThrow();
    });

    it('should verify customer user has access to resource', async () => {
      const { query } = await import('../lib/database');
      vi.mocked(query).mockResolvedValue({ rows: [{ exists: 1 }], rowCount: 1 } as any);

      await expect(
        repository.testVerifyAccess('resource-123', customerUser)
      ).resolves.not.toThrow();

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND customer_id = $2'),
        ['resource-123', 'tenant-456']
      );
    });

    it('should throw error if customer user does not have access', async () => {
      const { query } = await import('../lib/database');
      vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await expect(
        repository.testVerifyAccess('resource-123', customerUser)
      ).rejects.toThrow('Access denied');
    });
  });

  describe('Helper Functions', () => {
    it('getTenantId should return undefined for admin users', () => {
      expect(getTenantId(adminUser)).toBeUndefined();
    });

    it('getTenantId should return tenantId for customer users', () => {
      expect(getTenantId(customerUser)).toBe('tenant-456');
    });

    it('validateCustomerAccess should allow admin to access any customer', () => {
      expect(() => validateCustomerAccess(adminUser, 'any-customer-id')).not.toThrow();
    });

    it('validateCustomerAccess should allow customer to access their own data', () => {
      expect(() => validateCustomerAccess(customerUser, 'tenant-456')).not.toThrow();
    });

    it('validateCustomerAccess should deny customer access to other customer data', () => {
      expect(() => validateCustomerAccess(customerUser, 'other-tenant')).toThrow('Access denied');
    });
  });
});
