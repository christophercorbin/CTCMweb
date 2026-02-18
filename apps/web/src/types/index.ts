export type UserRole = 'admin' | 'customer';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export type ShipmentStatus =
  | 'pending'
  | 'received'
  | 'miami_warehouse'
  | 'in_the_air'
  | 'in_transit'
  | 'in_barbados'
  | 'customs_hold'
  | 'customs_clearance'
  | 'customs_cleared'
  | 'at_warehouse'
  | 'on_the_water'
  | 'in_barbados_sea'
  | 'barbados_customs'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'delayed'
  | 'departed'
  | 'arrived';

export type ShippingMethod = 'air' | 'sea';
export type DeliveryMethod = 'pickup' | 'home_delivery';
export type PackageType = 'box' | 'bag' | 'pallet' | 'crate' | 'envelope' | 'other';
export type ChargeType = 'freight' | 'handling' | 'storage' | 'insurance' | 'customs' | 'fuel' | 'other';

export interface Shipment {
  id: string;
  tracking_number: string;
  warehouse_receipt_number?: string;
  customer_id: string;
  customer_name?: string;

  status: ShipmentStatus;
  received_date?: string;
  received_by?: string;
  created_at: string;
  updated_at: string;

  shipper_name?: string;
  shipper_address?: string;
  shipper_city?: string;
  shipper_state?: string;
  shipper_country?: string;
  shipper_zip?: string;

  consignee_name?: string;
  consignee_contact?: string;
  consignee_address?: string;
  consignee_city?: string;
  consignee_state?: string;
  consignee_country?: string;
  consignee_zip?: string;
  consignee_email?: string;
  consignee_phone?: string;

  carrier_name?: string;
  pro_number?: string;
  driver_name?: string;
  driver_license?: string;

  supplier?: string;
  invoice_number?: string;
  po_number?: string;
  transaction_guid?: string;

  warehouse_location?: string;
  description?: string;
  notes?: string;

  packages?: Package[];
  charges?: ShipmentCharge[];
  events?: ShipmentEvent[];
}

export interface ShipmentDetails extends Shipment {
  customer?: Customer;
  packages: Package[];
  charges: ShipmentCharge[];
  events: ShipmentEvent[];
}

export interface Package {
  id: string;
  shipment_id: string;
  pieces_count: number;
  package_type: PackageType;

  length?: number;
  width?: number;
  height?: number;
  dimension_unit: string;

  weight?: number;
  weight_unit: string;
  weight_kg?: number;
  volumetric_weight?: number;

  volume?: number;
  volume_unit: string;

  description?: string;
  storage_location?: string;

  invoice_number?: string;
  po_number?: string;
  part_number?: string;
  model?: string;
  serial_number?: string;
  lot_number?: string;
  expiration_date?: string;

  created_at: string;
}

export interface ShipmentCharge {
  id: string;
  shipment_id: string;
  charge_type: ChargeType;
  amount: number;
  currency: string;
  description?: string;
  notes?: string;
  created_at: string;
}

export interface ShipmentEvent {
  id: string;
  shipment_id: string;
  event_type: string;
  event_description?: string;
  location?: string;
  operation_details?: string;
  created_by?: string;
  created_at: string;
}

export interface TrackingItem {
  status: ShipmentStatus;
  location: string;
  timestamp: string;
  notes: string;
}

export interface InvoiceDocument {
  id: string;
  shipment_id: number;
  filename: string;
  created_at: string;
}

export type InvoiceStatus = 'pending' | 'paid' | 'overdue';
export type InvoiceType = 'shipping' | 'customs' | 'delivery';

export interface BillingInvoice {
  id: number;
  shipment_id: number;
  tracking_number: string;
  invoice_number: string;
  type: InvoiceType;
  amount: number;
  status: InvoiceStatus;
  due_date: string;
  paid_date?: string;
  description: string;
  created_at: string;
}

export interface StatusUpdatePayload {
  status: ShipmentStatus;
  reason?: string;
}

export interface ApiError {
  message: string;
  status?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  air_skybox_address: string;
  sea_skybox_address: string;
  created_at: string;
  updated_at: string;
}

export type DocumentType = 'invoice' | 'receipt' | 'customs_document' | 'packing_list';

export interface Document {
  id: string;
  customer_id: string;
  shipment_id?: string;
  document_type: DocumentType;
  s3_key: string;
  s3_bucket: string;
  filename: string;
  file_size_bytes?: number;
  mime_type?: string;
  uploaded_by: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  customer_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  due_date: string;
  status: InvoiceStatus;
  created_at: string;
  updated_at: string;
}
