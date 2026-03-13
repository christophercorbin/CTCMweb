# Changelog

All notable changes to CargoLink Barbados are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [0.3.0] - March 2026

### Added
- **Warehouse Receipt Intake** (`/admin/warehouse-receipt`): Admin page with DocumentScanner component, accepts PDFs + images, uploads to S3 `receipts/` prefix, triggers Textract OCR via Step Functions
- **Admin sidebar navigation**: Process Receipt (ScanLine icon) and Invoices (Receipt icon) links
- **Admin-created customer workflow**: `createCustomerWithAccount` AppSync mutation → `adminCreateCustomer` Lambda creates Cognito account (FORCE_CHANGE_PASSWORD), DynamoDB Customer record, and sends branded SES welcome email with skybox addresses and temp password
- **Login new-password step**: Handles `CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED` challenge for admin-created accounts transparently in the Login page
- **`cognitoConfirmNewPassword`** helper in `cognito.ts`
- **Ship / Hold customer instruction** field on Shipment, with customer-facing decision UI
- **Edit and delete** for shipments, packages, and invoices in admin views
- **Admin shipment status display** for ship/hold/awaiting customer decision
- **Auto-fill shipping addresses** from customer name (Skybox address generation)
- **Skybox address display formatting** and phone auto-formatting

### Fixed
- **`USER_PASSWORD_AUTH` not enabled**: Added `cfnUserPoolClient.explicitAuthFlows` in `backend.ts` to enable `ALLOW_USER_PASSWORD_AUTH` — without this, all logins via `cognitoSignIn` were failing since Amplify Gen 2 only enables SRP by default
- **`GRAPHQL_API_ENDPOINT` not set for `postConfirmation` Lambda**: Amplify injects `AMPLIFY_DATA_GRAPHQL_ENDPOINT` for `allow.resource()`, not `GRAPHQL_API_ENDPOINT`. Now explicitly set in `backend.ts`
- **`UserNotConfirmedException`** at login now redirects to `/confirm?email=...` instead of showing a generic error
- **`grantMutation` missing for `postConfirmation`**: Lambda now has IAM permission to call AppSync mutations
- **Skybox address Barbados label terminology** restored throughout UI

### Changed
- `DocumentScanner` no longer shows "Coming in Phase 4" — OCR is live
- `CustomerManagement` create flow now calls `createCustomerWithAccount` mutation instead of directly creating a DynamoDB record

---

## [0.2.0] - February 2026

### Added
- **Amplify Gen 2 backend**: Full migration from stubbed API to live AppSync + DynamoDB
- **AppSync schema**: Customer, Shipment, Package, ShipmentCharge, ShipmentEvent, Invoice models
- **Cognito groups**: `admin` and `customer` with fine-grained AppSync authorization
- **`post-confirmation` Lambda**: Creates DynamoDB Customer record on email verification, adds user to `customer` group, sets `custom:customerId` and `custom:role` attributes
- **`status-notifier` Lambda**: AppSync custom mutation handler, sends branded SES emails on shipment status changes
- **OCR pipeline**: `ocr-trigger` (S3 → Step Functions) + `ocr-processor` (Textract) Lambdas with Step Functions state machine
- **Real-time shipment list**: `observeQuery` subscription in `useShipments` hook
- **Admin dashboard**: Full customer and shipment management
- **Admin shipment details**: Status updates, packages, charges, events, invoices
- **Admin invoices page** (`/admin/invoices`)
- **Customer pages**: Dashboard, shipment details, pending packages, customer info, invoices
- **Self-registration flow**: `/register` → `/confirm` → `/login`
- **SES email permissions** for `statusNotifier` Lambda
- **Step Functions OCR state machine** wired in `backend.ts`

### Removed
- All RDS PostgreSQL infrastructure
- API Gateway REST API
- Supabase dependencies and code
- VPC / NetworkStack / CDK manual stacks
- "Coming in Phase 3/4" placeholder messages (features are now live)

---

## [0.1.0] - February 2026

### Added
- AWS Amplify Hosting with automatic CI/CD from GitHub (`main` branch)
- AWS Cognito authentication (migrated from Supabase)
- JWT token management via `aws-amplify/auth`
- Protected routes (`ProtectedRoute` component with `requireAdmin` flag)
- Monorepo structure with npm workspaces (`apps/web`, `packages/*`, `amplify`)
- Basic UI components and pages (dashboard, admin, shipment tracking, invoices)
- Demo / preview mode with mock data (no backend required)

### Removed
- Supabase Auth, Supabase client, all `@supabase/supabase-js` dependencies
- Supabase Edge Functions

---

## [0.0.1] - February 2026

### Added
- Initial React + TypeScript + Vite + Tailwind CSS frontend
- React Router navigation
- Core UI components
- Mock data for development preview

---

**Maintained by**: Christopher Corbin
**Last Updated**: March 2026
