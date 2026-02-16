import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomerService } from './customer-service';
import { CustomerRepository } from '../repositories/customer-repository';
import type { UserContext, Customer, CreateCustomerInput } from '@ctcm/types';

// Mock the repository
vi.mock('../repositories/customer-repository');

describe('CustomerService', () => {
  let service: CustomerService;
  let mockRepository: InstanceType<typeof CustomerRepository>;
  let adminUser: UserContext;
  let customerUser: UserContext;

  beforeEach(() => {
    service = new CustomerService();
    mockRepository = vi.mocked(CustomerRepository).mock.instances[0];

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

  describe('Email Validation', () => {
    it('should reject invalid email format on create', async () => {
      const input: CreateCustomerInput = {
        userId: 'user-123',
        name: 'Test Customer',
        email: 'invalid-email',
      };

      await expect(
        service.createCustomer(input, adminUser)
      ).rejects.toThrow('Invalid email format');
    });

    it('should accept valid email format', async () => {
      mockRepository.emailExists = vi.fn().mockResolvedValue(false);
      mockRepository.create = vi.fn().mockResolvedValue({
        id: '1',
        userId: 'user-123',
        name: 'Test Customer',
        email: 'valid@example.com',
      });

      const input: CreateCustomerInput = {
        userId: 'user-123',
        name: 'Test Customer',
        email: 'valid@example.com',
      };

      const result = await service.createCustomer(input, adminUser);
      expect(result.email).toBe('valid@example.com');
    });
  });

  describe('Email Uniqueness', () => {
    it('should reject duplicate email on create', async () => {
      mockRepository.emailExists = vi.fn().mockResolvedValue(true);

      const input: CreateCustomerInput = {
        userId: 'user-123',
        name: 'Test Customer',
        email: 'existing@example.com',
      };

      await expect(
        service.createCustomer(input, adminUser)
      ).rejects.toThrow('Email address is already in use');
    });

    it('should reject duplicate email on update', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue({
        id: '1',
        email: 'current@example.com',
      });
      mockRepository.emailExists = vi.fn().mockResolvedValue(true);

      await expect(
        service.updateCustomer('1', { email: 'existing@example.com' }, adminUser)
      ).rejects.toThrow('Email address is already in use');
    });

    it('should allow updating customer with same email', async () => {
      const existingCustomer: Customer = {
        id: '1',
        userId: 'user-123',
        name: 'Test Customer',
        email: 'same@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findById = vi.fn().mockResolvedValue(existingCustomer);
      mockRepository.emailExists = vi.fn().mockResolvedValue(false);
      mockRepository.updateCustomer = vi.fn().mockResolvedValue({
        ...existingCustomer,
        name: 'Updated Name',
      });

      const result = await service.updateCustomer(
        '1',
        { name: 'Updated Name', email: 'same@example.com' },
        adminUser
      );

      expect(result.name).toBe('Updated Name');
    });
  });

  describe('Authorization', () => {
    it('should allow admin to create customers', async () => {
      mockRepository.emailExists = vi.fn().mockResolvedValue(false);
      mockRepository.create = vi.fn().mockResolvedValue({
        id: '1',
        userId: 'user-123',
        name: 'Test Customer',
        email: 'test@example.com',
      });

      const input: CreateCustomerInput = {
        userId: 'user-123',
        name: 'Test Customer',
        email: 'test@example.com',
      };

      await expect(
        service.createCustomer(input, adminUser)
      ).resolves.toBeDefined();
    });

    it('should deny customer user from creating customers', async () => {
      const input: CreateCustomerInput = {
        userId: 'user-123',
        name: 'Test Customer',
        email: 'test@example.com',
      };

      await expect(
        service.createCustomer(input, customerUser)
      ).rejects.toThrow('Only administrators can create customers');
    });

    it('should allow admin to delete customers', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue({ id: '1' });
      mockRepository.deleteCustomer = vi.fn().mockResolvedValue(true);

      await expect(
        service.deleteCustomer('1', adminUser)
      ).resolves.not.toThrow();
    });

    it('should deny customer user from deleting customers', async () => {
      await expect(
        service.deleteCustomer('1', customerUser)
      ).rejects.toThrow('Only administrators can delete customers');
    });
  });

  describe('Tenant Isolation', () => {
    it('should allow customer user to get their own profile', async () => {
      const customerProfile: Customer = {
        id: 'tenant-456',
        userId: 'customer-123',
        name: 'Customer Name',
        email: 'customer@test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findById = vi.fn().mockResolvedValue(customerProfile);

      const result = await service.getCurrentCustomer(customerUser);
      expect(result.id).toBe('tenant-456');
      expect(mockRepository.findById).toHaveBeenCalledWith('tenant-456', customerUser);
    });

    it('should throw error if admin tries to get current customer without ID', async () => {
      await expect(
        service.getCurrentCustomer(adminUser)
      ).rejects.toThrow('Admin users must specify a customer ID');
    });
  });

  describe('Validation', () => {
    it('should reject empty customer name', async () => {
      mockRepository.emailExists = vi.fn().mockResolvedValue(false);

      const input: CreateCustomerInput = {
        userId: 'user-123',
        name: '   ',
        email: 'test@example.com',
      };

      await expect(
        service.createCustomer(input, adminUser)
      ).rejects.toThrow('Customer name is required');
    });

    it('should reject missing user ID', async () => {
      mockRepository.emailExists = vi.fn().mockResolvedValue(false);

      const input: CreateCustomerInput = {
        userId: '',
        name: 'Test Customer',
        email: 'test@example.com',
      };

      await expect(
        service.createCustomer(input, adminUser)
      ).rejects.toThrow('User ID is required');
    });

    it('should reject empty name on update', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue({ id: '1' });

      await expect(
        service.updateCustomer('1', { name: '   ' }, adminUser)
      ).rejects.toThrow('Customer name cannot be empty');
    });
  });
});
