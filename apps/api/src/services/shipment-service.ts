import { ShipmentRepository } from '../repositories/shipment-repository.js';
import type {
  Shipment,
  CreateShipmentInput,
  UpdateShipmentInput,
  ShipmentFilters,
  UserContext,
} from '@ctcm/types';

export class ShipmentService {
  private repository: ShipmentRepository;

  constructor() {
    this.repository = new ShipmentRepository();
  }

  /**
   * Create a new shipment
   */
  async createShipment(
    input: CreateShipmentInput,
    userContext: UserContext
  ): Promise<Shipment> {
    // Validate customer exists (in a real implementation)
    // For now, we'll trust the input

    return this.repository.create(input, userContext);
  }

  /**
   * Update an existing shipment
   */
  async updateShipment(
    id: string,
    input: UpdateShipmentInput,
    userContext: UserContext
  ): Promise<Shipment | null> {
    return this.repository.updateShipment(id, input, userContext);
  }

  /**
   * Get shipment by ID
   */
  async getShipmentById(id: string, userContext: UserContext): Promise<Shipment | null> {
    return this.repository.findById(id, userContext);
  }

  /**
   * Get all shipments with optional filters
   */
  async getShipments(
    filters: ShipmentFilters,
    userContext: UserContext
  ): Promise<Shipment[]> {
    return this.repository.findWithFilters(filters, userContext);
  }

  /**
   * Get shipment by tracking number
   */
  async getShipmentByTrackingNumber(
    trackingNumber: string,
    userContext: UserContext
  ): Promise<Shipment | null> {
    return this.repository.findByTrackingNumber(trackingNumber, userContext);
  }

  /**
   * Calculate volumetric weight for a package
   */
  calculateVolumetricWeight(lengthCm: number, widthCm: number, heightCm: number): number {
    return this.repository.calculateVolumetricWeight(lengthCm, widthCm, heightCm);
  }

  /**
   * Validate status transition
   */
  validateStatusTransition(currentStatus: string, newStatus: string): boolean {
    return this.repository.validateStatusTransition(currentStatus, newStatus);
  }
}
