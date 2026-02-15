# Requirements Document: AWS Migration for Freight Forwarding Management System

## Introduction

This document specifies the requirements for migrating a production-ready freight forwarding management system from Supabase to AWS infrastructure. The migration must maintain all existing functionality while improving scalability, security, and operational excellence within a $15/month development budget constraint.

The system serves two user roles (admin and customer) with strict tenant isolation, providing real-time shipment tracking, warehouse receipt intake with OCR, customer management, and document storage capabilities.

## Glossary

- **System**: The Freight Forwarding Management System
- **Frontend_Application**: React 18 + TypeScript + Vite + Tailwind CSS web application
- **API_Layer**: AWS API Gateway + Lambda or AppSync GraphQL service layer
- **Auth_Service**: Amazon Cognito User Pool with admin and customer groups
- **Database**: Aurora PostgreSQL Serverless v2 or RDS PostgreSQL instance
- **OCR_Pipeline**: S3 + Textract + Lambda + Step Functions for warehouse receipt processing
- **Document_Store**: S3 bucket with presigned URLs for secure document access
- **Realtime_Service**: AppSync subscriptions, API Gateway WebSockets, or EventBridge for live updates
- **IaC**: Infrastructure as Code using AWS CDK TypeScript
- **CI_CD_Pipeline**: GitHub Actions workflows for automated testing and deployment
- **Tenant_ID**: Customer identifier used for data isolation
- **Admin_User**: User with full system access across all customers
- **Customer_User**: User with access only to their own tenant data
- **CTCM_Dev_Account**: AWS account 404875533723 in us-east-1 region
- **Supabase_Backend**: Current backend using PostgreSQL, Auth, Realtime, and Edge Functions
- **Migration_Phase**: Discrete stage in the phased migration approach
- **RLS**: Row Level Security policies in PostgreSQL for data isolation

## Requirements

### Requirement 1: Frontend Hosting Migration

**User Story:** As a system administrator, I want to host the React frontend on AWS infrastructure, so that I can leverage CloudFront CDN for global performance and reduce dependency on Supabase hosting.

#### Acceptance Criteria

1. THE System SHALL host the Frontend_Application static build on S3 with public read access
2. THE System SHALL serve the Frontend_Application through CloudFront distribution E34Q2E7TZIYZAB
3. WHEN a user requests the application, THE System SHALL serve assets with HTTPS encryption
4. THE System SHALL configure CloudFront cache behaviors for optimal performance
5. WHEN the Frontend_Application is updated, THE System SHALL invalidate CloudFront cache automatically
6. THE System SHALL enable S3 versioning for the frontend bucket
7. THE System SHALL configure appropriate CORS policies for API access

### Requirement 2: Authentication Service Migration

**User Story:** As a system administrator, I want to migrate authentication from Supabase Auth to Amazon Cognito, so that I can use native AWS authentication with role-based access control.

#### Acceptance Criteria

1. THE Auth_Service SHALL create a Cognito User Pool in CTCM_Dev_Account
2. THE Auth_Service SHALL define two user groups: admin and customer
3. WHEN a user registers, THE Auth_Service SHALL assign them to the appropriate group
4. THE Auth_Service SHALL issue JWT tokens with group membership claims
5. WHEN a user authenticates, THE Auth_Service SHALL return access tokens valid for 15 minutes
6. THE Auth_Service SHALL return refresh tokens valid for 7 days
7. THE Auth_Service SHALL enforce password complexity requirements
8. WHERE MFA is enabled, THE Auth_Service SHALL require multi-factor authentication for admin users
9. THE Auth_Service SHALL support email and password authentication
10. THE Auth_Service SHALL provide password reset functionality via email

### Requirement 3: Database Migration

**User Story:** As a system administrator, I want to migrate the PostgreSQL database from Supabase to AWS, so that I can have full control over database configuration and scaling.

#### Acceptance Criteria

1. THE Database SHALL preserve the existing schema structure from Supabase
2. THE Database SHALL store customers table with columns: id, user_id, name, email, phone, company, address, air_skybox_address, sea_skybox_address
3. THE Database SHALL store shipments table with tracking_number, warehouse_receipt_number, customer_id, status, dates, carrier details, and location information
4. THE Database SHALL store packages table with shipment_id, dimensions, weight, and storage details
5. THE Database SHALL store shipment_charges table with charge_type, amount, and currency
6. THE Database SHALL store shipment_events table with event_type, description, location, and timestamps
7. THE Database SHALL store invoices table with customer_id, invoice_number, amount, due_date, and status
8. THE Database SHALL enforce foreign key constraints between related tables
9. THE Database SHALL enable encryption at rest using AWS KMS
10. THE Database SHALL enable automated daily backups with 7-day retention
11. THE Database SHALL be accessible only from the API_Layer security group
12. WHEN the Database is created, THE System SHALL migrate existing data from Supabase

### Requirement 4: API Layer Implementation

**User Story:** As a developer, I want a RESTful or GraphQL API layer on AWS, so that the frontend can interact with backend services securely and efficiently.

#### Acceptance Criteria

1. THE API_Layer SHALL authenticate requests using JWT tokens from Auth_Service
2. THE API_Layer SHALL validate JWT token signatures before processing requests
3. WHEN a request contains an invalid token, THE API_Layer SHALL return 401 Unauthorized
4. THE API_Layer SHALL extract user identity and group membership from JWT claims
5. THE API_Layer SHALL enforce tenant isolation by filtering queries with Tenant_ID
6. WHEN an Admin_User makes a request, THE API_Layer SHALL allow access to all tenant data
7. WHEN a Customer_User makes a request, THE API_Layer SHALL restrict access to their Tenant_ID only
8. THE API_Layer SHALL enable CORS for the Frontend_Application origin
9. THE API_Layer SHALL log all requests to CloudWatch Logs
10. THE API_Layer SHALL implement rate limiting to prevent abuse
11. THE API_Layer SHALL return appropriate HTTP status codes for all responses
12. THE API_Layer SHALL validate request payloads against defined schemas

### Requirement 5: Customer Management API

**User Story:** As an admin user, I want to manage customer records via API, so that I can create, update, and view customer information.

#### Acceptance Criteria

1. WHEN an Admin_User requests GET /customers, THE API_Layer SHALL return all customers
2. WHEN a Customer_User requests GET /customers, THE API_Layer SHALL return only their customer record
3. WHEN an Admin_User requests POST /customers, THE API_Layer SHALL create a new customer record
4. WHEN an Admin_User requests PUT /customers/:id, THE API_Layer SHALL update the customer record
5. WHEN an Admin_User requests GET /customers/:id, THE API_Layer SHALL return the customer details
6. THE API_Layer SHALL validate customer email format before creation
7. THE API_Layer SHALL ensure customer email uniqueness
8. THE API_Layer SHALL associate customer records with Auth_Service user_id

### Requirement 6: Shipment Management API

**User Story:** As a user, I want to manage shipments via API, so that I can track packages through the freight forwarding process.

#### Acceptance Criteria

1. WHEN an Admin_User requests GET /shipments, THE API_Layer SHALL return all shipments
2. WHEN a Customer_User requests GET /shipments, THE API_Layer SHALL return only shipments for their Tenant_ID
3. WHEN an Admin_User requests POST /shipments, THE API_Layer SHALL create a new shipment with generated tracking_number
4. WHEN an Admin_User requests PUT /shipments/:id, THE API_Layer SHALL update the shipment record
5. WHEN a user requests GET /shipments/:id, THE API_Layer SHALL return shipment details with associated packages and charges
6. THE API_Layer SHALL validate shipment status transitions
7. THE API_Layer SHALL support filtering shipments by status, date range, and customer
8. THE API_Layer SHALL support searching shipments by tracking_number or warehouse_receipt_number
9. WHEN a shipment status changes, THE API_Layer SHALL create a shipment_event record
10. THE API_Layer SHALL calculate volumetric weight for packages automatically

### Requirement 7: Real-Time Updates

**User Story:** As a customer user, I want to receive real-time updates when my shipment status changes, so that I can track my packages without refreshing the page.

#### Acceptance Criteria

1. WHEN a shipment status changes, THE Realtime_Service SHALL push an update to subscribed clients
2. WHEN a Customer_User subscribes to updates, THE Realtime_Service SHALL filter events by their Tenant_ID
3. WHEN an Admin_User subscribes to updates, THE Realtime_Service SHALL deliver all shipment events
4. THE Realtime_Service SHALL maintain WebSocket connections for active clients
5. WHEN a connection is lost, THE Realtime_Service SHALL allow clients to reconnect and resume
6. THE Realtime_Service SHALL authenticate subscription requests using JWT tokens
7. THE Realtime_Service SHALL deliver events within 2 seconds of the triggering action

### Requirement 8: OCR Processing Pipeline

**User Story:** As an admin user, I want to upload warehouse receipts and extract data automatically, so that I can quickly create shipment records without manual data entry.

#### Acceptance Criteria

1. WHEN an Admin_User uploads a document to /receipts/upload, THE System SHALL store it in Document_Store
2. WHEN a document is uploaded, THE OCR_Pipeline SHALL trigger Textract processing
3. THE OCR_Pipeline SHALL extract text from the uploaded document
4. THE OCR_Pipeline SHALL parse extracted text for shipment details
5. WHEN OCR processing completes, THE OCR_Pipeline SHALL return structured shipment data
6. IF OCR processing fails, THEN THE OCR_Pipeline SHALL return an error with details
7. THE OCR_Pipeline SHALL support PDF and image formats
8. THE OCR_Pipeline SHALL process documents asynchronously using Step Functions
9. WHEN processing is complete, THE System SHALL notify the admin user
10. THE OCR_Pipeline SHALL store processing results for audit purposes

### Requirement 9: Document Storage and Access

**User Story:** As a user, I want to store and retrieve invoices and receipts securely, so that I can maintain records for each shipment.

#### Acceptance Criteria

1. THE Document_Store SHALL organize documents by customer and shipment
2. WHEN a user uploads a document, THE System SHALL generate a unique document identifier
3. THE System SHALL store document metadata in the Database
4. WHEN a user requests a document, THE System SHALL generate a presigned URL valid for 15 minutes
5. THE System SHALL enforce tenant isolation for document access
6. WHEN a Customer_User requests a document, THE System SHALL verify it belongs to their Tenant_ID
7. THE Document_Store SHALL enable versioning for all documents
8. THE Document_Store SHALL implement lifecycle policies to move old documents to Glacier after 90 days
9. THE Document_Store SHALL encrypt all documents at rest using KMS
10. THE System SHALL support document types: invoice, receipt, customs_document, packing_list

### Requirement 10: Search Functionality

**User Story:** As a user, I want to search across shipments by various criteria, so that I can quickly find specific shipments.

#### Acceptance Criteria

1. WHEN a user searches by tracking_number, THE System SHALL return matching shipments
2. WHEN a user searches by warehouse_receipt_number, THE System SHALL return matching shipments
3. WHEN a user searches by customer name, THE System SHALL return matching shipments
4. WHEN a user searches by description keywords, THE System SHALL return matching shipments
5. THE System SHALL support full-text search using PostgreSQL capabilities
6. THE System SHALL return search results within 2 seconds
7. WHEN a Customer_User searches, THE System SHALL filter results by their Tenant_ID
8. THE System SHALL support pagination for search results
9. THE System SHALL highlight matching terms in search results

### Requirement 11: Infrastructure as Code

**User Story:** As a DevOps engineer, I want all AWS infrastructure defined in code, so that I can version control, review, and deploy infrastructure consistently.

#### Acceptance Criteria

1. THE IaC SHALL use AWS CDK with TypeScript
2. THE IaC SHALL define separate stacks for networking, auth, database, API, frontend, and observability
3. THE IaC SHALL tag all resources with Environment, Application, ManagedBy, Owner, and CostCenter
4. THE IaC SHALL store all code in the GitHub repository
5. WHEN IaC is deployed, THE System SHALL create resources in CTCM_Dev_Account in us-east-1
6. THE IaC SHALL use AWS Secrets Manager for sensitive configuration
7. THE IaC SHALL define IAM roles with least privilege permissions
8. THE IaC SHALL enable CloudTrail logging for all API calls
9. THE IaC SHALL configure security groups with deny-by-default rules
10. THE IaC SHALL output important resource identifiers for CI/CD use

### Requirement 12: CI/CD Pipeline

**User Story:** As a developer, I want automated testing and deployment pipelines, so that code changes are validated and deployed consistently.

#### Acceptance Criteria

1. WHEN a pull request is created, THE CI_CD_Pipeline SHALL run linting checks
2. WHEN a pull request is created, THE CI_CD_Pipeline SHALL run type checking
3. WHEN a pull request is created, THE CI_CD_Pipeline SHALL run unit tests
4. WHEN a pull request is created, THE CI_CD_Pipeline SHALL run security scans
5. WHEN code is merged to develop branch, THE CI_CD_Pipeline SHALL deploy to CTCM_Dev_Account
6. THE CI_CD_Pipeline SHALL use GitHub OIDC for AWS authentication
7. THE CI_CD_Pipeline SHALL build the Frontend_Application and upload to S3
8. THE CI_CD_Pipeline SHALL deploy Lambda functions with the API_Layer code
9. THE CI_CD_Pipeline SHALL run database migrations automatically
10. WHEN deployment fails, THE CI_CD_Pipeline SHALL rollback to the previous version
11. THE CI_CD_Pipeline SHALL send notifications on deployment success or failure
12. THE CI_CD_Pipeline SHALL require manual approval for production deployments

### Requirement 13: Data Migration

**User Story:** As a system administrator, I want to migrate existing data from Supabase to AWS, so that all historical records are preserved during the transition.

#### Acceptance Criteria

1. THE System SHALL export all customer records from Supabase
2. THE System SHALL export all shipment records with related packages, charges, and events
3. THE System SHALL export all invoice records
4. THE System SHALL preserve all foreign key relationships during migration
5. THE System SHALL migrate user accounts from Supabase Auth to Cognito
6. THE System SHALL preserve user passwords or trigger password reset emails
7. THE System SHALL migrate documents from Supabase Storage to S3
8. WHEN migration is complete, THE System SHALL validate data integrity
9. THE System SHALL provide a rollback mechanism if migration fails
10. THE System SHALL maintain Supabase as read-only during migration cutover

### Requirement 14: Security and Compliance

**User Story:** As a security officer, I want the system to follow AWS security best practices, so that customer data is protected and compliance requirements are met.

#### Acceptance Criteria

1. THE System SHALL encrypt all data at rest using AWS KMS
2. THE System SHALL encrypt all data in transit using TLS 1.2 or higher
3. THE System SHALL implement least privilege IAM policies for all services
4. THE System SHALL store secrets in AWS Secrets Manager
5. THE System SHALL enable CloudTrail logging for all AWS API calls
6. THE System SHALL configure security groups to deny all traffic by default
7. THE System SHALL enable VPC Flow Logs for network monitoring
8. THE System SHALL implement WAF rules on CloudFront for production
9. THE System SHALL enforce MFA for Admin_User accounts in production
10. THE System SHALL rotate database credentials every 90 days
11. THE System SHALL scan container images and dependencies for vulnerabilities
12. THE System SHALL enforce tenant isolation at the application layer

### Requirement 15: Observability and Monitoring

**User Story:** As an operations engineer, I want comprehensive monitoring and logging, so that I can detect and troubleshoot issues quickly.

#### Acceptance Criteria

1. THE System SHALL send all Lambda logs to CloudWatch Logs
2. THE System SHALL send all API Gateway logs to CloudWatch Logs
3. THE System SHALL retain logs for 14 days in development
4. THE System SHALL create CloudWatch alarms for API error rates above 1%
5. THE System SHALL create CloudWatch alarms for API latency above 2 seconds
6. THE System SHALL create CloudWatch alarms for database CPU above 80%
7. THE System SHALL create CloudWatch alarms for Lambda errors
8. THE System SHALL create budget alerts at 80% and 100% of monthly allocation
9. THE System SHALL track custom metrics for business events
10. THE System SHALL enable X-Ray tracing for distributed request tracking
11. THE System SHALL create dashboards for key performance indicators
12. WHEN an alarm triggers, THE System SHALL send notifications via SNS

### Requirement 16: Cost Optimization

**User Story:** As a budget owner, I want the system to operate within the $15/month development budget, so that costs remain predictable and controlled.

#### Acceptance Criteria

1. THE System SHALL use serverless services where possible to minimize fixed costs
2. THE System SHALL configure Lambda functions with appropriate memory allocation
3. THE System SHALL implement S3 lifecycle policies to transition old data to cheaper storage
4. THE System SHALL use Aurora Serverless v2 with minimum capacity of 0.5 ACU
5. THE System SHALL configure CloudWatch Logs retention to 14 days maximum
6. THE System SHALL delete unused resources automatically
7. THE System SHALL monitor daily costs using AWS Cost Explorer
8. WHEN costs exceed 80% of budget, THE System SHALL send alerts
9. THE System SHALL use VPC endpoints instead of NAT Gateway where possible
10. THE System SHALL right-size all resources based on actual usage patterns

### Requirement 17: Phased Migration Strategy

**User Story:** As a project manager, I want a phased migration approach, so that we can reduce risk and validate each step before proceeding.

#### Acceptance Criteria

1. THE System SHALL complete Phase 0: stabilize PoC and add tests before migration
2. THE System SHALL complete Phase 1: host frontend on AWS while keeping Supabase backend
3. THE System SHALL complete Phase 2: migrate authentication to Cognito
4. THE System SHALL complete Phase 3: migrate database and implement API layer
5. THE System SHALL complete Phase 4: implement real-time updates and OCR pipeline
6. THE System SHALL complete Phase 5: full cutover and decommission Supabase
7. WHEN each phase completes, THE System SHALL validate functionality before proceeding
8. THE System SHALL maintain rollback capability for each phase
9. THE System SHALL document lessons learned after each phase
10. THE System SHALL maintain zero downtime during phase transitions

### Requirement 18: Repository Structure

**User Story:** As a developer, I want a well-organized monorepo structure, so that code is easy to navigate and maintain.

#### Acceptance Criteria

1. THE System SHALL organize code in a monorepo with /apps, /infra, /docs, and /scripts directories
2. THE System SHALL place frontend code in /apps/web
3. THE System SHALL place API code in /apps/api
4. THE System SHALL place CDK infrastructure code in /infra
5. THE System SHALL place documentation in /docs
6. THE System SHALL place migration scripts in /scripts
7. THE System SHALL use a shared /packages directory for common code
8. THE System SHALL define workspace configuration for monorepo tooling
9. THE System SHALL include README files in each major directory
10. THE System SHALL maintain a root-level CHANGELOG for tracking changes

### Requirement 19: Testing Strategy

**User Story:** As a quality engineer, I want comprehensive testing at all levels, so that we can ensure system reliability and catch bugs early.

#### Acceptance Criteria

1. THE System SHALL include unit tests for all business logic functions
2. THE System SHALL include integration tests for API endpoints
3. THE System SHALL include end-to-end tests for critical user flows
4. THE System SHALL achieve minimum 80% code coverage for backend code
5. THE System SHALL run tests automatically in CI/CD pipeline
6. THE System SHALL include property-based tests for data validation logic
7. THE System SHALL include load tests for API performance validation
8. THE System SHALL include security tests for authentication and authorization
9. WHEN tests fail, THE CI_CD_Pipeline SHALL block deployment
10. THE System SHALL maintain test data fixtures for consistent testing

### Requirement 20: Disaster Recovery and Business Continuity

**User Story:** As a business owner, I want disaster recovery capabilities, so that the system can recover quickly from failures.

#### Acceptance Criteria

1. THE System SHALL enable automated backups for the Database with 7-day retention
2. THE System SHALL test backup restoration monthly
3. THE System SHALL replicate critical data to us-east-2 for disaster recovery
4. THE System SHALL document recovery procedures for all components
5. THE System SHALL define Recovery Time Objective (RTO) of 4 hours for development
6. THE System SHALL define Recovery Point Objective (RPO) of 24 hours for development
7. WHEN a component fails, THE System SHALL fail gracefully with appropriate error messages
8. THE System SHALL maintain health check endpoints for all services
9. THE System SHALL implement circuit breakers for external service calls
10. THE System SHALL document incident response procedures
