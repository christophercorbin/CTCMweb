import { CustomerRepository } from '../repositories/customer-repository';
import type { Customer, CreateCustomerInput, UpdateCustomerInput, UserContext } from '@ctcm/types';

export class CustomerService {
  private repository: CustomerRepository;

  constructor() {
    this.repository = new CustomerRepository();
  }

  /**
   * Validates email format
   */
  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  /**
   * Gets all customers with tenant isolation
   * Admin users see all customers, customer users see only themselves
   */
  async getAllCustomers(userContext: UserContext): Promise<Customer[]> {
    return this.repository.findAll(userContext);
  }

  /**
   * Gets a customer by ID with tenant isolation
   */
  async getCustomerById(id: string, userContext: UserContext): Promise<Customer> {
    const customer = await this.repository.findById(id, userContext);
    
    if (!customer) {
      throw new Error('Customer not found');
    }

    return customer;
  }

  /**
   * Gets a customer by user ID (Cognito sub)
   */
  async getCustomerByUserId(userId: string, userContext: UserContext): Promise<Customer> {
    const customer = await this.repository.findByUserId(userId, userContext);
    
    if (!customer) {
      throw new Error('Customer not found');
    }

    return customer;
  }

  /**
   * Creates a new customer with validation
   */
  async createCustomer(
    input: CreateCustomerInput,
    userContext: UserContext
  ): Promise<Customer> {
    // Only admins can create customers
    if (userContext.role !== 'admin') {
      throw new Error('Only administrators can create customers');
    }

    // Validate email format
    this.validateEmail(input.email);

    // Check email uniqueness
    const emailExists = await this.repository.emailExists(input.email);
    if (emailExists) {
      throw new Error('Email address is already in use');
    }

    // Validate required fields
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Customer name is required');
    }

    if (!input.userId || input.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    return this.repository.create(input, userContext);
  }

  /**
   * Updates a customer with validation and tenant isolation
   */
  async updateCustomer(
    id: string,
    input: UpdateCustomerInput,
    userContext: UserContext
  ): Promise<Customer> {
    // Verify customer exists and user has access
    await this.getCustomerById(id, userContext);

    // Validate email if provided
    if (input.email) {
      this.validateEmail(input.email);

      // Check email uniqueness (excluding current customer)
      const emailExists = await this.repository.emailExists(input.email, id);
      if (emailExists) {
        throw new Error('Email address is already in use');
      }
    }

    // Validate name if provided
    if (input.name !== undefined && input.name.trim().length === 0) {
      throw new Error('Customer name cannot be empty');
    }

    const updated = await this.repository.update(id, input, userContext);
    
    if (!updated) {
      throw new Error('Failed to update customer');
    }

    return updated;
  }

  /**
   * Deletes a customer (admin only)
   */
  async deleteCustomer(id: string, userContext: UserContext): Promise<void> {
    if (userContext.role !== 'admin') {
      throw new Error('Only administrators can delete customers');
    }

    // Verify customer exists
    await this.getCustomerById(id, userContext);

    const deleted = await this.repository.delete(id, userContext);
    
    if (!deleted) {
      throw new Error('Failed to delete customer');
    }
  }

  /**
   * Gets the current user's customer profile
   * For customer users, returns their own profile
   * For admin users, requires explicit customer ID
   */
  async getCurrentCustomer(userContext: UserContext): Promise<Customer> {
    if (userContext.role === 'customer') {
      if (!userContext.tenantId) {
        throw new Error('Customer user missing tenant ID');
      }
      return this.getCustomerById(userContext.tenantId, userContext);
    }

    throw new Error('Admin users must specify a customer ID');
  }
}
