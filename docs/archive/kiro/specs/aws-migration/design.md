# Design Document: AWS Migration for Freight Forwarding Management System

## Overview

This design document outlines the architecture for migrating a production freight forwarding management system from Supabase to AWS infrastructure. The migration follows a phased approach to minimize risk while maintaining all existing functionality.

### Design Philosophy

The design prioritizes:
1. **Cost Efficiency**: Stay within $15/month development budget through serverless-first architecture
2. **Security**: Implement AWS security best practices with encryption, least privilege, and tenant isolation
3. **Incremental Migration**: Phased approach allows validation at each step with rollback capability
4. **Operational Excellence**: Infrastructure as Code, automated CI/CD, comprehensive observability
5. **Scalability**: Architecture supports future growth to production workloads

### Key Architectural Decisions

**Decision 1: Database Choice - RDS PostgreSQL t4g.micro**
- **Rationale**: Aurora Serverless v2 minimum cost (~$43/month at 0.5 ACU) exceeds budget. RDS t4g.micro ($15/month) provides PostgreSQL compatibility with predictable costs.
- **Tradeoff**: Less auto-scaling capability, but sufficient for development workload. Can upgrade to Aurora for production.

**Decision 2: API Architecture - API Gateway REST + Lambda**
- **Rationale**: REST API is simpler than GraphQL for this use case. Lambda provides pay-per-request pricing ideal for development.
- **Tradeoff**: More boilerplate than AppSync, but better cost control and flexibility.

**Decision 3: Real-Time Updates - EventBridge + Polling**
- **Rationale**: WebSocket connections ($1/million messages) and AppSync subscriptions ($2/million minutes) add complexity. EventBridge + short polling is simpler for development.
- **Tradeoff**: Not true real-time (5-10 second delay), but acceptable for development. Can upgrade to WebSockets for production.

**Decision 4: Phased Migration - Keep Supabase Initially**
- **Rationale**: Phase 1 hosts frontend on AWS while keeping Supabase backend, reducing initial migration risk and cost.
- **Tradeoff**: Temporary dual infrastructure, but allows validation before full migration.


## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  CloudFront CDN (E34Q2E7TZIYZAB)                                │
│  - Global edge locations                                         │
│  - TLS termination                                               │
│  - Cache static assets                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  S3 Bucket (Frontend)                                            │
│  - React build artifacts                                         │
│  - Versioning enabled                                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  API Gateway (REST)                                              │
│  - JWT authorizer                                                │
│  - Request validation                                            │
│  - Rate limiting                                                 │
│  - CORS configuration                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Lambda Functions (Node.js/TypeScript)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Customers   │  │  Shipments   │  │  Documents   │          │
│  │  Handler     │  │  Handler     │  │  Handler     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Invoices    │  │  Search      │  │  Events      │          │
│  │  Handler     │  │  Handler     │  │  Handler     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  RDS PostgreSQL (t4g.micro)                                      │
│  - Multi-AZ for production                                       │
│  - Automated backups (7-day retention)                           │
│  - Encryption at rest (KMS)                                      │
│  - Security group: Lambda only                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Cognito User Pool                                               │
│  - User groups: admin, customer                                  │
│  - JWT token issuance                                            │
│  - Password policies                                             │
│  - MFA support (production)                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  OCR Pipeline                                                    │
│  S3 Upload → Lambda Trigger → Textract → Step Functions         │
│  → Parse Results → Store in RDS                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Document Storage (S3)                                           │
│  - Presigned URLs (15-min expiry)                                │
│  - Lifecycle policies (Glacier after 90 days)                    │
│  - Versioning enabled                                            │
│  - Encryption at rest (KMS)                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Observability                                                   │
│  - CloudWatch Logs (14-day retention)                            │
│  - CloudWatch Metrics & Alarms                                   │
│  - X-Ray tracing                                                 │
│  - Cost anomaly detection                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Network Architecture

**Development Environment:**
- No VPC required initially (Lambda, RDS can use default VPC)
- RDS in private subnet with security group allowing Lambda access only
- No NAT Gateway (cost savings)
- VPC endpoints for S3 and DynamoDB if needed ($7/month each)

**Production Environment (Future):**
- Custom VPC with public and private subnets across 2 AZs
- NAT Gateway for Lambda internet access
- VPC endpoints for AWS services
- Network ACLs for additional security layer

### Security Architecture

**Authentication Flow:**
1. User submits credentials to Cognito
2. Cognito validates and returns JWT tokens (access + refresh)
3. Frontend stores tokens securely (httpOnly cookies or secure storage)
4. Frontend includes access token in API requests (Authorization header)
5. API Gateway validates JWT signature and claims
6. Lambda extracts user identity and group from token
7. Lambda enforces tenant isolation in database queries

**Authorization Model:**
- **Admin users**: Full access to all resources across all tenants
- **Customer users**: Access restricted to their tenant_id only
- Application-layer enforcement (no RLS in RDS)
- Every query includes WHERE customer_id = :tenant_id for customer users

**Data Protection:**
- All data encrypted at rest using AWS KMS
- All data encrypted in transit using TLS 1.2+
- Database credentials stored in Secrets Manager
- API keys and secrets in Secrets Manager
- Presigned URLs for time-limited document access


## Components and Interfaces

### Frontend Application

**Technology Stack:**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- Axios for API calls
- JWT decode for token handling

**Key Components:**
- Authentication: Login, Register, Password Reset
- Customer Dashboard: Shipment list, shipment details, document viewer
- Admin Dashboard: Customer management, shipment management, receipt intake
- Shared: Navigation, search, notifications

**API Client Interface:**
```typescript
interface ApiClient {
  // Authentication
  login(email: string, password: string): Promise<AuthTokens>
  refreshToken(refreshToken: string): Promise<AuthTokens>
  
  // Customers
  getCustomers(): Promise<Customer[]>
  getCustomer(id: string): Promise<Customer>
  createCustomer(data: CreateCustomerInput): Promise<Customer>
  updateCustomer(id: string, data: UpdateCustomerInput): Promise<Customer>
  
  // Shipments
  getShipments(filters?: ShipmentFilters): Promise<Shipment[]>
  getShipment(id: string): Promise<ShipmentDetails>
  createShipment(data: CreateShipmentInput): Promise<Shipment>
  updateShipment(id: string, data: UpdateShipmentInput): Promise<Shipment>
  
  // Documents
  uploadDocument(file: File, metadata: DocumentMetadata): Promise<Document>
  getDocumentUrl(id: string): Promise<string> // Returns presigned URL
  
  // OCR
  processReceipt(file: File): Promise<OCRResult>
  
  // Search
  searchShipments(query: string): Promise<Shipment[]>
}
```

### API Gateway

**REST API Endpoints:**

**Authentication:**
- POST /auth/login - Handled by Cognito (via SDK)
- POST /auth/refresh - Handled by Cognito (via SDK)
- POST /auth/forgot-password - Handled by Cognito (via SDK)

**Customers:**
- GET /customers - List customers (admin: all, customer: self only)
- GET /customers/:id - Get customer details
- POST /customers - Create customer (admin only)
- PUT /customers/:id - Update customer (admin only)

**Shipments:**
- GET /shipments - List shipments with filters
- GET /shipments/:id - Get shipment details with packages and charges
- POST /shipments - Create shipment (admin only)
- PUT /shipments/:id - Update shipment (admin only)
- GET /shipments/:id/events - Get shipment timeline

**Packages:**
- POST /shipments/:shipmentId/packages - Add package
- PUT /packages/:id - Update package
- DELETE /packages/:id - Delete package

**Charges:**
- POST /shipments/:shipmentId/charges - Add charge
- PUT /charges/:id - Update charge
- DELETE /charges/:id - Delete charge

**Invoices:**
- GET /invoices - List invoices
- GET /invoices/:id - Get invoice details
- POST /invoices - Create invoice (admin only)
- PUT /invoices/:id - Update invoice (admin only)

**Documents:**
- POST /documents/upload - Upload document, returns presigned URL for S3 upload
- GET /documents/:id - Get presigned URL for download
- GET /documents - List documents for shipment or customer

**OCR:**
- POST /ocr/process - Upload receipt, trigger OCR pipeline
- GET /ocr/jobs/:jobId - Get OCR job status and results

**Search:**
- GET /search?q=:query - Search shipments by tracking number, receipt number, or description

**Request/Response Format:**
```typescript
// Request headers
Authorization: Bearer <jwt_token>
Content-Type: application/json

// Success response
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2026-02-11T10:00:00Z",
    "requestId": "uuid"
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { ... }
  },
  "metadata": {
    "timestamp": "2026-02-11T10:00:00Z",
    "requestId": "uuid"
  }
}
```

### Lambda Functions

**Architecture Pattern:**
- One Lambda function per resource domain (customers, shipments, documents, etc.)
- Each function handles multiple HTTP methods via routing
- Shared middleware for authentication, authorization, logging, error handling
- Database connection pooling with connection reuse

**Common Lambda Structure:**
```typescript
// Handler entry point
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract JWT claims (already validated by API Gateway)
    const user = extractUserFromEvent(event)
    
    // Route to appropriate handler
    const result = await routeRequest(event, user)
    
    // Return success response
    return formatSuccessResponse(result)
  } catch (error) {
    // Log error
    logger.error('Request failed', { error, event })
    
    // Return error response
    return formatErrorResponse(error)
  }
}

// Tenant isolation middleware
const enforceTenantIsolation = (user: User, query: any) => {
  if (user.group === 'customer') {
    query.customer_id = user.tenant_id
  }
  // Admin users get no filter (access all tenants)
}
```

**Environment Variables:**
- DATABASE_SECRET_ARN - Secrets Manager ARN for DB credentials
- DOCUMENT_BUCKET_NAME - S3 bucket for documents
- COGNITO_USER_POOL_ID - User pool identifier
- LOG_LEVEL - Logging verbosity

### Database Schema

**Customers Table:**
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) UNIQUE NOT NULL, -- Cognito user sub
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  company VARCHAR(255),
  address TEXT,
  air_skybox_address TEXT,
  sea_skybox_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_email ON customers(email);
```

**Shipments Table:**
```sql
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number VARCHAR(100) UNIQUE NOT NULL,
  warehouse_receipt_number VARCHAR(100),
  customer_id UUID NOT NULL REFERENCES customers(id),
  status VARCHAR(50) NOT NULL CHECK (status IN ('received', 'processing', 'ready', 'shipped', 'delivered')),
  received_date DATE,
  shipper_name VARCHAR(255),
  shipper_address TEXT,
  consignee_name VARCHAR(255),
  consignee_address TEXT,
  carrier_name VARCHAR(255),
  carrier_tracking VARCHAR(100),
  warehouse_location VARCHAR(100),
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shipments_customer_id ON shipments(customer_id);
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_received_date ON shipments(received_date);
```

**Packages Table:**
```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  pieces_count INTEGER NOT NULL,
  package_type VARCHAR(50) CHECK (package_type IN ('box', 'pallet', 'crate', 'envelope', 'other')),
  length_cm DECIMAL(10, 2),
  width_cm DECIMAL(10, 2),
  height_cm DECIMAL(10, 2),
  weight_kg DECIMAL(10, 2),
  volumetric_weight_kg DECIMAL(10, 2),
  description TEXT,
  storage_location VARCHAR(100),
  invoice_number VARCHAR(100),
  po_number VARCHAR(100),
  part_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_packages_shipment_id ON packages(shipment_id);
```

**Shipment Charges Table:**
```sql
CREATE TABLE shipment_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  charge_type VARCHAR(50) NOT NULL CHECK (charge_type IN ('freight', 'handling', 'storage', 'customs', 'insurance', 'other')),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_charges_shipment_id ON shipment_charges(shipment_id);
```

**Shipment Events Table:**
```sql
CREATE TABLE shipment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_description TEXT NOT NULL,
  location VARCHAR(255),
  operation_details JSONB,
  created_by VARCHAR(255), -- Cognito user sub
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_shipment_id ON shipment_events(shipment_id);
CREATE INDEX idx_events_created_at ON shipment_events(created_at DESC);
```

**Invoices Table:**
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  due_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
```

**Documents Table:**
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  shipment_id UUID REFERENCES shipments(id) ON DELETE SET NULL,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('invoice', 'receipt', 'customs_document', 'packing_list')),
  s3_key VARCHAR(500) NOT NULL,
  s3_bucket VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_size_bytes INTEGER,
  mime_type VARCHAR(100),
  uploaded_by VARCHAR(255), -- Cognito user sub
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_customer_id ON documents(customer_id);
CREATE INDEX idx_documents_shipment_id ON documents(shipment_id);
```

**Full-Text Search:**
```sql
-- Add tsvector column for full-text search
ALTER TABLE shipments ADD COLUMN search_vector tsvector;

-- Create trigger to update search vector
CREATE OR REPLACE FUNCTION shipments_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.tracking_number, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.warehouse_receipt_number, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shipments_search_update
  BEFORE INSERT OR UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION shipments_search_trigger();

-- Create GIN index for fast full-text search
CREATE INDEX idx_shipments_search ON shipments USING GIN(search_vector);
```

### Cognito User Pool

**Configuration:**
- User pool name: ctcm-dev-users
- Sign-in options: Email
- Password policy: Minimum 8 characters, require uppercase, lowercase, numbers
- MFA: Optional for development, required for admin in production
- Account recovery: Email only

**User Groups:**
- **admin**: Full system access
- **customer**: Tenant-isolated access

**User Attributes:**
- email (required, used for sign-in)
- name (optional)
- custom:tenant_id (custom attribute for customer users)
- custom:role (admin or customer)

**JWT Token Claims:**
```json
{
  "sub": "uuid",
  "email": "user@example.com",
  "cognito:groups": ["customer"],
  "custom:tenant_id": "customer-uuid",
  "custom:role": "customer",
  "exp": 1234567890,
  "iat": 1234567890
}
```

### OCR Pipeline

**Step Functions Workflow:**
```
1. Start
2. Invoke Textract (DetectDocumentText or AnalyzeDocument)
3. Wait for Textract completion (async job)
4. Parse Textract results
5. Extract shipment fields (tracking number, dates, weights, etc.)
6. Validate extracted data
7. Store results in RDS
8. Send notification (SNS or EventBridge)
9. End
```

**Lambda Functions:**
- **ocr-trigger**: Receives S3 upload event, starts Step Functions
- **ocr-parse**: Parses Textract JSON output into structured data
- **ocr-validate**: Validates extracted fields
- **ocr-store**: Stores results in database

**Textract Configuration:**
- API: DetectDocumentText (cheaper, $1.50 per 1000 pages)
- Async processing for documents > 1 page
- Results stored in S3 for audit trail


## Data Models

### TypeScript Interfaces

**Customer:**
```typescript
interface Customer {
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

interface CreateCustomerInput {
  userId: string
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
  airSkyboxAddress?: string
  seaSkyboxAddress?: string
}
```

**Shipment:**
```typescript
type ShipmentStatus = 'received' | 'processing' | 'ready' | 'shipped' | 'delivered'

interface Shipment {
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

interface ShipmentDetails extends Shipment {
  customer: Customer
  packages: Package[]
  charges: ShipmentCharge[]
  events: ShipmentEvent[]
}

interface CreateShipmentInput {
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
```

**Package:**
```typescript
type PackageType = 'box' | 'pallet' | 'crate' | 'envelope' | 'other'

interface Package {
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

interface CreatePackageInput {
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
```

**Shipment Charge:**
```typescript
type ChargeType = 'freight' | 'handling' | 'storage' | 'customs' | 'insurance' | 'other'

interface ShipmentCharge {
  id: string
  shipmentId: string
  chargeType: ChargeType
  amount: number
  currency: string
  description?: string
  createdAt: Date
}

interface CreateChargeInput {
  shipmentId: string
  chargeType: ChargeType
  amount: number
  currency?: string
  description?: string
}
```

**Shipment Event:**
```typescript
interface ShipmentEvent {
  id: string
  shipmentId: string
  eventType: string
  eventDescription: string
  location?: string
  operationDetails?: Record<string, any>
  createdBy: string // Cognito sub
  createdAt: Date
}

interface CreateEventInput {
  shipmentId: string
  eventType: string
  eventDescription: string
  location?: string
  operationDetails?: Record<string, any>
}
```

**Invoice:**
```typescript
type InvoiceStatus = 'pending' | 'paid' | 'overdue'

interface Invoice {
  id: string
  customerId: string
  invoiceNumber: string
  amount: number
  currency: string
  dueDate: Date
  status: InvoiceStatus
  createdAt: Date
  updatedAt: Date
}

interface CreateInvoiceInput {
  customerId: string
  invoiceNumber: string
  amount: number
  currency?: string
  dueDate: Date
  status?: InvoiceStatus
}
```

**Document:**
```typescript
type DocumentType = 'invoice' | 'receipt' | 'customs_document' | 'packing_list'

interface Document {
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

interface UploadDocumentInput {
  customerId: string
  shipmentId?: string
  documentType: DocumentType
  filename: string
  mimeType: string
}

interface UploadDocumentResponse {
  documentId: string
  uploadUrl: string // Presigned S3 URL
  expiresIn: number // Seconds
}
```

**OCR Result:**
```typescript
interface OCRResult {
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
```

**User Context:**
```typescript
interface UserContext {
  sub: string // Cognito user ID
  email: string
  role: 'admin' | 'customer'
  tenantId?: string // Only for customer users
  groups: string[]
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies:
- Properties 4.5 and 4.7 both test customer tenant isolation - combined into single property
- Properties 9.5 and 9.6 both test document tenant isolation - combined into single property
- Multiple properties test tenant isolation across different resources - these are variations, not duplicates, so kept separate

### Authentication and Authorization Properties

**Property 1: User registration assigns correct group**
*For any* user registration with a specified role (admin or customer), the Auth_Service should assign the user to the corresponding Cognito user group.
**Validates: Requirements 2.3**

**Property 2: JWT tokens contain group membership**
*For any* authenticated user, the issued JWT token should contain the user's group membership in the cognito:groups claim.
**Validates: Requirements 2.4**

**Property 3: Access token expiry is 15 minutes**
*For any* successful authentication, the access token expiry (exp claim) should be 15 minutes (900 seconds) from the issued-at time (iat claim).
**Validates: Requirements 2.5**

**Property 4: Refresh token expiry is 7 days**
*For any* successful authentication, the refresh token expiry should be 7 days (604800 seconds) from the issued-at time.
**Validates: Requirements 2.6**

**Property 5: Password complexity validation**
*For any* password submission, if it does not meet complexity requirements (minimum 8 characters, uppercase, lowercase, numbers), the Auth_Service should reject it with a validation error.
**Validates: Requirements 2.7**

**Property 6: JWT signature validation**
*For any* API request with a JWT token, if the token signature is invalid or the token is expired, the API_Layer should return 401 Unauthorized.
**Validates: Requirements 4.2, 4.3**

**Property 7: User context extraction from JWT**
*For any* valid JWT token, the extracted UserContext should match the token's sub, email, cognito:groups, and custom:tenant_id claims.
**Validates: Requirements 4.4**

### Tenant Isolation Properties

**Property 8: Customer user query filtering**
*For any* API request from a Customer_User, all database queries should be filtered by the user's Tenant_ID, ensuring they only access their own data.
**Validates: Requirements 4.5, 4.7**

**Property 9: Admin user unrestricted access**
*For any* API request from an Admin_User, database queries should not be filtered by Tenant_ID, allowing access to all tenant data.
**Validates: Requirements 4.6**

**Property 10: Customer list tenant isolation**
*For any* GET /customers request from a Customer_User, the response should contain only the customer record matching their Tenant_ID.
**Validates: Requirements 5.2**

**Property 11: Admin customer list access**
*For any* GET /customers request from an Admin_User, the response should contain all customer records without tenant filtering.
**Validates: Requirements 5.1**

**Property 12: Shipment list tenant isolation**
*For any* GET /shipments request from a Customer_User, the response should contain only shipments where customer_id matches their Tenant_ID.
**Validates: Requirements 6.2**

**Property 13: Admin shipment list access**
*For any* GET /shipments request from an Admin_User, the response should contain all shipments without tenant filtering.
**Validates: Requirements 6.1**

**Property 14: Document access tenant isolation**
*For any* document access request from a Customer_User, the System should verify the document's customer_id matches their Tenant_ID before generating a presigned URL.
**Validates: Requirements 9.5, 9.6**

**Property 15: Real-time event tenant isolation**
*For any* real-time subscription from a Customer_User, the Realtime_Service should only deliver events for shipments where customer_id matches their Tenant_ID.
**Validates: Requirements 7.2**

**Property 16: Admin real-time event access**
*For any* real-time subscription from an Admin_User, the Realtime_Service should deliver all shipment events without tenant filtering.
**Validates: Requirements 7.3**

**Property 17: Search result tenant isolation**
*For any* search query from a Customer_User, the results should only include shipments where customer_id matches their Tenant_ID.
**Validates: Requirements 10.7**

### Data Integrity Properties

**Property 18: Foreign key constraint enforcement**
*For any* database insert or update that violates a foreign key constraint (e.g., shipment with non-existent customer_id), the Database should reject the operation with a constraint violation error.
**Validates: Requirements 3.8**

**Property 19: Email format validation**
*For any* customer creation request, if the email does not match a valid email format pattern, the API_Layer should reject it with a validation error.
**Validates: Requirements 5.6**

**Property 20: Email uniqueness enforcement**
*For any* customer creation request, if the email already exists in the customers table, the API_Layer should reject it with a uniqueness constraint error.
**Validates: Requirements 5.7**

**Property 21: Customer user_id association**
*For any* customer creation, the customer record's user_id field should be set to the authenticated user's Cognito sub claim.
**Validates: Requirements 5.8**

**Property 22: Tracking number generation uniqueness**
*For any* shipment creation, the generated tracking_number should be unique across all shipments in the database.
**Validates: Requirements 6.3**

**Property 23: Shipment status transition validation**
*For any* shipment status update, if the transition is invalid (e.g., 'delivered' to 'received'), the API_Layer should reject it with a validation error.
**Validates: Requirements 6.6**

**Property 24: Status change event creation**
*For any* shipment status update, the System should create a corresponding shipment_event record with event_type 'status_change'.
**Validates: Requirements 6.9**

**Property 25: Volumetric weight calculation**
*For any* package with dimensions (length, width, height in cm), the calculated volumetric_weight_kg should equal (length × width × height) / 5000.
**Validates: Requirements 6.10**

### API Behavior Properties

**Property 26: Request logging**
*For any* API request, the API_Layer should create a CloudWatch log entry containing the request method, path, user identity, and timestamp.
**Validates: Requirements 4.9**

**Property 27: Rate limiting enforcement**
*For any* sequence of API requests from the same source exceeding the rate limit threshold, the API_Layer should return 429 Too Many Requests for excess requests.
**Validates: Requirements 4.10**

**Property 28: Request payload validation**
*For any* API request with a payload that does not match the defined schema (missing required fields, invalid types), the API_Layer should return 400 Bad Request with validation details.
**Validates: Requirements 4.12**

**Property 29: Customer creation**
*For any* POST /customers request from an Admin_User with valid customer data, the API_Layer should create a new customer record and return 201 Created with the customer details.
**Validates: Requirements 5.3**

**Property 30: Customer update**
*For any* PUT /customers/:id request from an Admin_User with valid update data, the API_Layer should update the customer record and return 200 OK with updated details.
**Validates: Requirements 5.4**

**Property 31: Customer retrieval**
*For any* GET /customers/:id request with an existing customer ID, the API_Layer should return 200 OK with the customer details.
**Validates: Requirements 5.5**

**Property 32: Shipment creation**
*For any* POST /shipments request from an Admin_User with valid shipment data, the API_Layer should create a new shipment with a generated tracking_number and return 201 Created.
**Validates: Requirements 6.3**

**Property 33: Shipment update**
*For any* PUT /shipments/:id request from an Admin_User with valid update data, the API_Layer should update the shipment record and return 200 OK.
**Validates: Requirements 6.4**

**Property 34: Shipment details with relations**
*For any* GET /shipments/:id request, the response should include the shipment data along with associated packages, charges, and events arrays.
**Validates: Requirements 6.5**

**Property 35: Shipment filtering**
*For any* GET /shipments request with filter parameters (status, date range, customer_id), the response should contain only shipments matching all specified filters.
**Validates: Requirements 6.7**

**Property 36: Shipment search by tracking number**
*For any* search query containing a tracking_number, the System should return shipments where tracking_number matches the query (case-insensitive).
**Validates: Requirements 6.8, 10.1**

**Property 37: Shipment search by receipt number**
*For any* search query containing a warehouse_receipt_number, the System should return shipments where warehouse_receipt_number matches the query.
**Validates: Requirements 6.8, 10.2**

**Property 38: Shipment search by customer name**
*For any* search query containing a customer name, the System should return shipments where the associated customer's name matches the query.
**Validates: Requirements 10.3**

**Property 39: Shipment search by description**
*For any* search query containing keywords, the System should return shipments where the description or notes contain the keywords (full-text search).
**Validates: Requirements 10.4**

**Property 40: Search pagination**
*For any* paginated search request with page and limit parameters, the response should contain the correct subset of results based on the pagination parameters.
**Validates: Requirements 10.8**

### Document and OCR Properties

**Property 41: Document upload storage**
*For any* document upload request from an Admin_User, the System should store the document in the Document_Store S3 bucket and return a presigned upload URL.
**Validates: Requirements 8.1**

**Property 42: OCR pipeline trigger**
*For any* document uploaded to the receipts prefix in S3, the OCR_Pipeline should automatically trigger Textract processing.
**Validates: Requirements 8.2**

**Property 43: OCR completion returns structured data**
*For any* completed OCR job, the OCR_Pipeline should return structured shipment data with extracted fields (tracking_number, dates, weights, etc.).
**Validates: Requirements 8.5**

**Property 44: OCR failure returns error**
*For any* failed OCR job, the OCR_Pipeline should return an error response with details about the failure reason.
**Validates: Requirements 8.6**

**Property 45: OCR format support**
*For any* document in PDF or image format (JPEG, PNG), the OCR_Pipeline should successfully process it without format errors.
**Validates: Requirements 8.7**

**Property 46: OCR completion notification**
*For any* completed OCR job, the System should send a notification to the admin user who initiated the processing.
**Validates: Requirements 8.9**

**Property 47: OCR result persistence**
*For any* OCR job (successful or failed), the System should store the processing results and metadata in the database for audit purposes.
**Validates: Requirements 8.10**

**Property 48: Document ID uniqueness**
*For any* document upload, the System should generate a unique document identifier (UUID) that does not conflict with existing documents.
**Validates: Requirements 9.2**

**Property 49: Document metadata storage**
*For any* uploaded document, the System should store metadata (filename, size, mime_type, s3_key, customer_id, shipment_id) in the documents table.
**Validates: Requirements 9.3**

**Property 50: Presigned URL expiry**
*For any* document access request, the generated presigned URL should have an expiry time of exactly 15 minutes from generation.
**Validates: Requirements 9.4**

**Property 51: Document type validation**
*For any* document upload, if the document_type is not one of the supported types (invoice, receipt, customs_document, packing_list), the System should reject it with a validation error.
**Validates: Requirements 9.10**

### Real-Time Subscription Properties

**Property 52: Subscription authentication**
*For any* real-time subscription request, the Realtime_Service should validate the JWT token before establishing the connection.
**Validates: Requirements 7.6**


## Error Handling

### Error Response Format

All API errors follow a consistent format:

```typescript
interface ErrorResponse {
  success: false
  error: {
    code: string // Machine-readable error code
    message: string // Human-readable error message
    details?: Record<string, any> // Additional context
  }
  metadata: {
    timestamp: string
    requestId: string
  }
}
```

### Error Categories

**Authentication Errors (401):**
- `AUTH_TOKEN_MISSING`: No Authorization header provided
- `AUTH_TOKEN_INVALID`: JWT signature validation failed
- `AUTH_TOKEN_EXPIRED`: JWT token has expired
- `AUTH_INSUFFICIENT_PERMISSIONS`: User lacks required permissions

**Authorization Errors (403):**
- `FORBIDDEN_TENANT_ACCESS`: Customer user attempting to access another tenant's data
- `FORBIDDEN_ADMIN_ONLY`: Customer user attempting admin-only operation

**Validation Errors (400):**
- `VALIDATION_ERROR`: Request payload fails schema validation
- `INVALID_EMAIL_FORMAT`: Email does not match valid format
- `INVALID_STATUS_TRANSITION`: Shipment status transition not allowed
- `INVALID_DOCUMENT_TYPE`: Document type not supported

**Resource Errors (404):**
- `RESOURCE_NOT_FOUND`: Requested resource does not exist
- `CUSTOMER_NOT_FOUND`: Customer ID not found
- `SHIPMENT_NOT_FOUND`: Shipment ID not found

**Conflict Errors (409):**
- `EMAIL_ALREADY_EXISTS`: Customer email already in use
- `TRACKING_NUMBER_EXISTS`: Tracking number already assigned

**Rate Limiting (429):**
- `RATE_LIMIT_EXCEEDED`: Too many requests from this source

**Server Errors (500):**
- `INTERNAL_SERVER_ERROR`: Unexpected server error
- `DATABASE_ERROR`: Database operation failed
- `EXTERNAL_SERVICE_ERROR`: AWS service call failed

### Error Handling Strategy

**Lambda Functions:**
- Wrap all operations in try-catch blocks
- Log errors with full context (user, request, stack trace)
- Return appropriate HTTP status codes
- Never expose internal implementation details in error messages
- Sanitize error messages to prevent information leakage

**Database Operations:**
- Handle connection failures with retry logic (3 attempts with exponential backoff)
- Catch constraint violations and return user-friendly messages
- Handle deadlocks with automatic retry
- Log all database errors for debugging

**External Service Calls:**
- Implement circuit breaker pattern for Textract and other AWS services
- Set appropriate timeouts (30 seconds for Textract, 5 seconds for S3)
- Retry transient failures (503, 429) with exponential backoff
- Fail fast for permanent errors (400, 403, 404)

**OCR Pipeline:**
- Handle Textract failures gracefully (invalid format, unreadable text)
- Store failed jobs with error details for manual review
- Notify admin users of processing failures
- Implement dead letter queue for Step Functions failures

**Real-Time Connections:**
- Handle WebSocket disconnections gracefully
- Allow reconnection with resume capability
- Implement heartbeat/ping-pong to detect stale connections
- Clean up subscriptions on disconnect

### Logging Strategy

**Log Levels:**
- **ERROR**: Unrecoverable errors requiring immediate attention
- **WARN**: Recoverable errors or unexpected conditions
- **INFO**: Important business events (user login, shipment created)
- **DEBUG**: Detailed diagnostic information (disabled in production)

**Structured Logging:**
```typescript
logger.info('Shipment created', {
  shipmentId: shipment.id,
  trackingNumber: shipment.trackingNumber,
  customerId: shipment.customerId,
  userId: user.sub,
  requestId: context.requestId
})
```

**Log Retention:**
- Development: 14 days
- Production: 90 days
- Audit logs: 7 years (compliance requirement)

**Sensitive Data:**
- Never log passwords, tokens, or API keys
- Redact PII in logs (email → e***@example.com)
- Mask credit card numbers if present


## Testing Strategy

### Dual Testing Approach

The testing strategy combines unit tests and property-based tests for comprehensive coverage:

**Unit Tests:**
- Specific examples demonstrating correct behavior
- Edge cases and boundary conditions
- Error handling scenarios
- Integration points between components
- Mock external dependencies (AWS services, database)

**Property-Based Tests:**
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization
- Minimum 100 iterations per property test
- Each property test references its design document property
- Tag format: `Feature: aws-migration, Property {number}: {property_text}`

### Testing Pyramid

**Unit Tests (60%):**
- Business logic functions (tenant isolation, validation, calculations)
- Data transformations (DTO mapping, response formatting)
- Utility functions (tracking number generation, date formatting)
- Error handling paths

**Integration Tests (30%):**
- API endpoint tests with real database (test container)
- Lambda function tests with mocked AWS services
- Database migration tests
- OCR pipeline tests with sample documents

**End-to-End Tests (10%):**
- Critical user flows (login → view shipments → view details)
- Admin workflows (create customer → create shipment → upload receipt)
- Cross-component interactions

### Property-Based Testing Configuration

**Library Selection:**
- **TypeScript/Node.js**: fast-check (https://github.com/dubzzz/fast-check)
- Mature, well-maintained, excellent TypeScript support
- Rich set of built-in arbitraries (generators)

**Configuration:**
```typescript
import fc from 'fast-check'

// Example property test
describe('Property: Tenant isolation for customer users', () => {
  it('Feature: aws-migration, Property 8: Customer user query filtering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          customerId: fc.uuid(),
          shipments: fc.array(fc.record({
            id: fc.uuid(),
            customerId: fc.uuid(),
            trackingNumber: fc.string({ minLength: 10, maxLength: 20 })
          }))
        }),
        async ({ customerId, shipments }) => {
          // Setup: Insert shipments into test database
          await insertShipments(shipments)
          
          // Create customer user context
          const user: UserContext = {
            sub: 'test-user',
            email: 'test@example.com',
            role: 'customer',
            tenantId: customerId,
            groups: ['customer']
          }
          
          // Execute: Query shipments as customer user
          const result = await getShipments(user, {})
          
          // Assert: All returned shipments belong to customer's tenant
          expect(result.every(s => s.customerId === customerId)).toBe(true)
        }
      ),
      { numRuns: 100 } // Minimum 100 iterations
    )
  })
})
```

**Arbitraries (Generators):**
- `fc.uuid()` - Generate valid UUIDs
- `fc.emailAddress()` - Generate valid email addresses
- `fc.string()` - Generate strings with constraints
- `fc.integer()` - Generate integers with ranges
- `fc.date()` - Generate dates
- `fc.constantFrom()` - Generate from enum values
- `fc.record()` - Generate objects with specific shape
- `fc.array()` - Generate arrays with constraints

### Test Data Management

**Test Fixtures:**
- Predefined test data for consistent unit tests
- Sample customers, shipments, packages for integration tests
- Sample OCR documents (PDFs, images) with known content

**Database Seeding:**
- Use Testcontainers for PostgreSQL in integration tests
- Seed database with baseline data before each test suite
- Clean up after each test to ensure isolation

**Mock Data:**
- Mock AWS SDK calls (Cognito, S3, Textract, Secrets Manager)
- Use aws-sdk-mock or manual mocks
- Provide realistic responses for different scenarios

### Coverage Requirements

**Backend Code:**
- Minimum 80% line coverage
- Minimum 70% branch coverage
- 100% coverage for critical paths (authentication, authorization, tenant isolation)

**Frontend Code:**
- Minimum 70% line coverage
- Focus on business logic, not UI rendering
- Test custom hooks, API client, state management

**Exclusions:**
- Infrastructure code (CDK stacks)
- Configuration files
- Type definitions

### Test Execution

**Local Development:**
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run property tests
npm run test:property

# Run with coverage
npm run test:coverage
```

**CI/CD Pipeline:**
- Run linting and type checking first (fail fast)
- Run unit tests (fast feedback)
- Run integration tests (requires test database)
- Run property tests (100 iterations minimum)
- Generate coverage report
- Block merge if coverage drops below threshold
- Block merge if any test fails

### Performance Testing

**Load Testing:**
- Use Artillery or k6 for API load testing
- Test scenarios: 100 concurrent users, 1000 requests/minute
- Measure response times, error rates, throughput
- Identify bottlenecks (database queries, Lambda cold starts)

**Stress Testing:**
- Gradually increase load until system degrades
- Identify breaking points and failure modes
- Test auto-scaling behavior

**Soak Testing:**
- Run sustained load for extended period (1-2 hours)
- Detect memory leaks, connection pool exhaustion
- Validate monitoring and alerting

### Security Testing

**SAST (Static Application Security Testing):**
- Use Snyk or npm audit for dependency scanning
- Run in CI/CD pipeline on every commit
- Block deployment if high-severity vulnerabilities found

**DAST (Dynamic Application Security Testing):**
- Use OWASP ZAP for API security testing
- Test for common vulnerabilities (SQL injection, XSS, CSRF)
- Run weekly in development environment

**Penetration Testing:**
- Manual security review before production launch
- Test authentication bypass, privilege escalation, data leakage
- Document findings and remediation

### Migration Testing

**Data Migration Validation:**
- Compare row counts between Supabase and AWS
- Validate foreign key relationships preserved
- Spot-check sample records for data integrity
- Test rollback procedure

**Functional Validation:**
- Run full regression test suite after migration
- Verify all features work with migrated data
- Test with real user accounts (staging environment)

**Performance Validation:**
- Compare response times before and after migration
- Ensure no degradation in user experience
- Validate database query performance


## Migration Plan

### Phased Approach

**Phase 0: Stabilization and Preparation (Week 1-2)**

Objectives:
- Stabilize current Supabase PoC
- Add comprehensive tests
- Document current functionality
- Set up AWS account and GitHub OIDC

Tasks:
1. Add unit tests for existing business logic (target 60% coverage)
2. Add integration tests for critical flows
3. Document API contracts and data models
4. Set up AWS CDK project structure
5. Configure GitHub Actions with OIDC authentication
6. Create development environment in AWS (VPC, security groups)
7. Set up CloudWatch dashboards and alarms

Success Criteria:
- All tests passing
- Test coverage ≥ 60%
- AWS account configured with proper IAM roles
- CI/CD pipeline running successfully

Rollback: N/A (no production changes)

---

**Phase 1: Frontend Migration (Week 3)**

Objectives:
- Host React frontend on AWS S3 + CloudFront
- Keep Supabase backend unchanged
- Validate frontend deployment pipeline

Tasks:
1. Create S3 bucket for frontend hosting
2. Configure CloudFront distribution (use existing E34Q2E7TZIYZAB)
3. Update build pipeline to deploy to S3
4. Configure CloudFront cache invalidation
5. Update DNS to point to CloudFront (if applicable)
6. Test frontend functionality with Supabase backend

Success Criteria:
- Frontend accessible via CloudFront URL
- All features working with Supabase backend
- Build and deployment automated via GitHub Actions
- CloudFront cache invalidation working

Rollback: Revert DNS to Supabase hosting, delete S3 bucket

---

**Phase 2: Authentication Migration (Week 4-5)**

Objectives:
- Migrate from Supabase Auth to Amazon Cognito
- Migrate user accounts
- Update frontend to use Cognito

Tasks:
1. Create Cognito User Pool with admin and customer groups
2. Configure password policies and MFA settings
3. Export users from Supabase Auth
4. Import users to Cognito (trigger password reset emails)
5. Update frontend authentication flow to use Cognito SDK
6. Update API client to use Cognito JWT tokens
7. Test authentication flows (login, logout, password reset)
8. Run parallel authentication (Cognito + Supabase) for validation

Success Criteria:
- All users migrated to Cognito
- Login, logout, password reset working
- JWT tokens issued correctly with group claims
- No authentication errors in production

Rollback: Revert frontend to use Supabase Auth, keep Cognito for future use

---

**Phase 3: Database and API Migration (Week 6-8)**

Objectives:
- Migrate PostgreSQL database from Supabase to RDS
- Implement API layer with Lambda + API Gateway
- Migrate data from Supabase to RDS

Tasks:
1. Create RDS PostgreSQL instance (t4g.micro)
2. Deploy database schema to RDS
3. Implement Lambda functions for all API endpoints
4. Configure API Gateway with JWT authorizer
5. Implement tenant isolation logic in Lambda functions
6. Test API endpoints with Postman/automated tests
7. Export data from Supabase (pg_dump)
8. Import data to RDS (pg_restore)
9. Validate data integrity (row counts, foreign keys, spot checks)
10. Update frontend to use new API Gateway endpoints
11. Run parallel APIs (AWS + Supabase) for validation
12. Monitor for errors and performance issues

Success Criteria:
- All data migrated successfully
- All API endpoints functional
- Tenant isolation working correctly
- Response times < 2 seconds for 95th percentile
- No data loss or corruption

Rollback: Revert frontend to use Supabase API, keep RDS for future use

---

**Phase 4: OCR and Real-Time Features (Week 9-10)**

Objectives:
- Implement OCR pipeline with Textract
- Implement real-time updates (EventBridge + polling initially)
- Migrate document storage to S3

Tasks:
1. Create S3 bucket for document storage
2. Implement document upload API with presigned URLs
3. Migrate existing documents from Supabase Storage to S3
4. Implement OCR pipeline (S3 → Lambda → Textract → Step Functions)
5. Test OCR with sample warehouse receipts
6. Implement EventBridge for shipment status changes
7. Update frontend to poll for updates (5-second interval)
8. Test real-time updates in browser

Success Criteria:
- Documents accessible via presigned URLs
- OCR processing working for PDF and images
- Real-time updates delivered within 10 seconds
- No document access errors

Rollback: Revert to Supabase Storage and Edge Functions for OCR

---

**Phase 5: Full Cutover and Decommission (Week 11-12)**

Objectives:
- Complete migration to AWS
- Decommission Supabase
- Harden production environment

Tasks:
1. Run full regression test suite on AWS infrastructure
2. Perform load testing to validate performance
3. Review security configuration (encryption, IAM, security groups)
4. Set up production monitoring and alerting
5. Document operational runbooks
6. Train team on AWS operations
7. Perform final data sync from Supabase (if any changes)
8. Switch all traffic to AWS
9. Monitor for 48 hours
10. Decommission Supabase account (after 1-week grace period)

Success Criteria:
- All features working on AWS
- No critical errors in 48-hour monitoring period
- Team trained on AWS operations
- Supabase account closed

Rollback: Reactivate Supabase account, revert DNS/frontend configuration

---

### Data Migration Strategy

**Export from Supabase:**
```bash
# Export database schema
pg_dump -h db.supabase.co -U postgres -d ctcm --schema-only > schema.sql

# Export data
pg_dump -h db.supabase.co -U postgres -d ctcm --data-only > data.sql

# Export specific tables (if needed)
pg_dump -h db.supabase.co -U postgres -d ctcm -t customers -t shipments > tables.sql
```

**Transform Data (if needed):**
- Convert Supabase user IDs to Cognito subs (mapping table)
- Update foreign key references
- Validate data types and constraints

**Import to RDS:**
```bash
# Import schema
psql -h ctcm-dev.rds.amazonaws.com -U admin -d ctcm < schema.sql

# Import data
psql -h ctcm-dev.rds.amazonaws.com -U admin -d ctcm < data.sql
```

**Validation:**
```sql
-- Compare row counts
SELECT 'customers' AS table_name, COUNT(*) FROM customers
UNION ALL
SELECT 'shipments', COUNT(*) FROM shipments
UNION ALL
SELECT 'packages', COUNT(*) FROM packages;

-- Validate foreign keys
SELECT COUNT(*) FROM shipments s
LEFT JOIN customers c ON s.customer_id = c.id
WHERE c.id IS NULL; -- Should be 0

-- Spot check sample records
SELECT * FROM shipments ORDER BY created_at DESC LIMIT 10;
```

**Document Migration:**
```bash
# Use AWS CLI to copy from Supabase Storage to S3
aws s3 sync supabase-export/ s3://ctcm-dev-documents/ --acl private
```

### Rollback Strategy

**Rollback Triggers:**
- Critical functionality broken (authentication, data access)
- Data loss or corruption detected
- Performance degradation > 50%
- Security vulnerability discovered
- More than 5% error rate in production

**Rollback Procedures:**

**Phase 1 Rollback:**
1. Revert DNS to Supabase hosting URL
2. Delete S3 bucket and CloudFront configuration
3. Notify users of temporary service interruption

**Phase 2 Rollback:**
1. Revert frontend code to use Supabase Auth SDK
2. Deploy frontend with Supabase authentication
3. Keep Cognito User Pool for future retry

**Phase 3 Rollback:**
1. Revert frontend API client to use Supabase endpoints
2. Deploy frontend with Supabase API
3. Keep RDS instance with migrated data for future retry
4. Investigate and fix issues before retry

**Phase 4 Rollback:**
1. Revert document upload to use Supabase Storage
2. Revert OCR to use Supabase Edge Functions
3. Revert real-time to use Supabase Realtime
4. Keep S3 bucket and OCR pipeline for future retry

**Phase 5 Rollback:**
1. Reactivate Supabase account (within grace period)
2. Sync any new data from RDS back to Supabase
3. Revert all frontend configuration to Supabase
4. Investigate critical issues before retry

### Risk Mitigation

**Data Loss Prevention:**
- Take full backup of Supabase before each phase
- Enable RDS automated backups immediately
- Test restore procedures before migration
- Keep Supabase read-only during cutover (not deleted)

**Downtime Minimization:**
- Perform migrations during low-traffic periods
- Use blue-green deployment for frontend
- Run parallel systems during validation periods
- Have rollback scripts ready before each phase

**Communication Plan:**
- Notify users 48 hours before each phase
- Provide status updates during migration
- Document known issues and workarounds
- Set up status page for real-time updates


## Repository Structure

### Monorepo Organization

```
ctcm-web/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # PR checks: lint, typecheck, test
│       ├── deploy-dev.yml            # Deploy to dev on merge to develop
│       ├── deploy-prod.yml           # Deploy to prod on merge to main
│       └── security-scan.yml         # Weekly security scans
│
├── apps/
│   ├── web/                          # React frontend
│   │   ├── src/
│   │   │   ├── components/           # React components
│   │   │   ├── pages/                # Page components
│   │   │   ├── hooks/                # Custom React hooks
│   │   │   ├── lib/                  # Utilities and helpers
│   │   │   ├── api/                  # API client
│   │   │   ├── types/                # TypeScript types
│   │   │   └── App.tsx               # Root component
│   │   ├── public/                   # Static assets
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                          # Lambda functions
│       ├── src/
│       │   ├── handlers/             # Lambda handler functions
│       │   │   ├── customers.ts
│       │   │   ├── shipments.ts
│       │   │   ├── documents.ts
│       │   │   ├── invoices.ts
│       │   │   └── search.ts
│       │   ├── middleware/           # Shared middleware
│       │   │   ├── auth.ts
│       │   │   ├── tenant-isolation.ts
│       │   │   ├── error-handler.ts
│       │   │   └── logger.ts
│       │   ├── services/             # Business logic
│       │   │   ├── customer-service.ts
│       │   │   ├── shipment-service.ts
│       │   │   └── document-service.ts
│       │   ├── repositories/         # Database access
│       │   │   ├── customer-repository.ts
│       │   │   ├── shipment-repository.ts
│       │   │   └── base-repository.ts
│       │   ├── lib/                  # Utilities
│       │   │   ├── database.ts       # DB connection
│       │   │   ├── s3-client.ts      # S3 operations
│       │   │   └── validators.ts     # Input validation
│       │   └── types/                # TypeScript types
│       ├── tests/
│       │   ├── unit/                 # Unit tests
│       │   ├── integration/          # Integration tests
│       │   └── property/             # Property-based tests
│       ├── tsconfig.json
│       └── package.json
│
├── infra/                            # AWS CDK infrastructure
│   ├── bin/
│   │   └── app.ts                    # CDK app entry point
│   ├── lib/
│   │   ├── stacks/
│   │   │   ├── network-stack.ts      # VPC, subnets, security groups
│   │   │   ├── auth-stack.ts         # Cognito User Pool
│   │   │   ├── data-stack.ts         # RDS, S3 buckets
│   │   │   ├── api-stack.ts          # API Gateway, Lambda
│   │   │   ├── frontend-stack.ts     # S3, CloudFront
│   │   │   ├── ocr-stack.ts          # OCR pipeline (Textract, Step Functions)
│   │   │   └── observability-stack.ts # CloudWatch, alarms
│   │   └── constructs/               # Reusable CDK constructs
│   │       ├── lambda-function.ts
│   │       └── api-endpoint.ts
│   ├── cdk.json
│   ├── tsconfig.json
│   └── package.json
│
├── packages/                         # Shared packages
│   ├── types/                        # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── customer.ts
│   │   │   ├── shipment.ts
│   │   │   ├── document.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── utils/                        # Shared utilities
│       ├── src/
│       │   ├── date-utils.ts
│       │   ├── validation.ts
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── scripts/                          # Utility scripts
│   ├── migrate-data.ts               # Data migration from Supabase
│   ├── seed-database.ts              # Seed test data
│   ├── generate-tracking-numbers.ts  # Batch tracking number generation
│   └── backup-database.sh            # Database backup script
│
├── docs/                             # Documentation
│   ├── architecture.md               # Architecture overview
│   ├── api-reference.md              # API documentation
│   ├── deployment.md                 # Deployment guide
│   ├── migration-guide.md            # Migration procedures
│   └── runbooks/                     # Operational runbooks
│       ├── incident-response.md
│       ├── database-restore.md
│       └── rollback-procedures.md
│
├── .kiro/                            # Kiro specs
│   └── specs/
│       └── aws-migration/
│           ├── .config.kiro
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
│
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── package.json                      # Root package.json (workspace config)
├── tsconfig.json                     # Root TypeScript config
├── README.md
└── CHANGELOG.md
```

### Workspace Configuration

**Root package.json:**
```json
{
  "name": "ctcm-web",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*",
    "infra"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=apps/web",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "test:unit": "npm run test:unit --workspaces",
    "test:integration": "npm run test:integration --workspaces",
    "test:property": "npm run test:property --workspaces",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "deploy:dev": "npm run deploy --workspace=infra -- --profile ctcm-dev",
    "deploy:prod": "npm run deploy --workspace=infra -- --profile ctcm-prod"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Key Files

**GitHub Actions CI Workflow (.github/workflows/ci.yml):**
```yaml
name: CI

on:
  pull_request:
    branches: [develop, main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run test
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm audit --audit-level=high
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

**GitHub Actions Deploy Workflow (.github/workflows/deploy-dev.yml):**
```yaml
name: Deploy to Dev

on:
  push:
    branches: [develop]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::404875533723:role/GitHubActionsDeployRole
          aws-region: us-east-1
      
      - name: Deploy infrastructure
        run: npm run deploy:dev --workspace=infra
      
      - name: Deploy frontend
        run: |
          aws s3 sync apps/web/dist s3://ctcm-dev-frontend --delete
          aws cloudfront create-invalidation --distribution-id E34Q2E7TZIYZAB --paths "/*"
      
      - name: Run smoke tests
        run: npm run test:smoke
```


## Infrastructure as Code (CDK)

### Stack Architecture

The infrastructure is organized into separate CDK stacks for modularity and independent deployment:

**Stack Dependencies:**
```
NetworkStack (VPC, Security Groups)
    ↓
AuthStack (Cognito)    DataStack (RDS, S3)
    ↓                       ↓
    └─────→ ApiStack (API Gateway, Lambda) ←─────┘
                ↓
            FrontendStack (S3, CloudFront)
                ↓
            OcrStack (Textract, Step Functions)
                ↓
            ObservabilityStack (CloudWatch, Alarms)
```

### Network Stack

**Resources:**
- VPC with public and private subnets (2 AZs)
- Security groups for RDS, Lambda, and ALB
- VPC endpoints for S3 and DynamoDB (optional, cost-saving)

**CDK Code Structure:**
```typescript
export class NetworkStack extends Stack {
  public readonly vpc: ec2.Vpc
  public readonly rdsSecurityGroup: ec2.SecurityGroup
  public readonly lambdaSecurityGroup: ec2.SecurityGroup

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // VPC with 2 AZs, public and private subnets
    this.vpc = new ec2.Vpc(this, 'CtcmVpc', {
      maxAzs: 2,
      natGateways: 0, // Cost saving for dev
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24
        }
      ]
    })

    // Security group for RDS
    this.rdsSecurityGroup = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for RDS PostgreSQL',
      allowAllOutbound: false
    })

    // Security group for Lambda
    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Lambda functions',
      allowAllOutbound: true
    })

    // Allow Lambda to access RDS
    this.rdsSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda to access RDS'
    )

    // Tags
    Tags.of(this).add('Environment', 'dev')
    Tags.of(this).add('Application', 'ctcm')
    Tags.of(this).add('ManagedBy', 'cdk')
  }
}
```

### Auth Stack

**Resources:**
- Cognito User Pool
- User Pool Client
- User groups (admin, customer)

**CDK Code Structure:**
```typescript
export class AuthStack extends Stack {
  public readonly userPool: cognito.UserPool
  public readonly userPoolClient: cognito.UserPoolClient

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'CtcmUserPool', {
      userPoolName: 'ctcm-dev-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true
      },
      autoVerify: {
        email: true
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN // Don't delete users on stack deletion
    })

    // User Pool Client
    this.userPoolClient = this.userPool.addClient('CtcmWebClient', {
      authFlows: {
        userPassword: true,
        userSrp: true
      },
      accessTokenValidity: Duration.minutes(15),
      refreshTokenValidity: Duration.days(7),
      generateSecret: false // Public client (frontend)
    })

    // User groups
    new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'admin',
      description: 'Admin users with full system access'
    })

    new cognito.CfnUserPoolGroup(this, 'CustomerGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'customer',
      description: 'Customer users with tenant-isolated access'
    })

    // Outputs
    new CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      exportName: 'CtcmUserPoolId'
    })

    new CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      exportName: 'CtcmUserPoolClientId'
    })
  }
}
```

### Data Stack

**Resources:**
- RDS PostgreSQL instance (t4g.micro)
- S3 bucket for documents
- S3 bucket for frontend
- Secrets Manager secret for database credentials

**CDK Code Structure:**
```typescript
export interface DataStackProps extends StackProps {
  vpc: ec2.Vpc
  rdsSecurityGroup: ec2.SecurityGroup
}

export class DataStack extends Stack {
  public readonly database: rds.DatabaseInstance
  public readonly documentBucket: s3.Bucket
  public readonly frontendBucket: s3.Bucket
  public readonly databaseSecret: secretsmanager.Secret

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props)

    // Database credentials in Secrets Manager
    this.databaseSecret = new secretsmanager.Secret(this, 'DbSecret', {
      secretName: 'ctcm-dev-db-credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'ctcm_admin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        includeSpace: false
      }
    })

    // RDS PostgreSQL
    this.database = new rds.DatabaseInstance(this, 'CtcmDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      securityGroups: [props.rdsSecurityGroup],
      databaseName: 'ctcm',
      credentials: rds.Credentials.fromSecret(this.databaseSecret),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageEncrypted: true,
      backupRetention: Duration.days(7),
      deleteAutomatedBackups: false,
      removalPolicy: RemovalPolicy.SNAPSHOT,
      deletionProtection: true // Prevent accidental deletion
    })

    // Document storage bucket
    this.documentBucket = new s3.Bucket(this, 'DocumentBucket', {
      bucketName: 'ctcm-dev-documents',
      encryption: s3.BucketEncryption.KMS,
      versioned: true,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(90)
            }
          ]
        }
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN
    })

    // Frontend hosting bucket
    this.frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: 'ctcm-dev-frontend',
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN
    })

    // Outputs
    new CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.dbInstanceEndpointAddress,
      exportName: 'CtcmDatabaseEndpoint'
    })

    new CfnOutput(this, 'DocumentBucketName', {
      value: this.documentBucket.bucketName,
      exportName: 'CtcmDocumentBucket'
    })
  }
}
```

### API Stack

**Resources:**
- API Gateway REST API
- Lambda functions for each resource
- JWT authorizer
- IAM roles for Lambda

**CDK Code Structure:**
```typescript
export interface ApiStackProps extends StackProps {
  vpc: ec2.Vpc
  lambdaSecurityGroup: ec2.SecurityGroup
  database: rds.DatabaseInstance
  databaseSecret: secretsmanager.Secret
  documentBucket: s3.Bucket
  userPool: cognito.UserPool
}

export class ApiStack extends Stack {
  public readonly api: apigateway.RestApi

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props)

    // API Gateway
    this.api = new apigateway.RestApi(this, 'CtcmApi', {
      restApiName: 'ctcm-dev-api',
      description: 'CTCM Freight Forwarding API',
      deployOptions: {
        stageName: 'dev',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS, // Restrict in production
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization']
      }
    })

    // JWT Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'JwtAuthorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: 'jwt-authorizer'
    })

    // Lambda execution role
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
      ]
    })

    // Grant permissions
    props.databaseSecret.grantRead(lambdaRole)
    props.documentBucket.grantReadWrite(lambdaRole)

    // Environment variables for all Lambdas
    const lambdaEnvironment = {
      DATABASE_SECRET_ARN: props.databaseSecret.secretArn,
      DOCUMENT_BUCKET_NAME: props.documentBucket.bucketName,
      USER_POOL_ID: props.userPool.userPoolId,
      LOG_LEVEL: 'INFO'
    }

    // Customers Lambda
    const customersFunction = new lambda.Function(this, 'CustomersFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/customers.handler',
      code: lambda.Code.fromAsset('apps/api/dist'),
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      environment: lambdaEnvironment,
      role: lambdaRole,
      timeout: Duration.seconds(30),
      memorySize: 512
    })

    // API resources
    const customers = this.api.root.addResource('customers')
    customers.addMethod('GET', new apigateway.LambdaIntegration(customersFunction), {
      authorizer
    })
    customers.addMethod('POST', new apigateway.LambdaIntegration(customersFunction), {
      authorizer
    })

    const customer = customers.addResource('{id}')
    customer.addMethod('GET', new apigateway.LambdaIntegration(customersFunction), {
      authorizer
    })
    customer.addMethod('PUT', new apigateway.LambdaIntegration(customersFunction), {
      authorizer
    })

    // Repeat for other resources (shipments, documents, etc.)

    // Outputs
    new CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      exportName: 'CtcmApiUrl'
    })
  }
}
```

### Observability Stack

**Resources:**
- CloudWatch Log Groups
- CloudWatch Alarms
- SNS topic for alerts
- CloudWatch Dashboard

**CDK Code Structure:**
```typescript
export interface ObservabilityStackProps extends StackProps {
  api: apigateway.RestApi
  database: rds.DatabaseInstance
}

export class ObservabilityStack extends Stack {
  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props)

    // SNS topic for alarms
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      displayName: 'CTCM Dev Alarms'
    })

    // Subscribe email to alarms
    alarmTopic.addSubscription(
      new subscriptions.EmailSubscription('christophercorbin24@gmail.com')
    )

    // API Gateway error rate alarm
    new cloudwatch.Alarm(this, 'ApiErrorRateAlarm', {
      metric: props.api.metricServerError({
        statistic: 'Sum',
        period: Duration.minutes(5)
      }),
      threshold: 10,
      evaluationPeriods: 2,
      alarmDescription: 'API error rate exceeded threshold',
      actionsEnabled: true
    }).addAlarmAction(new actions.SnsAction(alarmTopic))

    // API Gateway latency alarm
    new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
      metric: props.api.metricLatency({
        statistic: 'Average',
        period: Duration.minutes(5)
      }),
      threshold: 2000, // 2 seconds
      evaluationPeriods: 2,
      alarmDescription: 'API latency exceeded 2 seconds',
      actionsEnabled: true
    }).addAlarmAction(new actions.SnsAction(alarmTopic))

    // Database CPU alarm
    new cloudwatch.Alarm(this, 'DatabaseCpuAlarm', {
      metric: props.database.metricCPUUtilization({
        period: Duration.minutes(5)
      }),
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'Database CPU utilization exceeded 80%',
      actionsEnabled: true
    }).addAlarmAction(new actions.SnsAction(alarmTopic))

    // Budget alarm
    const budget = new budgets.CfnBudget(this, 'MonthlyBudget', {
      budget: {
        budgetName: 'ctcm-dev-monthly-budget',
        budgetLimit: {
          amount: 15,
          unit: 'USD'
        },
        timeUnit: 'MONTHLY',
        budgetType: 'COST'
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 80
          },
          subscribers: [
            {
              subscriptionType: 'EMAIL',
              address: 'christophercorbin24@gmail.com'
            }
          ]
        }
      ]
    })

    // CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'CtcmDashboard', {
      dashboardName: 'ctcm-dev-dashboard'
    })

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Requests',
        left: [props.api.metricCount()]
      }),
      new cloudwatch.GraphWidget({
        title: 'API Latency',
        left: [props.api.metricLatency()]
      }),
      new cloudwatch.GraphWidget({
        title: 'API Errors',
        left: [props.api.metricServerError(), props.api.metricClientError()]
      }),
      new cloudwatch.GraphWidget({
        title: 'Database Connections',
        left: [props.database.metricDatabaseConnections()]
      })
    )
  }
}
```

### CDK App Entry Point

**bin/app.ts:**
```typescript
#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { NetworkStack } from '../lib/stacks/network-stack'
import { AuthStack } from '../lib/stacks/auth-stack'
import { DataStack } from '../lib/stacks/data-stack'
import { ApiStack } from '../lib/stacks/api-stack'
import { FrontendStack } from '../lib/stacks/frontend-stack'
import { OcrStack } from '../lib/stacks/ocr-stack'
import { ObservabilityStack } from '../lib/stacks/observability-stack'

const app = new cdk.App()

const env = {
  account: '404875533723',
  region: 'us-east-1'
}

// Network infrastructure
const networkStack = new NetworkStack(app, 'CtcmNetworkStack', { env })

// Authentication
const authStack = new AuthStack(app, 'CtcmAuthStack', { env })

// Data layer
const dataStack = new DataStack(app, 'CtcmDataStack', {
  env,
  vpc: networkStack.vpc,
  rdsSecurityGroup: networkStack.rdsSecurityGroup
})

// API layer
const apiStack = new ApiStack(app, 'CtcmApiStack', {
  env,
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  database: dataStack.database,
  databaseSecret: dataStack.databaseSecret,
  documentBucket: dataStack.documentBucket,
  userPool: authStack.userPool
})

// Frontend
const frontendStack = new FrontendStack(app, 'CtcmFrontendStack', {
  env,
  frontendBucket: dataStack.frontendBucket
})

// OCR pipeline
const ocrStack = new OcrStack(app, 'CtcmOcrStack', {
  env,
  documentBucket: dataStack.documentBucket,
  database: dataStack.database,
  databaseSecret: dataStack.databaseSecret
})

// Observability
const observabilityStack = new ObservabilityStack(app, 'CtcmObservabilityStack', {
  env,
  api: apiStack.api,
  database: dataStack.database
})

app.synth()
```

### Cost Estimation

**Monthly Costs (Development):**
- RDS t4g.micro (730 hours): ~$15
- Lambda (10K invocations, 512MB, 1s avg): ~$0.20
- API Gateway (10K requests): ~$0.04
- S3 (10GB storage, 1K requests): ~$0.25
- CloudWatch Logs (1GB, 14-day retention): ~$0.50
- Textract (100 pages): ~$0.15
- Data transfer: ~$0.50
- **Total: ~$16.64/month**

**Cost Optimization for Budget:**
- Use RDS t4g.micro instead of Aurora Serverless v2 (saves ~$28/month)
- No NAT Gateway (saves ~$32/month)
- 14-day log retention instead of 90 days (saves ~$2/month)
- Minimal VPC endpoints (saves ~$14/month)
- EventBridge + polling instead of WebSockets (saves ~$1/month)

**Production Costs (Estimated):**
- RDS t4g.small Multi-AZ: ~$60
- Lambda (100K invocations): ~$2
- API Gateway (100K requests): ~$0.35
- S3 (100GB storage): ~$2.50
- CloudWatch: ~$5
- Textract (1000 pages): ~$1.50
- NAT Gateway: ~$32
- **Total: ~$103/month**

