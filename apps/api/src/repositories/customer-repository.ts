import { BaseRepository, QueryOptions } from './base-repository';
import { query } from '../lib/database';
import type { Customer, CreateCustomerInput, UpdateCustomerInput, UserContext } from '@ctcm/types';

export class CustomerRepository extends BaseRepository {
  private readonly tableName = 'customers';
  private readonly tenantColumn = 'id'; // For customers, the tenant is the customer itself

  /**
   * Finds all customers with tenant isolation
   * Admin users see all customers, customer users see only themselves
   */
  async findAll(userContext: UserContext): Promise<Customer[]> {
    const baseQuery = `
      SELECT 
        id, user_id, name, email, phone, company, address,
        air_skybox_address, sea_skybox_address, created_at, updated_at
      FROM ${this.tableName}
    `;

    const options: QueryOptions = {
      userContext,
      tenantIsolation: {
        tableName: this.tableName,
        tenantColumn: this.tenantColumn,
      },
    };

    return this.findMany<Customer>(baseQuery, [], options);
  }

  /**
   * Finds a customer by ID with tenant isolation
   */
  async findById(id: string, userContext: UserContext): Promise<Customer | null> {
    const baseQuery = `
      SELECT 
        id, user_id, name, email, phone, company, address,
        air_skybox_address, sea_skybox_address, created_at, updated_at
      FROM ${this.tableName}
      WHERE id = $1
    `;

    const options: QueryOptions = {
      userContext,
      tenantIsolation: {
        tableName: this.tableName,
        tenantColumn: this.tenantColumn,
      },
    };

    return this.findOne<Customer>(baseQuery, [id], options);
  }

  /**
   * Finds a customer by user ID (Cognito sub)
   */
  async findByUserId(userId: string, userContext: UserContext): Promise<Customer | null> {
    const baseQuery = `
      SELECT 
        id, user_id, name, email, phone, company, address,
        air_skybox_address, sea_skybox_address, created_at, updated_at
      FROM ${this.tableName}
      WHERE user_id = $1
    `;

    const options: QueryOptions = {
      userContext,
      tenantIsolation: {
        tableName: this.tableName,
        tenantColumn: this.tenantColumn,
      },
    };

    return this.findOne<Customer>(baseQuery, [userId], options);
  }

  /**
   * Finds a customer by email
   */
  async findByEmail(email: string): Promise<Customer | null> {
    const findQuery = `
      SELECT 
        id, user_id, name, email, phone, company, address,
        air_skybox_address, sea_skybox_address, created_at, updated_at
      FROM ${this.tableName}
      WHERE email = $1
    `;

    const result = await query<Customer>(findQuery, [email]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Creates a new customer
   */
  async create(input: CreateCustomerInput, _userContext: UserContext): Promise<Customer> {
    const insertQuery = `
      INSERT INTO ${this.tableName} (
        user_id, name, email, phone, company, address,
        air_skybox_address, sea_skybox_address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id, user_id, name, email, phone, company, address,
        air_skybox_address, sea_skybox_address, created_at, updated_at
    `;

    const values = [
      input.userId,
      input.name,
      input.email,
      input.phone || null,
      input.company || null,
      input.address || null,
      input.airSkyboxAddress || null,
      input.seaSkyboxAddress || null,
    ];

    const result = await query<Customer>(insertQuery, values);
    return result.rows[0];
  }

  /**
   * Updates a customer with tenant isolation
   */
  async updateCustomer(
    id: string,
    input: UpdateCustomerInput,
    userContext: UserContext
  ): Promise<Customer | null> {
    // Build dynamic SET clause based on provided fields
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(input.email);
    }
    if (input.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(input.phone);
    }
    if (input.company !== undefined) {
      updates.push(`company = $${paramIndex++}`);
      values.push(input.company);
    }
    if (input.address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(input.address);
    }
    if (input.airSkyboxAddress !== undefined) {
      updates.push(`air_skybox_address = $${paramIndex++}`);
      values.push(input.airSkyboxAddress);
    }
    if (input.seaSkyboxAddress !== undefined) {
      updates.push(`sea_skybox_address = $${paramIndex++}`);
      values.push(input.seaSkyboxAddress);
    }

    if (updates.length === 0) {
      // No fields to update, return existing customer
      return this.findById(id, userContext);
    }

    // Add updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Build WHERE clause with tenant isolation
    let whereClause = `WHERE id = $${paramIndex++}`;
    values.push(id);

    if (userContext.role === 'customer') {
      if (!userContext.tenantId) {
        throw new Error('Customer user missing tenantId');
      }
      whereClause += ` AND id = $${paramIndex++}`;
      values.push(userContext.tenantId);
    }

    const updateQuery = `
      UPDATE ${this.tableName}
      SET ${updates.join(', ')}
      ${whereClause}
      RETURNING 
        id, user_id, name, email, phone, company, address,
        air_skybox_address, sea_skybox_address, created_at, updated_at
    `;

    const result = await query<Customer>(updateQuery, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Deletes a customer (admin only)
   */
  async deleteCustomer(id: string, userContext: UserContext): Promise<boolean> {
    if (userContext.role !== 'admin') {
      throw new Error('Only administrators can delete customers');
    }

    const deleteQuery = `DELETE FROM ${this.tableName} WHERE id = $1`;
    const result = await query(deleteQuery, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Checks if an email is already in use
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    let checkQuery = `SELECT 1 FROM ${this.tableName} WHERE email = $1`;
    const params: unknown[] = [email];

    if (excludeId) {
      checkQuery += ` AND id != $2`;
      params.push(excludeId);
    }

    const result = await query(checkQuery, params);
    return result.rows.length > 0;
  }
}
