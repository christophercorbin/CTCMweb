# Implementation Plan: AWS Migration for Freight Forwarding Management System

## Overview

This implementation plan breaks down the AWS migration into discrete, executable tasks following the phased migration strategy. Each task builds incrementally on previous work, with checkpoints to validate functionality before proceeding.

The implementation uses TypeScript throughout: React 18 + Vite for frontend, Node.js 18 Lambda functions for API, and AWS CDK for infrastructure.

## Tasks

- [x] 1. Phase 0: Stabilization and Preparation
  - [x] 1.1 Set up monorepo structure with workspaces
    - Create root package.json with workspace configuration
    - Create apps/web, apps/api, infra, packages/types, packages/utils directories
    - Configure TypeScript for monorepo with project references
    - Set up ESLint and Prettier for consistent code style
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [x] 1.2 Configure AWS CDK project
    - Initialize CDK project in infra/ directory
    - Create CDK app entry point (bin/app.ts)
    - Set up stack structure (network, auth, data, api, frontend, ocr, observability)
    - Configure cdk.json with account 404875533723 and region us-east-1
    - _Requirements: 11.1, 11.2, 11.4_

  - [x] 1.3 Set up GitHub Actions CI/CD pipeline
    - Create .github/workflows/ci.yml for PR checks (lint, typecheck, test)
    - Create .github/workflows/deploy-dev.yml for development deployment
    - Configure GitHub OIDC authentication with AWS role arn:aws:iam::404875533723:role/GitHubActionsDeployRole
    - Add security scanning with npm audit and Snyk
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.6, 12.11_

  - [x] 1.4 Create shared TypeScript types package
    - Define Customer, Shipment, Package, ShipmentCharge, ShipmentEvent, Invoice, Document interfaces
    - Define UserContext, AuthTokens, API request/response types
    - Define enums for ShipmentStatus, PackageType, ChargeType, InvoiceStatus, DocumentType
    - Export all types from packages/types/src/index.ts
    - _Requirements: 18.7_

  - [ ]* 1.5 Add unit tests for existing Supabase code
    - Write unit tests for business logic functions
    - Write unit tests for data transformations
    - Achieve minimum 60% code coverage
    - _Requirements: 19.1, 19.4_

  - [x] 1.6 Checkpoint - Validate project setup
    - Ensure all tests pass, ask the user if questions arise.


- [x] 2. Phase 1: Frontend Hosting Migration
  - [x] 2.1 Create Frontend Stack with S3 and CloudFront
    - Implement FrontendStack in infra/lib/stacks/frontend-stack.ts
    - Create S3 bucket for frontend hosting with versioning
    - Configure CloudFront distribution E34Q2E7TZIYZAB to use S3 as origin
    - Set up CloudFront cache behaviors and invalidation
    - Configure S3 bucket policy for CloudFront access
    - _Requirements: 1.1, 1.2, 1.4, 1.6_

  - [x] 2.2 Update frontend build configuration
    - Configure Vite to build for production with proper base URL
    - Add build script to package.json
    - Configure environment variables for API endpoints
    - _Requirements: 1.1_

  - [x] 2.3 Update GitHub Actions to deploy frontend
    - Add S3 sync step to deploy-dev.yml workflow
    - Add CloudFront invalidation step after S3 sync
    - Test deployment pipeline with sample build
    - _Requirements: 1.5, 12.7, 12.8_

  - [ ]* 2.4 Write integration test for frontend deployment
    - Test that frontend is accessible via CloudFront URL
    - Test that assets are served with HTTPS
    - _Requirements: 1.3_

  - [x] 2.5 Checkpoint - Validate frontend hosting
    - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Phase 2: Authentication Migration
  - [x] 3.1 Create Auth Stack with Cognito User Pool
    - Implement AuthStack in infra/lib/stacks/auth-stack.ts
    - Create Cognito User Pool with email sign-in
    - Configure password policy (min 8 chars, uppercase, lowercase, numbers)
    - Create admin and customer user groups
    - Create User Pool Client for frontend
    - Configure token expiry (15 min access, 7 days refresh)
    - _Requirements: 2.1, 2.2, 2.7, 2.8_

  - [x] 3.2 Implement authentication service in frontend
    - Create auth service using AWS Amplify or Cognito SDK
    - Implement login, logout, register, password reset functions
    - Implement token storage and refresh logic
    - Add authentication context provider for React
    - _Requirements: 2.9, 2.10_

  - [x] 3.3 Update frontend to use Cognito authentication
    - Replace Supabase Auth calls with Cognito auth service
    - Update login, register, password reset pages
    - Update API client to use Cognito JWT tokens
    - Test authentication flows in development
    - _Requirements: 2.3, 2.4, 2.5, 2.6_

  - [ ]* 3.4 Write property test for user registration group assignment
    - **Property 1: User registration assigns correct group**
    - **Validates: Requirements 2.3**

  - [ ]* 3.5 Write property test for JWT token group membership
    - **Property 2: JWT tokens contain group membership**
    - **Validates: Requirements 2.4**

  - [ ]* 3.6 Write property test for access token expiry
    - **Property 3: Access token expiry is 15 minutes**
    - **Validates: Requirements 2.5**

  - [ ]* 3.7 Write property test for refresh token expiry
    - **Property 4: Refresh token expiry is 7 days**
    - **Validates: Requirements 2.6**

  - [ ]* 3.8 Write property test for password complexity validation
    - **Property 5: Password complexity validation**
    - **Validates: Requirements 2.7**

  - [x] 3.9 Create data migration script for user accounts
    - Export users from Supabase Auth
    - Create script to import users to Cognito
    - Map Supabase user IDs to Cognito subs
    - Trigger password reset emails for all users
    - _Requirements: 13.5, 13.6_

  - [x] 3.10 Checkpoint - Validate authentication migration
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Phase 3: Database and API Migration
  - [x] 4.1 Create Network Stack with VPC and Security Groups
    - Implement NetworkStack in infra/lib/stacks/network-stack.ts
    - Create VPC with public and private subnets (2 AZs)
    - Create security groups for RDS and Lambda
    - Configure security group rules (Lambda → RDS on port 5432)
    - _Requirements: 11.9_

  - [x] 4.2 Create Data Stack with RDS and S3
    - Implement DataStack in infra/lib/stacks/data-stack.ts
    - Create Secrets Manager secret for database credentials
    - Create RDS PostgreSQL t4g.micro instance with encryption
    - Configure automated backups (7-day retention)
    - Create S3 bucket for documents with encryption and versioning
    - Create S3 bucket for frontend hosting
    - _Requirements: 3.9, 3.10, 9.7, 9.8, 9.9_

  - [x] 4.3 Create database schema migration script
    - Write SQL script to create all tables (customers, shipments, packages, charges, events, invoices, documents)
    - Add foreign key constraints
    - Add indexes for performance
    - Add full-text search configuration for shipments
    - Deploy schema to RDS instance
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 4.4 Implement database connection module
    - Create database.ts in apps/api/src/lib with connection pooling
    - Use Secrets Manager to retrieve database credentials
    - Implement connection reuse for Lambda
    - Add error handling and retry logic
    - _Requirements: 11.6_

  - [x] 4.5 Implement base repository with tenant isolation
    - Create base-repository.ts with common CRUD operations
    - Implement tenant isolation middleware
    - Add query filtering based on user role (admin vs customer)
    - _Requirements: 4.5, 4.6, 4.7, 14.12_

  - [x] 4.6 Implement customer repository and service
    - Create customer-repository.ts with database operations
    - Create customer-service.ts with business logic
    - Implement email validation and uniqueness checks
    - _Requirements: 5.6, 5.7, 5.8_

  - [x] 4.7 Implement customers Lambda handler
    - Create handlers/customers.ts with GET, POST, PUT endpoints
    - Implement request routing and validation
    - Implement tenant isolation for customer users
    - Add error handling and logging
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 4.8 Write property test for customer tenant isolation
    - **Property 10: Customer list tenant isolation**
    - **Validates: Requirements 5.2**

  - [ ]* 4.9 Write property test for admin customer access
    - **Property 11: Admin customer list access**
    - **Validates: Requirements 5.1**

  - [ ]* 4.10 Write property test for email format validation
    - **Property 19: Email format validation**
    - **Validates: Requirements 5.6**

  - [ ]* 4.11 Write property test for email uniqueness
    - **Property 20: Email uniqueness enforcement**
    - **Validates: Requirements 5.7**

  - [x] 4.12 Implement shipment repository and service
    - Create shipment-repository.ts with database operations
    - Create shipment-service.ts with business logic
    - Implement tracking number generation
    - Implement status transition validation
    - Implement volumetric weight calculation
    - _Requirements: 6.3, 6.6, 6.10_

  - [x] 4.13 Implement shipments Lambda handler
    - Create handlers/shipments.ts with GET, POST, PUT endpoints
    - Implement filtering by status, date range, customer
    - Implement search by tracking number and receipt number
    - Implement tenant isolation for customer users
    - Create shipment event on status change
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7, 6.8, 6.9_

  - [ ]* 4.14 Write property test for shipment tenant isolation
    - **Property 12: Shipment list tenant isolation**
    - **Validates: Requirements 6.2**

  - [ ]* 4.15 Write property test for tracking number uniqueness
    - **Property 22: Tracking number generation uniqueness**
    - **Validates: Requirements 6.3**

  - [ ]* 4.16 Write property test for status transition validation
    - **Property 23: Shipment status transition validation**
    - **Validates: Requirements 6.6**

  - [ ]* 4.17 Write property test for status change event creation
    - **Property 24: Status change event creation**
    - **Validates: Requirements 6.9**

  - [ ]* 4.18 Write property test for volumetric weight calculation
    - **Property 25: Volumetric weight calculation**
    - **Validates: Requirements 6.10**

  - [ ] 4.19 Implement search Lambda handler
    - Create handlers/search.ts with full-text search
    - Implement search by tracking number, receipt number, customer name, description
    - Implement pagination
    - Implement tenant isolation for customer users
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.7, 10.8_

  - [ ]* 4.20 Write property test for search tenant isolation
    - **Property 17: Search result tenant isolation**
    - **Validates: Requirements 10.7**

  - [ ]* 4.21 Write property test for search pagination
    - **Property 40: Search pagination**
    - **Validates: Requirements 10.8**

  - [ ] 4.22 Implement documents Lambda handler
    - Create handlers/documents.ts with upload and download endpoints
    - Generate presigned URLs for S3 upload and download
    - Store document metadata in database
    - Implement tenant isolation for document access
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.10_

  - [ ]* 4.23 Write property test for document tenant isolation
    - **Property 14: Document access tenant isolation**
    - **Validates: Requirements 9.5, 9.6**

  - [ ]* 4.24 Write property test for presigned URL expiry
    - **Property 50: Presigned URL expiry**
    - **Validates: Requirements 9.4**

  - [ ] 4.25 Implement invoices Lambda handler
    - Create handlers/invoices.ts with GET, POST, PUT endpoints
    - Implement tenant isolation for customer users
    - _Requirements: Requirement 15 (implied from schema)_

  - [x] 4.26 Create API Stack with API Gateway and Lambda
    - Implement ApiStack in infra/lib/stacks/api-stack.ts
    - Create API Gateway REST API with CORS configuration
    - Create JWT authorizer using Cognito User Pool
    - Deploy all Lambda functions
    - Create API resources and methods for customers, shipments, documents, invoices, search
    - Configure Lambda environment variables (database secret, bucket names)
    - Grant IAM permissions (Secrets Manager, S3, CloudWatch Logs)
    - _Requirements: 4.1, 4.2, 4.8, 4.9, 4.10, 4.11, 11.7_

  - [ ]* 4.27 Write property test for JWT signature validation
    - **Property 6: JWT signature validation**
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 4.28 Write property test for user context extraction
    - **Property 7: User context extraction from JWT**
    - **Validates: Requirements 4.4**

  - [ ]* 4.29 Write property test for request logging
    - **Property 26: Request logging**
    - **Validates: Requirements 4.9**

  - [ ]* 4.30 Write property test for request payload validation
    - **Property 28: Request payload validation**
    - **Validates: Requirements 4.12**

  - [ ] 4.31 Update frontend API client to use API Gateway
    - Update API client base URL to API Gateway endpoint
    - Update all API calls to use new endpoints
    - Test all frontend features with new API
    - _Requirements: 4.1_

  - [ ] 4.32 Create data migration script from Supabase to RDS
    - Export all data from Supabase (customers, shipments, packages, charges, events, invoices)
    - Transform data (map user IDs, validate foreign keys)
    - Import data to RDS
    - Validate data integrity (row counts, foreign keys, spot checks)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.8, 13.9_

  - [ ]* 4.33 Write integration tests for API endpoints
    - Test customer CRUD operations
    - Test shipment CRUD operations
    - Test search functionality
    - Test document upload and download
    - _Requirements: 19.2_

  - [ ] 4.34 Checkpoint - Validate database and API migration
    - Ensure all tests pass, ask the user if questions arise.


- [ ] 5. Phase 4: OCR and Real-Time Features
  - [ ] 5.1 Create OCR Stack with Textract and Step Functions
    - Implement OcrStack in infra/lib/stacks/ocr-stack.ts
    - Create Lambda function to trigger Textract on S3 upload
    - Create Lambda function to parse Textract results
    - Create Lambda function to validate extracted data
    - Create Lambda function to store results in database
    - Create Step Functions state machine to orchestrate OCR workflow
    - Configure S3 event notification to trigger Step Functions
    - _Requirements: 8.2, 8.8_

  - [ ] 5.2 Implement OCR trigger Lambda
    - Create handlers/ocr-trigger.ts to start Step Functions execution
    - Extract document metadata from S3 event
    - Start Textract async job (DetectDocumentText)
    - _Requirements: 8.1, 8.2_

  - [ ] 5.3 Implement OCR parse Lambda
    - Create handlers/ocr-parse.ts to parse Textract JSON output
    - Extract shipment fields (tracking number, dates, weights, dimensions)
    - Use regex patterns and heuristics for field extraction
    - _Requirements: 8.3, 8.4_

  - [ ] 5.4 Implement OCR validate Lambda
    - Create handlers/ocr-validate.ts to validate extracted fields
    - Check required fields are present
    - Validate data types and formats
    - _Requirements: 8.4_

  - [ ] 5.5 Implement OCR store Lambda
    - Create handlers/ocr-store.ts to store results in database
    - Create or update shipment record with extracted data
    - Store OCR job metadata for audit
    - Send notification on completion
    - _Requirements: 8.5, 8.9, 8.10_

  - [ ] 5.6 Implement OCR API endpoint
    - Create POST /ocr/process endpoint to upload receipt and trigger OCR
    - Create GET /ocr/jobs/:jobId endpoint to check status
    - Return structured shipment data on completion
    - Return error details on failure
    - _Requirements: 8.5, 8.6_

  - [ ]* 5.7 Write property test for OCR document storage
    - **Property 41: Document upload storage**
    - **Validates: Requirements 8.1**

  - [ ]* 5.8 Write property test for OCR pipeline trigger
    - **Property 42: OCR pipeline trigger**
    - **Validates: Requirements 8.2**

  - [ ]* 5.9 Write property test for OCR completion
    - **Property 43: OCR completion returns structured data**
    - **Validates: Requirements 8.5**

  - [ ]* 5.10 Write property test for OCR failure handling
    - **Property 44: OCR failure returns error**
    - **Validates: Requirements 8.6**

  - [ ]* 5.11 Write property test for OCR format support
    - **Property 45: OCR format support**
    - **Validates: Requirements 8.7**

  - [ ]* 5.12 Write unit tests for OCR with sample documents
    - Test with sample warehouse receipt PDFs
    - Test with sample images (JPEG, PNG)
    - Validate extracted fields match expected values
    - _Requirements: 8.7_

  - [ ] 5.13 Implement real-time updates with EventBridge
    - Create EventBridge rule for shipment status changes
    - Create Lambda function to publish events to EventBridge
    - Update shipment service to publish events on status change
    - _Requirements: 7.1_

  - [ ] 5.14 Implement polling mechanism in frontend
    - Add polling hook to fetch shipment updates every 5 seconds
    - Update UI when shipment status changes
    - Show notifications for new events
    - _Requirements: 7.1_

  - [ ]* 5.15 Write integration test for real-time updates
    - Test that status change triggers event
    - Test that frontend receives update within 10 seconds
    - _Requirements: 7.1_

  - [ ] 5.16 Migrate documents from Supabase Storage to S3
    - Export all documents from Supabase Storage
    - Upload documents to S3 with proper metadata
    - Update document records in database with new S3 keys
    - Validate all documents are accessible
    - _Requirements: 13.7_

  - [ ] 5.17 Checkpoint - Validate OCR and real-time features
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Phase 5: Full Cutover and Hardening
  - [ ] 6.1 Create Observability Stack with CloudWatch
    - Implement ObservabilityStack in infra/lib/stacks/observability-stack.ts
    - Create CloudWatch Log Groups for all Lambda functions
    - Configure log retention (14 days for dev)
    - Create CloudWatch alarms for API error rate, latency, database CPU
    - Create SNS topic for alarm notifications
    - Create CloudWatch Dashboard with key metrics
    - Create budget alert at 80% of $15/month
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.11, 16.8_

  - [ ] 6.2 Enable X-Ray tracing for distributed requests
    - Enable X-Ray on API Gateway
    - Enable X-Ray on Lambda functions
    - Add X-Ray SDK to Lambda code for custom segments
    - _Requirements: 15.10_

  - [ ] 6.3 Implement cost monitoring and optimization
    - Set up AWS Cost Explorer for daily cost tracking
    - Configure cost anomaly detection
    - Review and optimize Lambda memory allocation
    - Review and optimize CloudWatch Logs retention
    - Implement S3 lifecycle policies for document storage
    - _Requirements: 16.1, 16.2, 16.3, 16.5, 16.7, 16.9_

  - [ ] 6.4 Review and harden security configuration
    - Review IAM policies for least privilege
    - Review security group rules
    - Enable CloudTrail logging (already configured at org level)
    - Review encryption configuration (RDS, S3, Secrets Manager)
    - Review Cognito password policies and MFA settings
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.9, 14.10_

  - [ ]* 6.5 Run full regression test suite
    - Run all unit tests
    - Run all integration tests
    - Run all property tests (minimum 100 iterations each)
    - Verify test coverage meets 80% threshold
    - _Requirements: 19.1, 19.2, 19.6, 19.4, 19.9_

  - [ ]* 6.6 Perform load testing
    - Use Artillery or k6 to simulate 100 concurrent users
    - Test API endpoints with 1000 requests/minute
    - Measure response times and error rates
    - Identify bottlenecks and optimize
    - _Requirements: 19.7_

  - [ ]* 6.7 Perform security testing
    - Run npm audit and Snyk for dependency vulnerabilities
    - Test authentication bypass attempts
    - Test privilege escalation attempts
    - Test tenant isolation with malicious requests
    - _Requirements: 19.8_

  - [ ] 6.8 Document operational runbooks
    - Write incident response procedures
    - Write database restore procedures
    - Write rollback procedures for each phase
    - Write cost optimization procedures
    - Document monitoring and alerting setup
    - _Requirements: 20.4, 20.10_

  - [ ] 6.9 Perform final data sync from Supabase
    - Export any new data created since initial migration
    - Import to RDS
    - Validate data integrity
    - _Requirements: 13.10_

  - [ ] 6.10 Switch all traffic to AWS
    - Update DNS to point to CloudFront (if applicable)
    - Update frontend configuration to use AWS API exclusively
    - Monitor for errors and performance issues for 48 hours
    - _Requirements: 17.5, 17.7_

  - [ ] 6.11 Decommission Supabase account
    - Wait 1 week grace period after cutover
    - Take final backup of Supabase data
    - Close Supabase account
    - _Requirements: 17.5_

  - [ ] 6.12 Final checkpoint - Migration complete
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at the end of each phase
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- The phased approach allows rollback at any stage if issues are discovered
- Each phase builds on the previous phase, ensuring incremental progress
- Database migration and data validation are critical tasks that require careful execution
- Security and observability are built in from the start, not added later
- Cost monitoring is essential to stay within the $15/month development budget

