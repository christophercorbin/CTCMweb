import { BaseRepository, QueryOptions } from './base-repository';
import { query } from '../lib/database';
import type { Invoice, CreateInvoiceInput, UpdateInvoiceInput, UserContext } from '@ctcm/types';

export interface InvoiceFilters {
  customerId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export class InvoiceRepository extends BaseRepository {
  private readonly tableName = 'invoices';
  private readonly tenantColumn = 'customer_id';

  /**
   * Finds all invoices with tenant isolation and optional filters
   * Admin users see all invoices, customer users see only their own
   */
  async findAll(userContext: UserContext, filters?: InvoiceFilters): Promise<Invoice[]> {
    let baseQuery = `
      SELECT 
        id, customer_id, shipment_id, invoice_number, status,
        subtotal, tax, total, currency,
        issue_date, due_date, paid_date, notes,
        created_at, updated_at
      FROM ${this.tableName}
      WHERE 1=1
    `;

    const params: unknown[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filters?.customerId) {
      baseQuery += ` AND customer_id = $${paramIndex++}`;
      params.push(filters.customerId);
    }

    if (filters?.status) {
      baseQuery += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters?.startDate) {
      baseQuery += ` AND issue_date >= $${paramIndex++}`;
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      baseQuery += ` AND issue_date <= $${paramIndex++}`;
      params.push(filters.endDate);
    }

    baseQuery += ` ORDER BY issue_date DESC`;

    const options: QueryOptions = {
      userContext,
      tenantIsolation: {
        tableName: this.tableName,
        tenantColumn: this.tenantColumn,
      },
    };

    return this.findMany<Invoice>(baseQuery, params, options);
  }

  /**
   * Finds an invoice by ID with tenant isolation
   */
  async findById(id: string, userContext: UserContext): Promise<Invoice | null> {
    const baseQuery = `
      SELECT 
        id, customer_id, shipment_id, invoice_number, status,
        subtotal, tax, total, currency,
        issue_date, due_date, paid_date, notes,
        created_at, updated_at
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

    return this.findOne<Invoice>(baseQuery, [id], options);
  }

  /**
   * Finds an invoice by invoice number
   */
  async findByInvoiceNumber(invoiceNumber: string, userContext: UserContext): Promise<Invoice | null> {
    const baseQuery = `
      SELECT 
        id, customer_id, shipment_id, invoice_number, status,
        subtotal, tax, total, currency,
        issue_date, due_date, paid_date, notes,
        created_at, updated_at
      FROM ${this.tableName}
      WHERE invoice_number = $1
    `;

    const options: QueryOptions = {
      userContext,
      tenantIsolation: {
        tableName: this.tableName,
        tenantColumn: this.tenantColumn,
      },
    };

    return this.findOne<Invoice>(baseQuery, [invoiceNumber], options);
  }

  /**
   * Creates a new invoice
   */
  async create(input: CreateInvoiceInput, _userContext: UserContext): Promise<Invoice> {
    const insertQuery = `
      INSERT INTO ${this.tableName} (
        customer_id, shipment_id, invoice_number, status,
        subtotal, tax, total, currency,
        issue_date, due_date, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING 
        id, customer_id, shipment_id, invoice_number, status,
        subtotal, tax, total, currency,
        issue_date, due_date, paid_date, notes,
        created_at, updated_at
    `;

    const values = [
      input.customerId,
      input.shipmentId || null,
      input.invoiceNumber,
      input.status || 'pending',
      input.subtotal,
      input.tax || 0,
      input.total,
      input.currency || 'USD',
      input.issueDate,
      input.dueDate,
      input.notes || null,
    ];

    const result = await query<Invoice>(insertQuery, values);
    return result.rows[0];
  }

  /**
   * Updates an invoice with tenant isolation
   */
  async updateInvoice(
    id: string,
    input: UpdateInvoiceInput,
    userContext: UserContext
  ): Promise<Invoice | null> {
    // Build dynamic SET clause based on provided fields
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.shipmentId !== undefined) {
      updates.push(`shipment_id = $${paramIndex++}`);
      values.push(input.shipmentId);
    }
    if (input.subtotal !== undefined) {
      updates.push(`subtotal = $${paramIndex++}`);
      values.push(input.subtotal);
    }
    if (input.tax !== undefined) {
      updates.push(`tax = $${paramIndex++}`);
      values.push(input.tax);
    }
    if (input.total !== undefined) {
      updates.push(`total = $${paramIndex++}`);
      values.push(input.total);
    }
    if (input.currency !== undefined) {
      updates.push(`currency = $${paramIndex++}`);
      values.push(input.currency);
    }
    if (input.issueDate !== undefined) {
      updates.push(`issue_date = $${paramIndex++}`);
      values.push(input.issueDate);
    }
    if (input.dueDate !== undefined) {
      updates.push(`due_date = $${paramIndex++}`);
      values.push(input.dueDate);
    }
    if (input.paidDate !== undefined) {
      updates.push(`paid_date = $${paramIndex++}`);
      values.push(input.paidDate);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(input.status);
    }
    if (input.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(input.notes);
    }

    if (updates.length === 0) {
      // No fields to update, return existing invoice
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
      whereClause += ` AND customer_id = $${paramIndex++}`;
      values.push(userContext.tenantId);
    }

    const updateQuery = `
      UPDATE ${this.tableName}
      SET ${updates.join(', ')}
      ${whereClause}
      RETURNING 
        id, customer_id, shipment_id, invoice_number, status,
        subtotal, tax, total, currency,
        issue_date, due_date, paid_date, notes,
        created_at, updated_at
    `;

    const result = await query<Invoice>(updateQuery, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Checks if an invoice number is already in use
   */
  async invoiceNumberExists(invoiceNumber: string, excludeId?: string): Promise<boolean> {
    let checkQuery = `SELECT 1 FROM ${this.tableName} WHERE invoice_number = $1`;
    const params: unknown[] = [invoiceNumber];

    if (excludeId) {
      checkQuery += ` AND id != $2`;
      params.push(excludeId);
    }

    const result = await query(checkQuery, params);
    return result.rows.length > 0;
  }
}
