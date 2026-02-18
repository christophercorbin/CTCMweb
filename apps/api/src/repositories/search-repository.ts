import { BaseRepository } from './base-repository';
import { query } from '../lib/database';
import type { Shipment, UserContext } from '@ctcm/types';
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
  customer_name?: string;
  rank?: number;
}

/**
 * Repository for full-text search operations
 * Uses PostgreSQL's tsvector and ts_rank for relevance scoring
 */
export class SearchRepository extends BaseRepository {
  constructor() {
    super();
  }

  /**
   * Search shipments using full-text search
   * Searches across:
   * - Tracking number (highest weight)
   * - Warehouse receipt number (highest weight)
   * - Customer name (medium weight)
   * - Description (lower weight)
   * - Shipper name (lower weight)
   */
  async searchShipments(
    searchQuery: string,
    limit: number,
    offset: number,
    userContext: UserContext
  ): Promise<{ shipments: Shipment[]; total: number }> {
    // Build the WHERE clause for tenant isolation
    const tenantCondition =
      userContext.role === 'customer' && userContext.tenantId
        ? 'AND s.customer_id = $2'
        : '';

    // Prepare query parameters
    const params: unknown[] = [searchQuery];
    let paramIndex = 2;

    if (userContext.role === 'customer' && userContext.tenantId) {
      params.push(userContext.tenantId);
      paramIndex++;
    }

    params.push(limit);
    const limitParam = `$${paramIndex++}`;
    params.push(offset);
    const offsetParam = `$${paramIndex}`;

    // Use full-text search with ts_rank for relevance scoring
    // Also search customer name using ILIKE for partial matches
    const searchSql = `
      SELECT 
        s.*,
        c.name as customer_name,
        ts_rank(s.search_vector, plainto_tsquery('english', $1)) as rank
      FROM shipments s
      INNER JOIN customers c ON s.customer_id = c.id
      WHERE (
        s.search_vector @@ plainto_tsquery('english', $1)
        OR s.tracking_number ILIKE '%' || $1 || '%'
        OR s.warehouse_receipt_number ILIKE '%' || $1 || '%'
        OR c.name ILIKE '%' || $1 || '%'
      )
      ${tenantCondition}
      ORDER BY rank DESC, s.created_at DESC
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
    `;

    // Get total count for pagination
    const countSql = `
      SELECT COUNT(*) as total
      FROM shipments s
      INNER JOIN customers c ON s.customer_id = c.id
      WHERE (
        s.search_vector @@ plainto_tsquery('english', $1)
        OR s.tracking_number ILIKE '%' || $1 || '%'
        OR s.warehouse_receipt_number ILIKE '%' || $1 || '%'
        OR c.name ILIKE '%' || $1 || '%'
      )
      ${tenantCondition}
    `;

    // Execute both queries
    const countParams =
      userContext.role === 'customer' && userContext.tenantId
        ? [searchQuery, userContext.tenantId]
        : [searchQuery];

    const [searchResult, countResult] = await Promise.all([
      query<ShipmentRow>(searchSql, params),
      query<{ total: string }>(countSql, countParams),
    ]);

    const shipments = searchResult.rows.map((row) => this.mapRowToEntity(row));
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    return { shipments, total };
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
