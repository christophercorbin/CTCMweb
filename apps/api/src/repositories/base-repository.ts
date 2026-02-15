import { QueryResult } from 'pg';
import { query, transaction } from '../lib/database';
import type { UserContext } from '@ctcm/types';

export interface TenantIsolationConfig {
  tableName: string;
  tenantColumn: string; // Column name that stores the tenant ID (e.g., 'customer_id')
}

export interface QueryOptions {
  userContext: UserContext;
  tenantIsolation?: TenantIsolationConfig;
}

/**
 * Base repository class with tenant isolation support
 * All repositories should extend this class to inherit tenant isolation logic
 */
export abstract class BaseRepository {
  /**
   * Applies tenant isolation filter to a WHERE clause
   * Admin users can access all data, customer users are restricted to their tenant
   */
  protected applyTenantFilter(
    whereClause: string,
    params: any[],
    options: QueryOptions
  ): { whereClause: string; params: any[] } {
    const { userContext, tenantIsolation } = options;

    // Admin users bypass tenant isolation
    if (userContext.role === 'admin') {
      return { whereClause, params };
    }

    // Customer users must have a tenantId
    if (!userContext.tenantId) {
      throw new Error('Customer user missing tenantId');
    }

    // Apply tenant isolation if configured
    if (tenantIsolation) {
      const tenantFilter = `${tenantIsolation.tenantColumn} = $${params.length + 1}`;
      const newWhereClause = whereClause
        ? `${whereClause} AND ${tenantFilter}`
        : `WHERE ${tenantFilter}`;
      
      return {
        whereClause: newWhereClause,
        params: [...params, userContext.tenantId],
      };
    }

    return { whereClause, params };
  }

  /**
   * Executes a SELECT query with automatic tenant isolation
   */
  protected async findMany<T>(
    baseQuery: string,
    params: any[],
    options: QueryOptions
  ): Promise<T[]> {
    const { whereClause, params: filteredParams } = this.applyTenantFilter(
      '',
      params,
      options
    );

    const fullQuery = `${baseQuery} ${whereClause}`;
    const result = await query<T>(fullQuery, filteredParams);
    return result.rows;
  }

  /**
   * Executes a SELECT query expecting a single result with tenant isolation
   */
  protected async findOne<T>(
    baseQuery: string,
    params: any[],
    options: QueryOptions
  ): Promise<T | null> {
    const results = await this.findMany<T>(baseQuery, params, options);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Executes an INSERT query with automatic tenant ID injection for customer users
   */
  protected async insert<T>(
    tableName: string,
    data: Record<string, any>,
    options: QueryOptions
  ): Promise<T> {
    const { userContext, tenantIsolation } = options;

    // Inject tenant ID for customer users
    if (userContext.role === 'customer' && tenantIsolation) {
      if (!userContext.tenantId) {
        throw new Error('Customer user missing tenantId');
      }
      data[tenantIsolation.tenantColumn] = userContext.tenantId;
    }

    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const insertQuery = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await query<T>(insertQuery, values);
    return result.rows[0];
  }

  /**
   * Executes an UPDATE query with tenant isolation verification
   */
  protected async update<T>(
    tableName: string,
    id: string,
    data: Record<string, any>,
    options: QueryOptions
  ): Promise<T | null> {
    const { userContext, tenantIsolation } = options;

    // Build SET clause
    const updates = Object.keys(data)
      .map((key, i) => `${key} = $${i + 1}`)
      .join(', ');
    const values = Object.values(data);

    // Build WHERE clause with tenant isolation
    let whereClause = `WHERE id = $${values.length + 1}`;
    let params = [...values, id];

    if (userContext.role === 'customer' && tenantIsolation) {
      if (!userContext.tenantId) {
        throw new Error('Customer user missing tenantId');
      }
      whereClause += ` AND ${tenantIsolation.tenantColumn} = $${params.length + 1}`;
      params.push(userContext.tenantId);
    }

    const updateQuery = `
      UPDATE ${tableName}
      SET ${updates}, updated_at = CURRENT_TIMESTAMP
      ${whereClause}
      RETURNING *
    `;

    const result = await query<T>(updateQuery, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Executes a DELETE query with tenant isolation verification
   */
  protected async delete(
    tableName: string,
    id: string,
    options: QueryOptions
  ): Promise<boolean> {
    const { userContext, tenantIsolation } = options;

    // Build WHERE clause with tenant isolation
    let whereClause = `WHERE id = $1`;
    let params: any[] = [id];

    if (userContext.role === 'customer' && tenantIsolation) {
      if (!userContext.tenantId) {
        throw new Error('Customer user missing tenantId');
      }
      whereClause += ` AND ${tenantIsolation.tenantColumn} = $2`;
      params.push(userContext.tenantId);
    }

    const deleteQuery = `
      DELETE FROM ${tableName}
      ${whereClause}
    `;

    const result = await query(deleteQuery, params);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Verifies that a resource belongs to the user's tenant
   * Throws an error if access is denied
   */
  protected async verifyTenantAccess(
    tableName: string,
    resourceId: string,
    options: QueryOptions
  ): Promise<void> {
    const { userContext, tenantIsolation } = options;

    // Admin users have access to all resources
    if (userContext.role === 'admin') {
      return;
    }

    if (!tenantIsolation) {
      return;
    }

    if (!userContext.tenantId) {
      throw new Error('Customer user missing tenantId');
    }

    const checkQuery = `
      SELECT 1 FROM ${tableName}
      WHERE id = $1 AND ${tenantIsolation.tenantColumn} = $2
    `;

    const result = await query(checkQuery, [resourceId, userContext.tenantId]);

    if (result.rows.length === 0) {
      throw new Error('Access denied: Resource not found or does not belong to your account');
    }
  }

  /**
   * Counts records with tenant isolation
   */
  protected async count(
    tableName: string,
    whereClause: string,
    params: any[],
    options: QueryOptions
  ): Promise<number> {
    const { whereClause: filteredWhere, params: filteredParams } = this.applyTenantFilter(
      whereClause,
      params,
      options
    );

    const countQuery = `
      SELECT COUNT(*) as count
      FROM ${tableName}
      ${filteredWhere}
    `;

    const result = await query<{ count: string }>(countQuery, filteredParams);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Executes a query within a transaction
   */
  protected async executeInTransaction<T>(
    callback: () => Promise<T>
  ): Promise<T> {
    return transaction(async () => {
      return await callback();
    });
  }
}

/**
 * Helper function to extract tenant ID from user context
 * For customer users, tenant ID is their customer ID
 * For admin users, tenant ID is null (access all data)
 */
export function getTenantId(userContext: UserContext): string | undefined {
  if (userContext.role === 'admin') {
    return undefined;
  }
  return userContext.tenantId;
}

/**
 * Helper function to validate user has access to a specific customer
 */
export function validateCustomerAccess(
  userContext: UserContext,
  customerId: string
): void {
  if (userContext.role === 'admin') {
    return; // Admin can access any customer
  }

  if (userContext.tenantId !== customerId) {
    throw new Error('Access denied: You can only access your own customer data');
  }
}
