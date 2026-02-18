// Enums
export type ShipmentStatus = 'received' | 'processing' | 'ready' | 'shipped' | 'delivered'
export type PackageType = 'box' | 'pallet' | 'crate' | 'envelope' | 'other'
export type ChargeType = 'freight' | 'handling' | 'storage' | 'customs' | 'insurance' | 'other'
export type InvoiceStatus = 'pending' | 'paid' | 'overdue'
export type DocumentType = 'invoice' | 'receipt' | 'customs_document' | 'packing_list'
export type UserRole = 'admin' | 'customer'

// Customer Types
export interface Customer {
  id: string
  userId: string // Cognito sub
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
  airSkyboxAddress?: string
  seaSkyboxAddress?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateCustomerInput {
  userId: string
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
  airSkyboxAddress?: string
  seaSkyboxAddress?: string
}

export interface UpdateCustomerInput {
  name?: string
  email?: string
  phone?: string
  company?: string
  address?: string
  airSkyboxAddress?: string
  seaSkyboxAddress?: string
}

// Shipment Types
export interface Shipment {
  id: string
  trackingNumber: string
  warehouseReceiptNumber?: string
  customerId: string
  status: ShipmentStatus
  receivedDate?: Date
  shipperName?: string
  shipperAddress?: string
  consigneeName?: string
  consigneeAddress?: string
  carrierName?: string
  carrierTracking?: string
  warehouseLocation?: string
  description?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface ShipmentDetails extends Shipment {
  customer: Customer
  packages: Package[]
  charges: ShipmentCharge[]
  events: ShipmentEvent[]
}

export interface CreateShipmentInput {
  customerId: string
  warehouseReceiptNumber?: string
  receivedDate?: Date
  shipperName?: string
  shipperAddress?: string
  consigneeName?: string
  consigneeAddress?: string
  carrierName?: string
  carrierTracking?: string
  warehouseLocation?: string
  description?: string
  notes?: string
}

export interface UpdateShipmentInput {
  status?: ShipmentStatus
  warehouseReceiptNumber?: string
  receivedDate?: Date
  shipperName?: string
  shipperAddress?: string
  consigneeName?: string
  consigneeAddress?: string
  carrierName?: string
  carrierTracking?: string
  warehouseLocation?: string
  description?: string
  notes?: string
}

export interface ShipmentFilters {
  status?: ShipmentStatus
  customerId?: string
  startDate?: Date
  endDate?: Date
  search?: string
}

// Package Types
export interface Package {
  id: string
  shipmentId: string
  piecesCount: number
  packageType?: PackageType
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  weightKg?: number
  volumetricWeightKg?: number
  description?: string
  storageLocation?: string
  invoiceNumber?: string
  poNumber?: string
  partNumber?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreatePackageInput {
  shipmentId: string
  piecesCount: number
  packageType?: PackageType
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  weightKg?: number
  description?: string
  storageLocation?: string
  invoiceNumber?: string
  poNumber?: string
  partNumber?: string
}

export interface UpdatePackageInput {
  piecesCount?: number
  packageType?: PackageType
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  weightKg?: number
  description?: string
  storageLocation?: string
  invoiceNumber?: string
  poNumber?: string
  partNumber?: string
}

// Shipment Charge Types
export interface ShipmentCharge {
  id: string
  shipmentId: string
  chargeType: ChargeType
  amount: number
  currency: string
  description?: string
  createdAt: Date
}

export interface CreateChargeInput {
  shipmentId: string
  chargeType: ChargeType
  amount: number
  currency?: string
  description?: string
}

export interface UpdateChargeInput {
  chargeType?: ChargeType
  amount?: number
  currency?: string
  description?: string
}

// Shipment Event Types
export interface ShipmentEvent {
  id: string
  shipmentId: string
  eventType: string
  eventDescription: string
  location?: string
  operationDetails?: Record<string, any>
  createdBy: string // Cognito sub
  createdAt: Date
}

export interface CreateEventInput {
  shipmentId: string
  eventType: string
  eventDescription: string
  location?: string
  operationDetails?: Record<string, any>
}

// Invoice Types
export interface Invoice {
  id: string
  customerId: string
  shipmentId?: string
  invoiceNumber: string
  status: InvoiceStatus
  subtotal: number
  tax: number
  total: number
  currency: string
  issueDate: Date
  dueDate: Date
  paidDate?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateInvoiceInput {
  customerId: string
  shipmentId?: string
  invoiceNumber: string
  subtotal: number
  tax?: number
  total: number
  currency?: string
  issueDate: Date
  dueDate: Date
  status?: InvoiceStatus
  notes?: string
}

export interface UpdateInvoiceInput {
  shipmentId?: string
  subtotal?: number
  tax?: number
  total?: number
  currency?: string
  issueDate?: Date
  dueDate?: Date
  paidDate?: Date
  status?: InvoiceStatus
  notes?: string
}

// Document Types
export interface Document {
  id: string
  customerId: string
  shipmentId?: string
  documentType: DocumentType
  s3Key: string
  s3Bucket: string
  filename: string
  fileSizeBytes?: number
  mimeType?: string
  uploadedBy: string // Cognito sub
  createdAt: Date
}

export interface UploadDocumentInput {
  customerId: string
  shipmentId?: string
  documentType: DocumentType
  filename: string
  mimeType: string
}

export interface UploadDocumentResponse {
  documentId: string
  uploadUrl: string // Presigned S3 URL
  expiresIn: number // Seconds
}

export interface DocumentMetadata {
  customerId: string
  shipmentId?: string
  documentType: DocumentType
}

// OCR Types
export interface OCRResult {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  extractedData?: {
    trackingNumber?: string
    warehouseReceiptNumber?: string
    receivedDate?: string
    shipperName?: string
    shipperAddress?: string
    consigneeName?: string
    consigneeAddress?: string
    packages?: Array<{
      piecesCount?: number
      weightKg?: number
      dimensions?: string
    }>
  }
  rawText?: string
  confidence?: number
  error?: string
  createdAt: Date
  completedAt?: Date
}

// Authentication Types
export interface UserContext {
  sub: string // Cognito user ID
  email: string
  role: UserRole
  tenantId?: string // Only for customer users
  groups: string[]
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  idToken: string
  expiresIn: number
}

// API Response Types
export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  metadata: {
    timestamp: string
    requestId: string
  }
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, any>
  }
  metadata: {
    timestamp: string
    requestId: string
  }
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

// Pagination Types
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Search Types
export interface SearchParams {
  query: string
  filters?: ShipmentFilters
  pagination?: PaginationParams
}

export interface SearchResult {
  shipments: Shipment[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}
