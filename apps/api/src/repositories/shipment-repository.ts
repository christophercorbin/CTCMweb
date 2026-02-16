import { BaseRepository } from './base-repository.js';
import type {
  Shipment,
  CreateShipmentInput,
  UpdateShipmentInput,
  ShipmentFilters,
  UserContext,
} from '@ctcm/types';
import type { QueryResultRow } from 'pg';

interface ShipmentRow extends QueryResultRow {
  id: string;
  tracking_number: string;
  warehouse_receipt_number: string | null;
  customer_id: string;
  status: string;
  received_date: string | null;
  shipper_name: string | null;
  shipper_address: string | null;
  consignee_name: string | null;
  consignee_address: string | null;
  carrier_name: string | null;
  carrier_tracking: string | null;
  warehouse_location: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export class ShipmentRepository extends BaseRepository<Shipment, CreateShipmentInput, UpdateShipmentInput> {
  constructor() {
    super('shipments');
  }

  /**
   * Generate a unique tracking number
   * Format: CTCM-YYYYMMDD-XXXX (e.g., CTCM-20260215-0001)
   */
  async generateTrackingNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Find the highest sequence number for today
    const result = await this.db.query<QueryResultRow>(
      `SELECT tracking_number 
       FROM shipments 
       WHERE tracking_number LIKE $1 
       ORDER BY tracking_number DESC 
       LIMIT 1`,
      [`CTCM-${datePrefix}-%`]
    );

    let sequence = 1;
    if (result.rows.length > 0) {
      const lastTracking = result.rows[0].tracking_number as string;
      const lastSequence = parseInt(lastTracking.split('-')[2], 10);
      sequence = lastSequence + 1;
    }

    const sequenceStr = String(sequence).padStart(4, '0');
    return `CTCM-${datePrefix}-${sequenceStr}`;
  }

  /**
   * Validate shipment status transitions
   * Valid transitions:
   * - received -> processing
   * - processing -> ready
   * - ready -> shipped
   * - shipped -> delivered
   */
  validateStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      received: ['processing'],
      processing: ['ready', 'received'], // Allow back to received
      ready: ['shipped', 'processing'], // Allow back to processing
      shipped: ['delivered', 'ready'], // Allow back to ready
      delivered: [], // Final state
    };

    // Allow staying in the same status
    if (currentStatus === newStatus) {
      return true;
    }

    const allowedNextStatuses = validTransitions[currentStatus] || [];
    return allowedNextStatuses.includes(newStatus);
  }

  /**
   * Calculate volumetric weight for a package
   * Formula: (length * width * height) / 5000 (for cm to kg)
   */
  calculateVolumetricWeight(lengthCm: number, widthCm: number, heightCm: number): number {
    const volumetricWeight = (lengthCm * widthCm * heightCm) / 5000;
    return Math.round(volumetricWeight * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Create a new shipment with generated tracking number
   */
  async create(input: CreateShipmentInput, userContext: UserContext): Promise<Shipment> {
    const trackingNumber = await this.generateTrackingNumber();

    const result = await this.db.query<ShipmentRow>(
      `INSERT INTO shipments (
        tracking_number, warehouse_receipt_number, customer_id, status,
        received_date, shipper_name, shipper_address, consignee_name,
        consignee_address, carrier_name, carrier_tracking, warehouse_location,
        description, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        trackingNumber,
        input.warehouseReceiptNumber || null,
        input.customerId,
        'received', // Default status
        input.receivedDate || new Date(),
        input.shipperName || null,
        input.shipperAddress || null,
        input.consigneeName || null,
        input.consigneeAddress || null,
        input.carrierName || null,
        input.carrierTracking || null,
        input.warehouseLocation || null,
        input.description || null,
        input.notes || null,
      ]
    );

    return this.mapRowToEntity(result.rows[0]);
  }

  /**
   * Update a shipment with status transition validation
   */
  async updateShipment(
    id: string,
    input: UpdateShipmentInput,
    userContext: UserContext
  ): Promise<Shipment | null> {
    // If status is being updated, validate the transition
    if (input.status) {
      // Get current shipment to check status
      const currentResult = await this.db.query<ShipmentRow>(
        `SELECT * FROM shipments WHERE id = $1`,
        [id]
      );

      if (currentResult.rows.length === 0) {
        return null;
      }

      const current = this.mapRowToEntity(currentResult.rows[0]);

      if (!this.validateStatusTransition(current.status, input.status)) {
        throw new Error(
          `Invalid status transition from ${current.status} to ${input.status}`
        );
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(input.status);
    }
    if (input.warehouseReceiptNumber !== undefined) {
      updates.push(`warehouse_receipt_number = $${paramIndex++}`);
      values.push(input.warehouseReceiptNumber);
    }
    if (input.receivedDate !== undefined) {
      updates.push(`received_date = $${paramIndex++}`);
      values.push(input.receivedDate);
    }
    if (input.shipperName !== undefined) {
      updates.push(`shipper_name = $${paramIndex++}`);
      values.push(input.shipperName);
    }
    if (input.shipperAddress !== undefined) {
      updates.push(`shipper_address = $${paramIndex++}`);
      values.push(input.shipperAddress);
    }
    if (input.consigneeName !== undefined) {
      updates.push(`consignee_name = $${paramIndex++}`);
      values.push(input.consigneeName);
    }
    if (input.consigneeAddress !== undefined) {
      updates.push(`consignee_address = $${paramIndex++}`);
      values.push(input.consigneeAddress);
    }
    if (input.carrierName !== undefined) {
      updates.push(`carrier_name = $${paramIndex++}`);
      values.push(input.carrierName);
    }
    if (input.carrierTracking !== undefined) {
      updates.push(`carrier_tracking = $${paramIndex++}`);
      values.push(input.carrierTracking);
    }
    if (input.warehouseLocation !== undefined) {
      updates.push(`warehouse_location = $${paramIndex++}`);
      values.push(input.warehouseLocation);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }
    if (input.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(input.notes);
    }

    if (updates.length === 0) {
      // No updates, just return current shipment
      const result = await this.db.query<ShipmentRow>(
        `SELECT * FROM shipments WHERE id = $1`,
        [id]
      );
      return result.rows.length > 0 ? this.mapRowToEntity(result.rows[0]) : null;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await this.db.query<ShipmentRow>(
      `UPDATE shipments 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result.rows[0]);
  }

  /**
   * Find shipments with filters
   */
  async findWithFilters(
    filters: ShipmentFilters,
    userContext: UserContext
  ): Promise<Shipment[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Apply tenant isolation
    if (userContext.role === 'customer' && userContext.tenantId) {
      conditions.push(`customer_id = $${paramIndex++}`);
      values.push(userContext.tenantId);
    }

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters.customerId) {
      conditions.push(`customer_id = $${paramIndex++}`);
      values.push(filters.customerId);
    }

    if (filters.startDate) {
      conditions.push(`received_date >= $${paramIndex++}`);
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`received_date <= $${paramIndex++}`);
      values.push(filters.endDate);
    }

    if (filters.search) {
      conditions.push(
        `(tracking_number ILIKE $${paramIndex} OR warehouse_receipt_number ILIKE $${paramIndex})`
      );
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.db.query<ShipmentRow>(
      `SELECT * FROM shipments ${whereClause} ORDER BY created_at DESC`,
      values
    );

    return result.rows.map((row) => this.mapRowToEntity(row));
  }

  /**
   * Find shipment by tracking number
   */
  async findByTrackingNumber(
    trackingNumber: string,
    userContext: UserContext
  ): Promise<Shipment | null> {
    const tenantFilter =
      userContext.role === 'customer' && userContext.tenantId
        ? 'AND customer_id = $2'
        : '';

    const values =
      userContext.role === 'customer' && userContext.tenantId
        ? [trackingNumber, userContext.tenantId]
        : [trackingNumber];

    const result = await this.db.query<ShipmentRow>(
      `SELECT * FROM shipments WHERE tracking_number = $1 ${tenantFilter}`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result.rows[0]);
  }

  /**
   * Map database row to Shipment entity
   */
  protected mapRowToEntity(row: ShipmentRow): Shipment {
    return {
      id: row.id,
      trackingNumber: row.tracking_number,
      warehouseReceiptNumber: row.warehouse_receipt_number || undefined,
      customerId: row.customer_id,
      status: row.status as Shipment['status'],
      receivedDate: row.received_date ? new Date(row.received_date) : undefined,
      shipperName: row.shipper_name || undefined,
      shipperAddress: row.shipper_address || undefined,
      consigneeName: row.consignee_name || undefined,
      consigneeAddress: row.consignee_address || undefined,
      carrierName: row.carrier_name || undefined,
      carrierTracking: row.carrier_tracking || undefined,
      warehouseLocation: row.warehouse_location || undefined,
      description: row.description || undefined,
      notes: row.notes || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
