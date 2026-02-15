# Freight Forwarding Management System - Steering Document

## Executive Summary

This document provides comprehensive technical and business guidance for the Freight Forwarding Management System, a production-ready web application for managing international shipments between Miami and Barbados. The system supports both air and sea freight operations with complete tracking, warehouse receipt management, customer management, and invoicing capabilities.

**Current Status:** Production-ready with core features implemented
**Tech Stack:** React 18 + TypeScript + Vite + Supabase + Tailwind CSS
**Target Users:** Freight brokers (admins) and their customers

---

## Table of Contents

1. [Business Overview](#business-overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Authentication & Authorization](#authentication--authorization)
5. [Core Features](#core-features)
6. [Component Architecture](#component-architecture)
7. [Development Workflow](#development-workflow)
8. [Deployment Guide](#deployment-guide)
9. [Security Considerations](#security-considerations)
10. [Future Roadmap](#future-roadmap)

---

## Business Overview

### Purpose
The system digitizes and streamlines freight forwarding operations for a business shipping goods from Miami (USA) to Barbados. It replaces manual processes with automated tracking, customer self-service, and centralized record-keeping.

### Key Business Processes

1. **Warehouse Receipt Intake** (Admin)
   - Scan/upload warehouse receipt documents
   - Extract shipment details using OCR/AI
   - Create shipment records with packages, charges, and tracking events
   - Assign shipments to customers

2. **Shipment Tracking** (Customer & Admin)
   - Real-time status updates
   - Timeline view of shipment journey
   - Location tracking
   - Delivery notifications

3. **Customer Management** (Admin)
   - Maintain customer database
   - Assign skybox addresses (air and sea)
   - Track customer shipments and invoices
   - Customer contact information

4. **Invoicing & Billing** (Both)
   - Generate invoices for shipping charges
   - Track payment status
   - Multiple invoice types (shipping, customs, delivery)

### User Roles

- **Admin/Broker:** Full system access, manages all shipments, customers, and operations
- **Customer:** View personal shipments, track packages, view invoices, manage profile

---

## System Architecture

### Technology Stack

**Frontend:**
- React 18.3.1 (UI framework)
- TypeScript 5.5.3 (type safety)
- Vite 5.4.2 (build tool)
- Tailwind CSS 3.4.1 (styling)
- React Router 7.13.0 (routing)
- React Hook Form 7.71.1 + Zod 4.3.6 (forms and validation)
- Lucide React 0.344.0 (icons)
- React Hot Toast 2.6.0 (notifications)

**Backend & Infrastructure:**
- Supabase (PostgreSQL database + authentication + real-time)
- Supabase Edge Functions (serverless functions for OCR/document processing)

**External APIs:**
- Extract Receipt Data Edge Function (OCR for warehouse receipts)

### Application Flow

```
User → Browser → React App → Supabase Client
                                ↓
                          Supabase Backend
                          ├── PostgreSQL (data)
                          ├── Auth (authentication)
                          ├── Realtime (live updates)
                          └── Edge Functions (OCR)
```

### Key Design Patterns

1. **Component Composition:** Reusable UI components with consistent API
2. **Custom Hooks:** Shared logic for real-time data, authentication state
3. **Protected Routes:** Role-based access control at routing level
4. **Optimistic Updates:** Immediate UI feedback with background sync
5. **Real-time Subscriptions:** Live shipment updates via Supabase Realtime

---

## Database Schema

### Core Tables

#### `customers`
Stores customer information and skybox addresses.

```sql
- id (uuid, primary key)
- user_id (uuid, foreign key to auth.users, nullable for legacy)
- name (text)
- email (text, unique)
- phone (text)
- company (text, nullable)
- address (text, nullable)
- air_skybox_address (text)
- sea_skybox_address (text)
- created_at (timestamptz)
- updated_at (timestamptz)
```

**RLS Policies:**
- Admins: full access
- Customers: can only view/update their own record (linked via user_id)

#### `shipments`
Main shipment records with shipper/consignee details.

```sql
- id (uuid, primary key)
- tracking_number (text, unique, auto-generated)
- warehouse_receipt_number (text, nullable)
- customer_id (uuid, foreign key to customers)
- status (shipment_status enum)
- received_date (date)
- received_by (text)
- shipper_name, shipper_address, shipper_city, shipper_state,
  shipper_country, shipper_zip (text, nullable)
- consignee_name, consignee_contact, consignee_address, consignee_city,
  consignee_state, consignee_country, consignee_zip, consignee_email,
  consignee_phone (text, nullable)
- carrier_name, pro_number, driver_name, driver_license (text, nullable)
- supplier, invoice_number, po_number, transaction_guid (text, nullable)
- warehouse_location, description, notes (text, nullable)
- created_at, updated_at (timestamptz)
```

**Status Enum Values:**
- `pending` - Shipment created but not yet received
- `received` - Received at Miami warehouse, awaiting customer decision
- `in_transit` - In transit (generic)
- `departed` - Departed origin
- `arrived` - Arrived at destination
- `at_warehouse` - At warehouse facility
- `customs_clearance` - Undergoing customs processing
- `customs_cleared` - Cleared customs
- `customs_hold` - Held by customs
- `ready_for_pickup` - Ready for customer pickup
- `out_for_delivery` - Out for home delivery
- `delivered` - Successfully delivered
- `delayed` - Shipment delayed

**RLS Policies:**
- Admins: full access to all shipments
- Customers: can only view shipments linked to their customer_id

#### `packages`
Individual packages within a shipment (one-to-many).

```sql
- id (uuid, primary key)
- shipment_id (uuid, foreign key to shipments)
- pieces_count (integer)
- package_type (package_type enum: box, bag, pallet, crate, envelope, other)
- length, width, height (numeric, nullable)
- dimension_unit (text, default 'in')
- weight (numeric, nullable)
- weight_unit (text, default 'lb')
- weight_kg (numeric, generated from weight conversion)
- volumetric_weight (numeric, nullable)
- volume, volume_unit (numeric/text, nullable)
- description, storage_location (text, nullable)
- invoice_number, po_number, part_number, model, serial_number,
  lot_number, expiration_date (text/date, nullable)
- created_at (timestamptz)
```

**RLS Policies:**
- Inherit shipment access permissions

#### `shipment_charges`
Line items for billing (freight, handling, customs, etc.).

```sql
- id (uuid, primary key)
- shipment_id (uuid, foreign key to shipments)
- charge_type (charge_type enum: freight, handling, storage,
                insurance, customs, fuel, other)
- amount (numeric)
- currency (text, default 'USD')
- description, notes (text, nullable)
- created_at (timestamptz)
```

**RLS Policies:**
- Admins: full access
- Customers: read-only for their shipments

#### `shipment_events`
Tracking timeline events for each shipment.

```sql
- id (uuid, primary key)
- shipment_id (uuid, foreign key to shipments)
- event_type (text, e.g., 'status_change', 'location_update')
- event_description (text, nullable)
- location (text, nullable)
- operation_details (jsonb, nullable)
- created_by (uuid, foreign key to auth.users, nullable)
- created_at (timestamptz)
```

**RLS Policies:**
- Admins: full access
- Customers: read-only for their shipments

#### `invoices`
Billing invoices for customers.

```sql
- id (serial, primary key)
- customer_id (uuid, foreign key to customers)
- invoice_number (text, unique)
- amount (numeric)
- due_date (date)
- status (invoice_status enum: pending, paid, overdue)
- created_at (timestamptz)
```

**RLS Policies:**
- Admins: full access
- Customers: can only view their own invoices

### Database Functions

#### `generate_tracking_number()`
Auto-generates unique tracking numbers in format: `SKY-AIR-XXX` or `SKY-SEA-XXX`

#### `handle_new_user()`
Trigger function that creates a customer record when a new user registers via Supabase Auth.

---

## Authentication & Authorization

### Supabase Authentication

The application uses Supabase's built-in authentication system with email/password strategy.

**Auth Flow:**

1. User visits login page
2. Submits email/password
3. Supabase validates credentials
4. Returns JWT access token + refresh token
5. Frontend stores session
6. All API requests include token in Authorization header
7. Supabase validates token and enforces RLS policies

**Session Management:**

```typescript
// Auth utilities in src/auth/index.ts
- getUser() - Returns current user from session
- isAuthenticated() - Checks if user is logged in
- logout() - Clears session and redirects
```

**Protected Routes:**

Routes use `ProtectedRoute` component that:
- Checks authentication status
- Redirects to login if not authenticated
- Allows access if authenticated

**Role-Based Access:**

User roles are stored in `auth.users.raw_user_meta_data.role`:
- `admin` - Access to admin dashboard and all features
- `customer` - Access to customer dashboard and personal data only

Frontend routing enforces role separation:
- `/admin/*` routes for admins
- `/dashboard/*` routes for customers

Database RLS policies enforce server-side authorization.

### Demo Credentials

**Admin:**
- Email: `admin@ctcm.com`
- Password: `AdminPass123`

**Customer:**
- Email: `customer@example.com`
- Password: `CustomerPass123`

---

## Core Features

### 1. Warehouse Receipt Intake (Admin Only)

**Route:** `/admin/warehouse-receipt`

**Purpose:** Process incoming warehouse receipts and create shipment records.

**Workflow:**
1. Upload warehouse receipt image/PDF
2. Edge function extracts data using OCR
3. Admin reviews and edits extracted data
4. Admin adds packages with dimensions/weights
5. Admin adds charges (freight, handling, customs, etc.)
6. Admin assigns to customer
7. System generates tracking number
8. Shipment created with initial status `received`
9. Customer notified (future: email notification)

**Key Components:**
- `DocumentScanner` - Handles file upload and OCR extraction
- `WarehouseReceiptIntake` page - Multi-step form for complete shipment creation

### 2. Admin Dashboard

**Route:** `/admin`

**Purpose:** Central hub for managing all shipments and customers.

**Features:**
- Real-time shipment metrics (active, customs, ready for pickup, delayed)
- Searchable shipment table with filters (status, shipping method, customer)
- Quick actions for viewing shipments
- Priority alerts for customs clearance
- Customer management tab

**Key Metrics:**
- Active Shipments: All non-delivered shipments
- Awaiting Customs: Shipments in customs_clearance/customs_hold
- Ready for Pickup: Cleared and ready for customer
- Delayed: Shipments marked as delayed

### 3. Customer Dashboard

**Route:** `/dashboard`

**Purpose:** Customer portal for tracking personal shipments.

**Features:**
- Seasonal promotional banners
- Alert for packages awaiting decision (status: received)
- Searchable shipment table
- Real-time shipment updates via Supabase Realtime
- Click-through to detailed shipment view

**Search:** Searches tracking number, warehouse receipt number, and description

### 4. Shipment Details (Admin)

**Route:** `/admin/shipments/:id`

**Purpose:** Comprehensive shipment management interface.

**Features:**
- Complete shipment information (shipper, consignee, packages, charges)
- Status update with reason field
- Timeline of all shipment events
- Package details with dimensions and weights
- Total charges calculation
- Notes and special instructions

**Status Updates:**
- Admin can change status to any valid state
- Optional reason field (required for 'delayed')
- Creates shipment_event record
- Updates shipment.updated_at timestamp
- Real-time update to customer dashboard

### 5. Shipment Details (Customer)

**Route:** `/dashboard/shipments/:id`

**Purpose:** Customer-facing shipment tracking.

**Features:**
- Read-only shipment information
- Visual status progress indicator
- Timeline of tracking events
- Package details
- Delivery information

### 6. Pending Packages

**Route:** `/dashboard/pending-packages`

**Purpose:** Customer decision point for received packages.

**Features:**
- List of all packages with status `received`
- Options to ship now or hold for consolidation
- Estimated shipping costs
- Consolidation savings calculator (future)

### 7. Customer Management (Admin)

**Route:** `/admin` (Customers tab)

**Purpose:** Manage customer database.

**Features:**
- Add new customers
- Edit customer information
- Assign skybox addresses
- View customer shipment history
- Delete customers (with confirmation)

**Key Fields:**
- Name, email, phone, company, address
- Air Skybox Address (for air freight)
- Sea Skybox Address (for sea freight)
- Link to user account (optional for legacy customers)

### 8. Invoicing

**Route:** `/dashboard/invoices`

**Purpose:** Customer invoice viewing and payment tracking.

**Features:**
- List of all invoices
- Filter by status (pending, paid, overdue)
- Download invoice PDFs (future)
- Payment tracking

---

## Component Architecture

### Design System

The application uses a consistent design system with reusable components:

#### Base Components (`src/components/`)

**Button**
- Variants: `primary`, `secondary`, `danger`
- Sizes: `sm`, `md`, `lg`
- Supports icons, loading state, disabled state

**Input**
- Text input with label
- Error state display
- Optional placeholder and help text

**Select**
- Dropdown with label
- Options array: `{ value, label }`
- Error state display

**Textarea**
- Multi-line text input
- Rows configurable
- Error state display

**Badge**
- Status indicators
- Color-coded by shipment status
- Displays human-readable status labels

**Card**
- Container component
- Consistent padding and shadows
- Optional click handler

**Modal**
- Overlay dialog
- Configurable title and actions
- Backdrop click to close

**LoadingSkeleton**
- Placeholder for loading states
- Prevents layout shift

**EmptyState**
- User-friendly empty state messages
- Optional icon and action button

**Timeline**
- Vertical timeline for tracking events
- Status icons and timestamps
- Location information

**ShipmentProgress**
- Visual progress indicator
- Shows current status in shipment journey

#### Layout Components

**AuthenticatedLayout**
- Main application shell
- Responsive sidebar navigation
- User menu with logout
- Role-based navigation items
- Mobile hamburger menu

#### Page Components (`src/pages/`)

Each page is self-contained with:
- Data fetching logic
- State management
- Component composition
- Error handling

### Custom Hooks

**`useRealtimeShipments`** (`src/hooks/useRealtimeShipments.ts`)
- Fetches shipments from Supabase
- Subscribes to real-time updates
- Handles INSERT, UPDATE, DELETE events
- Filters by customer if specified
- Returns `{ shipments, loading, error }`

### State Management

The application uses React's built-in state management:
- `useState` for local component state
- `useEffect` for side effects and data fetching
- `useMemo` for computed values
- Context API not needed due to simple state requirements

### Form Handling

Forms use React Hook Form + Zod:

```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema)
});
```

Benefits:
- Type-safe validation
- Automatic error handling
- Performance optimization (minimal re-renders)
- Easy integration with UI components

---

## Development Workflow

### Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create `.env` file:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

   App runs at `http://localhost:5173`

### Development Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Lint code
npm run typecheck  # TypeScript type checking
```

### Code Style Guidelines

1. **TypeScript:**
   - Use explicit types for function parameters and return values
   - Define interfaces for all data structures
   - Avoid `any` type - use `unknown` if type is truly unknown

2. **Components:**
   - Functional components with hooks (no class components)
   - Props interface defined above component
   - Export component as named export
   - One component per file (except small sub-components)

3. **Naming Conventions:**
   - Components: PascalCase (`CustomerDashboard.tsx`)
   - Files: PascalCase for components, camelCase for utilities
   - Functions: camelCase (`fetchShipments`)
   - Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)
   - Types/Interfaces: PascalCase (`Shipment`, `ShipmentStatus`)

4. **File Organization:**
   - Keep files under 300 lines
   - Extract reusable logic to custom hooks
   - Co-locate related utilities with components
   - Use barrel exports (`index.ts`) for component folders

5. **Comments:**
   - Minimal comments - code should be self-documenting
   - Add comments for complex business logic
   - Document non-obvious workarounds

### Testing Strategy

**Current Status:** No automated tests implemented

**Recommended Testing Approach:**

1. **Unit Tests (Vitest):**
   - Utility functions
   - Custom hooks
   - Component logic

2. **Integration Tests (React Testing Library):**
   - User interactions
   - Form submissions
   - Navigation flows

3. **E2E Tests (Playwright):**
   - Critical user journeys
   - Authentication flow
   - Shipment creation workflow

### Git Workflow

**Branch Strategy:**
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches

**Commit Messages:**
Follow conventional commits:
```
feat: add customer management page
fix: resolve tracking number generation bug
docs: update steering document
refactor: extract shipment form logic to hook
```

---

## Deployment Guide

### Prerequisites

1. Supabase project created and configured
2. All database migrations applied
3. Edge functions deployed
4. Environment variables configured

### Build & Deploy

**Option 1: Static Hosting (Vercel, Netlify)**

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy `dist/` folder to hosting provider

3. Configure environment variables in hosting dashboard

4. Set up custom domain (optional)

**Option 2: Supabase Hosting**

Supabase does not provide frontend hosting. Use Option 1.

### Environment Variables

**Production Environment Variables:**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Never commit `.env` files. Use hosting provider's environment variable management.

### Database Migrations

All migrations are in `supabase/migrations/` directory.

**Apply migrations:**
```bash
# Using Supabase CLI
supabase db push

# Or use Supabase dashboard to run SQL directly
```

**Migration Files:**
- `20260201012429_create_customers_table.sql`
- `20260201013137_link_customers_to_users.sql`
- `20260201014407_create_invoices_table.sql`
- `20260201015346_add_company_column_to_customers.sql`
- `20260201015743_update_customer_policies.sql`
- `20260201021751_add_invoice_policies.sql`
- `20260201021805_add_address_to_customers.sql`
- `20260201022034_create_test_users.sql`
- `20260201022538_fix_auth_users.sql`
- `20260201022554_add_user_signup_trigger.sql`
- `20260201023827_fix_invoice_policies_jwt.sql`
- `20260201023840_fix_customer_policies_jwt.sql`
- `20260213162132_create_sample_shipments_fixed.sql`

### Edge Functions

**Deploy Edge Functions:**
```bash
# Using Supabase CLI
supabase functions deploy extract-receipt-data
supabase functions deploy create-test-users
```

**Edge Function Files:**
- `supabase/functions/extract-receipt-data/index.ts` - OCR for warehouse receipts
- `supabase/functions/create-test-users/index.ts` - Utility to create demo users

### Post-Deployment Checklist

- [ ] Verify all environment variables are set
- [ ] Test authentication flow (login, register, logout)
- [ ] Test admin dashboard loads shipments
- [ ] Test customer dashboard loads personal shipments
- [ ] Test shipment creation via warehouse receipt
- [ ] Test status updates propagate in real-time
- [ ] Verify RLS policies prevent unauthorized access
- [ ] Check mobile responsiveness
- [ ] Test with actual user accounts (not just demo)
- [ ] Monitor Supabase logs for errors

---

## Security Considerations

### Authentication Security

1. **Password Requirements:**
   - Minimum 6 characters (enforced by Supabase)
   - Consider increasing to 8+ characters for production

2. **Session Management:**
   - Sessions stored in Supabase Auth
   - Automatic token refresh
   - Logout clears all local storage

3. **Token Storage:**
   - Tokens managed by Supabase client library
   - Not directly accessible by JavaScript
   - Automatic PKCE flow for enhanced security

### Database Security

1. **Row Level Security (RLS):**
   - Enabled on ALL tables
   - Policies enforce customer can only access own data
   - Admins have full access via role check

2. **SQL Injection Prevention:**
   - Supabase client uses parameterized queries
   - Never construct raw SQL from user input

3. **Data Validation:**
   - All inputs validated on frontend (React Hook Form + Zod)
   - Server-side validation via Postgres constraints
   - Required fields enforced at database level

### Frontend Security

1. **XSS Prevention:**
   - React automatically escapes output
   - No use of `dangerouslySetInnerHTML`
   - Content Security Policy headers (configure in hosting)

2. **CSRF Protection:**
   - Supabase handles CSRF tokens automatically
   - All requests authenticated via JWT

3. **Sensitive Data:**
   - No API keys or secrets in frontend code
   - Environment variables used for configuration only
   - Supabase anon key is safe to expose (RLS enforces access)

### API Security

1. **Rate Limiting:**
   - Supabase provides built-in rate limiting
   - Configure in Supabase dashboard

2. **CORS:**
   - Configure allowed origins in Supabase dashboard
   - Restrict to production domain in production

### Recommendations

1. **Enable 2FA:** Configure multi-factor authentication in Supabase Auth
2. **Audit Logs:** Enable Supabase audit logs for compliance
3. **Regular Updates:** Keep dependencies updated (npm audit)
4. **Monitoring:** Set up error tracking (Sentry, LogRocket, etc.)
5. **Backups:** Configure automatic database backups in Supabase

---

## Future Roadmap

### Phase 1: Core Enhancements (Next 3 months)

1. **Real-time Notifications**
   - Browser push notifications for status changes
   - Email notifications for critical events
   - SMS notifications (optional)

2. **Document Management**
   - Invoice PDF generation
   - Commercial invoice upload
   - Packing list upload
   - Download all documents as ZIP

3. **Advanced Search**
   - Full-text search across all fields
   - Saved search filters
   - Export search results to CSV

4. **Consolidation Workflow**
   - Bulk select packages for consolidation
   - Create consolidated shipments
   - Calculate consolidation savings

### Phase 2: Business Intelligence (3-6 months)

1. **Analytics Dashboard**
   - Shipment volume trends
   - Revenue analytics
   - Customer lifetime value
   - Popular routes and shipping methods

2. **Reporting**
   - Monthly shipment reports
   - Customer statements
   - Customs documentation
   - Financial reports

3. **Performance Metrics**
   - Average delivery time
   - Customs clearance time
   - Customer satisfaction scores

### Phase 3: Advanced Features (6-12 months)

1. **Multi-tenant Support**
   - Support multiple freight forwarders
   - White-label branding per tenant
   - Tenant-specific pricing

2. **API & Integrations**
   - Public API for third-party integrations
   - Webhook support for status updates
   - Integration with shipping carriers (FedEx, DHL, etc.)
   - Integration with customs systems

3. **Mobile App**
   - Native iOS/Android apps
   - Barcode scanning for packages
   - Push notifications
   - Offline mode

4. **Advanced Pricing**
   - Dynamic pricing engine
   - Volume discounts
   - Customer-specific pricing
   - Quote generation

5. **Warehouse Management**
   - Inventory tracking
   - Storage location management
   - Package consolidation workflow
   - Barcode/QR code scanning

### Phase 4: Scale & Optimize (12+ months)

1. **Performance Optimization**
   - Code splitting and lazy loading
   - Server-side rendering (Next.js migration)
   - CDN for static assets
   - Image optimization

2. **Internationalization**
   - Multi-language support
   - Multi-currency support
   - Region-specific compliance

3. **AI/ML Features**
   - Predictive delivery times
   - Automatic package classification
   - Fraud detection
   - Chatbot support

### Technical Debt & Improvements

1. **Testing:**
   - Implement unit tests (target 80% coverage)
   - Add integration tests for critical flows
   - E2E tests for user journeys
   - Visual regression testing

2. **Documentation:**
   - API documentation (OpenAPI/Swagger)
   - Component Storybook
   - Video tutorials for users
   - Admin training materials

3. **Code Quality:**
   - Set up pre-commit hooks (Husky)
   - Add code quality gates (SonarQube)
   - Implement dependency scanning
   - Regular security audits

4. **Accessibility:**
   - WCAG 2.1 AA compliance
   - Screen reader testing
   - Keyboard navigation improvements
   - Accessibility audit

---

## Appendix

### Quick Reference

**Key Files:**
- `src/lib/supabase.ts` - Supabase client initialization
- `src/auth/index.ts` - Auth utilities
- `src/types/index.ts` - TypeScript type definitions
- `src/App.tsx` - Main routing configuration
- `src/components/AuthenticatedLayout.tsx` - Layout wrapper

**Important Environment Variables:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

**Database Tables:**
- `customers` - Customer information
- `shipments` - Main shipment records
- `packages` - Package details
- `shipment_charges` - Billing line items
- `shipment_events` - Tracking timeline
- `invoices` - Customer invoices

**User Roles:**
- `admin` - Full system access
- `customer` - Personal data access only

### Glossary

**Freight Forwarding:** Service of organizing shipments for individuals or corporations to get goods from point of origin to destination.

**Skybox Address:** A US-based address provided to customers for shipping their online purchases before forwarding to Barbados.

**Warehouse Receipt:** Document issued by warehouse acknowledging receipt of goods.

**Consignee:** Person or company to whom goods are shipped.

**Shipper:** Person or company sending goods.

**Pro Number:** Progressive rotating number assigned to freight shipment, used for tracking.

**Bill of Lading:** Document issued by carrier acknowledging receipt of cargo for shipment.

**Customs Clearance:** Process of getting goods through customs to be allowed into a country.

**Consolidation:** Combining multiple small shipments into one larger shipment to save on freight costs.

**RLS (Row Level Security):** PostgreSQL feature that restricts which rows users can access in database tables.

**JWT (JSON Web Token):** Compact token format used for authentication.

**OCR (Optical Character Recognition):** Technology to extract text from images.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-13 | System | Initial steering document |

---

## Contact & Support

For questions or issues regarding this document or the system:
- Review the README.md for setup instructions
- Check Supabase dashboard for database and auth issues
- Review browser console and network tab for frontend errors
- Contact the development team

---

**End of Document**
