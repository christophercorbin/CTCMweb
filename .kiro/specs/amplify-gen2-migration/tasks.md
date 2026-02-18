# Implementation Plan: AWS Amplify Gen 2 Migration

## Overview

This implementation plan guides the migration of the CTCM freight forwarding application from CDK-based infrastructure to AWS Amplify Gen 2. The migration follows a phased approach with eight distinct phases, each building on the previous one. The plan prioritizes risk mitigation through parallel deployment, comprehensive testing, and clear rollback procedures at each phase.

## Tasks

- [ ] 1. Phase 1: Amplify Project Initialization
  - [x] 1.1 Install Amplify CLI and dependencies
    - Run `npm install -g @aws-amplify/cli`
    - Install Amplify backend packages: `npm install @aws-amplify/backend @aws-amplify/backend-cli`
    - Install Amplify client libraries: `npm install aws-amplify`
    - _Requirements: 1.1, 1.2_
  
  - [x] 1.2 Initialize Amplify project structure
    - Create `amplify/` directory at project root
    - Create subdirectories: `auth/`, `data/`, `storage/`, `functions/`
    - Create `amplify/backend.ts` with empty backend definition
    - Create `amplify/package.json` with Amplify dependencies
    - _Requirements: 1.1, 1.3, 1.4_
  
  - [x] 1.3 Configure Amplify backend skeleton
    - Write `amplify/backend.ts` using `defineBackend` pattern
    - Configure for dev environment
    - Add placeholder resource imports
    - _Requirements: 1.4, 1.5_
  
  - [ ]* 1.4 Test local sandbox environment
    - Run `amplify sandbox` command
    - Verify sandbox starts without errors
    - Verify cloud resources are created in sandbox
    - _Requirements: 14.1, 14.2_

- [ ] 2. Phase 2: Authentication Migration
  - [x] 2.1 Configure Amplify Auth to use existing User Pool
    - Create `amplify/auth/resource.ts`
    - Configure to reference existing Cognito User Pool ID (us-east-1_n8pWlYcSS)
    - Configure to reference existing User Pool Client ID (7fotk98fhtt003lf9d1728d49g)
    - Preserve user groups (admin, customer)
    - _Requirements: 3.1, 3.3, 3.5_
  
  - [x] 2.2 Update frontend authentication code
    - Replace direct Cognito SDK calls with Amplify Auth SDK
    - Update `apps/web/src/lib/auth.ts` to use `Auth` from `aws-amplify/auth`
    - Configure Amplify in `apps/web/src/main.tsx`
    - Update login/signup components to use Amplify Auth
    - _Requirements: 3.2, 3.6_
  
  - [x] 2.3 Update API client to use Amplify auth tokens
    - Modify `apps/web/src/lib/api.ts` to get tokens from Amplify Auth
    - Add Authorization header with JWT token to all API requests
    - Handle token refresh automatically
    - _Requirements: 3.4_
  
  - [x] 2.4 Write property test for JWT token compatibility
    - **Property 2: JWT Token Compatibility**
    - **Validates: Requirements 3.4**
    - Generate random authenticated users
    - Verify JWT tokens contain required claims (sub, email, cognito:groups)
    - Verify tokens are accepted by API Gateway
  
  - [ ]* 2.5 Write unit tests for authentication flow
    - Test user signup with email/password
    - Test user login with valid credentials
    - Test login failure with invalid credentials
    - Test token refresh
    - Test user group assignment
    - _Requirements: 3.2, 3.5_


- [ ] 3. Phase 3: Storage Migration
  - [x] 3.1 Configure Amplify Storage
    - Create `amplify/storage/resource.ts`
    - Define storage bucket with access controls
    - Configure access patterns for invoices, receipts, documents
    - Set up tenant-based isolation using path prefixes
    - _Requirements: 6.1, 6.3, 6.4_
  
  - [ ] 3.2 Deploy Amplify Storage bucket
    - Deploy storage configuration to AWS
    - Verify bucket is created with correct permissions
    - Test presigned URL generation
    - _Requirements: 6.1, 6.5_
  
  - [x] 3.3 Copy existing documents to new bucket
    - Write migration script to copy from `ctcm-dev-documents-404875533723`
    - Preserve directory structure and metadata
    - Verify all documents copied successfully
    - _Requirements: 6.3_
  
  - [x] 3.4 Update frontend to use Amplify Storage SDK
    - Replace S3Client calls with `uploadData` from `aws-amplify/storage`
    - Replace download logic with `getUrl` from `aws-amplify/storage`
    - Update DocumentScanner component
    - Implement dual-write temporarily (both old and new buckets)
    - _Requirements: 6.2, 6.5_
  
  - [ ]* 3.5 Write property test for document upload
    - **Property 7: Document Upload Success**
    - **Validates: Requirements 6.2, 12.4**
    - Generate random valid documents (various types and sizes)
    - Verify upload succeeds and returns valid S3 key
    - Verify document is retrievable after upload
  
  - [ ]* 3.6 Write property test for document access control
    - **Property 8: Document Access Control**
    - **Validates: Requirements 6.4**
    - Generate random users with different tenant_ids
    - Upload documents for each tenant
    - Verify users can only access their own tenant's documents
    - Verify admin users can access all documents
  
  - [ ]* 3.7 Write property test for presigned URL generation
    - **Property 9: Presigned URL Generation**
    - **Validates: Requirements 6.5**
    - Generate random documents
    - Create presigned URLs for each document
    - Verify URLs allow temporary access without authentication
    - Verify URLs expire after configured time

- [x] 4. Checkpoint - Verify storage migration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Phase 4: API Migration
  - [x] 5.1 Create Amplify Function for shipments
    - Create `amplify/functions/shipments/resource.ts`
    - Create `amplify/functions/shipments/handler.ts`
    - Reuse existing handler logic from `apps/api/src/handlers/shipments.ts`
    - Configure database connection environment variables
    - _Requirements: 4.1, 4.4, 4.5, 4.6_
  
  - [x] 5.2 Create Amplify Function for customers
    - Create `amplify/functions/customers/resource.ts`
    - Create `amplify/functions/customers/handler.ts`
    - Reuse existing handler logic from `apps/api/src/handlers/customers.ts`
    - Configure database connection environment variables
    - _Requirements: 4.1, 4.4, 4.5, 4.6_
  
  - [x] 5.3 Create Amplify Function for invoices
    - Create `amplify/functions/invoices/resource.ts`
    - Create `amplify/functions/invoices/handler.ts`
    - Reuse existing handler logic from `apps/api/src/handlers/invoices.ts`
    - Configure database connection environment variables
    - _Requirements: 4.1, 4.4, 4.5, 4.6_
  
  - [x] 5.4 Create Amplify Function for documents
    - Create `amplify/functions/documents/resource.ts`
    - Create `amplify/functions/documents/handler.ts`
    - Reuse existing handler logic from `apps/api/src/handlers/documents.ts`
    - Configure database connection environment variables
    - _Requirements: 4.1, 4.4, 4.5, 4.6_
  
  - [x] 5.5 Create Amplify Function for search
    - Create `amplify/functions/search/resource.ts`
    - Create `amplify/functions/search/handler.ts`
    - Reuse existing handler logic from `apps/api/src/handlers/search.ts`
    - Configure database connection environment variables
    - _Requirements: 4.1, 4.4, 4.5, 4.6_
  
  - [x] 5.6 Configure API Gateway integration and CORS
    - Update `amplify/backend.ts` to wire all functions
    - Configure CORS for frontend domain
    - Set up API Gateway authorizer with Cognito
    - _Requirements: 4.3, 4.7_
  
  - [x] 5.7 Create shared database connection module
    - Create `amplify/functions/shared/db.ts`
    - Implement connection pooling with pg Pool
    - Handle Secrets Manager integration for credentials
    - Export getDbPool function for reuse
    - _Requirements: 4.6_
  
  - [ ]* 5.8 Write property test for API endpoint preservation
    - **Property 3: API Endpoint Preservation**
    - **Validates: Requirements 4.2, 12.7**
    - For all existing endpoints, verify they are accessible
    - Compare responses to baseline (captured before migration)
    - Verify response format matches expected structure
  
  - [ ]* 5.9 Write property test for CORS headers
    - **Property 4: CORS Header Presence**
    - **Validates: Requirements 4.7**
    - Generate random API requests from frontend origin
    - Verify CORS headers present in all responses
    - Verify preflight OPTIONS requests work correctly
  
  - [ ]* 5.10 Write property test for database query compatibility
    - **Property 5: Database Query Compatibility**
    - **Validates: Requirements 5.5**
    - Execute all existing queries (SELECT, INSERT, UPDATE, DELETE)
    - Verify queries return correct results
    - Compare results to baseline from old API
  
  - [ ]* 5.11 Write property test for entity CRUD operations
    - **Property 13: Entity CRUD Operations**
    - **Validates: Requirements 12.1, 12.2, 12.3**
    - For each entity type (shipment, customer, invoice)
    - Test create, read, update, delete, search operations
    - Verify data integrity and correct responses

- [ ] 6. Phase 5: Frontend Hosting Migration
  - [ ] 6.1 Connect GitHub repository to Amplify Console
    - Navigate to Amplify Console
    - Connect christophercorbin/CTCMweb repository
    - Select main branch for deployment
    - Grant Amplify access to GitHub
    - _Requirements: 10.1, 10.2_
  
  - [x] 6.2 Configure Amplify build settings
    - Create `amplify.yml` build specification
    - Configure monorepo build (apps/web)
    - Set build output directory to `apps/web/dist`
    - Configure environment variables (API URL, Cognito IDs)
    - _Requirements: 2.5_
  
  - [x] 6.3 Configure CI/CD quality gates
    - Add test command to build specification
    - Configure build to fail on test failures
    - Add linting and type checking steps
    - _Requirements: 10.3_
  
  - [ ] 6.4 Trigger initial Amplify build
    - Start manual build in Amplify Console
    - Monitor build logs for errors
    - Verify build completes successfully
    - Test deployed frontend at Amplify URL
    - _Requirements: 2.1, 2.2_
  
  - [ ]* 6.5 Write property test for SPA routing
    - **Property 1: SPA Routing Fallback**
    - **Validates: Requirements 2.3**
    - Generate random client-side routes
    - Access each route directly via HTTP
    - Verify index.html returned with 200 status
    - Verify client-side router handles navigation
  
  - [ ]* 6.6 Write unit tests for frontend integration
    - Test environment variables are injected correctly
    - Test API client uses correct endpoint
    - Test authentication flow with Amplify Auth
    - Test document upload with Amplify Storage
    - _Requirements: 2.5, 3.6, 6.2_

- [ ] 7. Phase 6: OCR Pipeline Migration
  - [ ] 7.1 Create Amplify Function for OCR processing
    - Create `amplify/functions/ocr/resource.ts`
    - Create `amplify/functions/ocr/handler.ts`
    - Implement Textract integration
    - Configure S3 event trigger on receipts/ prefix
    - _Requirements: 7.1, 7.2_
  
  - [ ] 7.2 Implement OCR workflow
    - Start Textract async job on S3 upload
    - Update document status to 'processing'
    - Poll for Textract job completion
    - Parse extracted text into structured data
    - Store results in database with ocr_status='completed'
    - _Requirements: 7.3, 7.4_
  
  - [ ] 7.3 Implement OCR error handling
    - Handle Textract API errors gracefully
    - Update document status to 'failed' on error
    - Log error details to CloudWatch
    - Support retry mechanism for transient failures
    - _Requirements: 7.5_
  
  - [ ]* 7.4 Write property test for OCR result persistence
    - **Property 10: OCR Result Persistence**
    - **Validates: Requirements 7.4, 12.5**
    - Generate random warehouse receipts
    - Upload and trigger OCR processing
    - Verify extracted data stored in database
    - Verify ocr_status='completed' and ocr_data is valid
  
  - [ ]* 7.5 Write unit tests for OCR pipeline
    - Test S3 event trigger invokes function
    - Test Textract API integration
    - Test error handling for failed OCR jobs
    - Test database update with extracted data
    - _Requirements: 7.1, 7.2, 7.5, 7.6_

- [ ] 8. Checkpoint - Verify OCR pipeline
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 9. Phase 7: Search Functionality Validation
  - [ ] 9.1 Verify search functionality with PostgreSQL
    - Test full-text search across shipments
    - Test full-text search across customers
    - Test full-text search across invoices
    - Verify search indexes are being used
    - _Requirements: 8.1, 8.2_
  
  - [ ]* 9.2 Write property test for search result consistency
    - **Property 11: Search Result Consistency**
    - **Validates: Requirements 8.1**
    - Generate random search queries
    - Execute queries against new API
    - Compare results to baseline from old API
    - Verify same records returned in same order
  
  - [ ]* 9.3 Write property test for search filtering and sorting
    - **Property 12: Search Filtering and Sorting**
    - **Validates: Requirements 8.5**
    - Generate random search queries with filters
    - Generate random sort criteria
    - Verify results correctly filtered and sorted
    - Test multiple filter combinations
  
  - [ ]* 9.4 Write unit tests for search performance
    - Test search response time < 2 seconds
    - Test search with various query sizes
    - Test search with pagination
    - _Requirements: 8.4_

- [ ] 10. Phase 8: Migration Validation and Testing
  - [ ] 10.1 Run comprehensive integration tests
    - Test complete user registration and login flow
    - Test create shipment → upload document → OCR → verify results
    - Test search across all entities with various filters
    - Test document upload and retrieval with access control
    - Test CRUD operations for all entity types
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_
  
  - [ ]* 10.2 Write property test for authentication and authorization
    - **Property 14: Authentication and Authorization**
    - **Validates: Requirements 12.6**
    - Generate random users with different roles
    - Verify authentication succeeds with valid credentials
    - Verify access restricted based on role and tenant_id
    - Test admin users can access all resources
    - Test customer users can only access their tenant's resources
  
  - [ ]* 10.3 Run all property-based tests
    - Execute all 14 property tests with 100 iterations each
    - Verify all properties pass
    - Document any failures and fix issues
    - Re-run tests until all pass
  
  - [ ] 10.4 Capture baseline metrics
    - Measure API response times for all endpoints
    - Measure search query performance
    - Measure document upload/download times
    - Measure OCR processing times
    - Compare to pre-migration baseline
    - _Requirements: 8.4_
  
  - [ ] 10.5 Validate data migration integrity (if applicable)
    - If database was migrated, run data integrity checks
    - **Property 6: Data Migration Integrity**
    - **Validates: Requirements 5.6**
    - For all records in source database
    - Verify matching records exist in destination
    - Verify all fields match exactly

- [ ] 11. Phase 9: Gradual Traffic Cutover
  - [ ] 11.1 Update frontend to use new Amplify API endpoints
    - Update API base URL in environment variables
    - Deploy frontend changes to Amplify Hosting
    - Monitor for errors in CloudWatch
    - _Requirements: 4.2_
  
  - [ ] 11.2 Monitor application health
    - Check CloudWatch Logs for errors
    - Monitor API Gateway metrics (request count, latency, errors)
    - Monitor Lambda function metrics (invocations, duration, errors)
    - Monitor database connection pool usage
    - _Requirements: 13.1, 13.2_
  
  - [ ] 11.3 Verify all functionality works end-to-end
    - Test user authentication and authorization
    - Test shipment management (create, read, update, delete, search)
    - Test customer management (create, read, update, delete, search)
    - Test invoice management (create, read, update, delete, search)
    - Test document upload and retrieval
    - Test OCR processing for warehouse receipts
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_
  
  - [ ] 11.4 Configure monitoring and alarms
    - Set up CloudWatch alarms for API errors
    - Set up CloudWatch alarms for Lambda errors
    - Set up CloudWatch alarms for high latency
    - Configure budget alarms at 80%, 100% thresholds
    - _Requirements: 11.4, 11.5, 13.3_

- [ ] 12. Checkpoint - Verify full migration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Phase 10: CDK Infrastructure Cleanup
  - [ ] 13.1 Verify all functionality on Amplify
    - Run final validation tests
    - Confirm no dependencies on CDK stacks
    - Document current state
    - _Requirements: 9.1_
  
  - [ ] 13.2 Destroy obsolete CDK stacks
    - Destroy CtcmDevAmplifyFrontendStack (replaced by Amplify Hosting)
    - Destroy CtcmDevAuthStack (replaced by Amplify Auth)
    - Destroy CtcmDevApiStack (replaced by Amplify Functions)
    - Destroy CtcmDevObservabilityStack (replaced by Amplify monitoring)
    - Keep CtcmDevNetworkStack temporarily
    - Keep CtcmDevDataStack (database still in use)
    - _Requirements: 9.2, 9.3_
  
  - [ ] 13.3 Remove CDK infrastructure files
    - Delete `infra/` directory
    - Remove CDK-related scripts from `scripts/` directory
    - Update `.gitignore` to remove CDK-specific entries
    - _Requirements: 9.4, 9.5_
  
  - [ ] 13.4 Update package.json dependencies
    - Remove `aws-cdk-lib` from dependencies
    - Remove CDK-related packages
    - Remove `infra` from workspaces
    - Run `npm install` to update lock file
    - _Requirements: 9.6_
  
  - [ ] 13.5 Document migration completion
    - Create migration summary document
    - List all resources migrated
    - List all CDK stacks destroyed
    - Document remaining CDK resources (if any)
    - Document cost savings achieved
    - _Requirements: 9.7, 11.6_

- [ ] 14. Phase 11: Cost Optimization
  - [ ] 14.1 Implement RDS stop/start schedule
    - Create Lambda function to stop RDS outside business hours
    - Create EventBridge rule for 6pm weekdays (stop)
    - Create EventBridge rule for 8am weekdays (start)
    - Test stop/start automation
    - _Requirements: 11.2_
  
  - [ ] 14.2 Configure CloudWatch Logs retention
    - Set log retention to 7 days for all Lambda functions
    - Set log retention to 7 days for API Gateway
    - Remove old log groups
    - _Requirements: 13.5_
  
  - [ ] 14.3 Monitor daily costs
    - Check AWS Cost Explorer daily
    - Track cost per service component
    - Verify total cost trending toward $15/month target
    - Identify any cost anomalies
    - _Requirements: 11.1, 11.5_
  
  - [ ] 14.4 Document cost breakdown
    - Document actual monthly costs for each service
    - Compare to projected costs
    - Identify optimization opportunities
    - Plan for future cost reductions (DynamoDB migration)
    - _Requirements: 11.6_

- [ ] 15. Phase 12: Documentation and Handoff
  - [ ] 15.1 Update README documentation
    - Document new Amplify-based architecture
    - Update setup instructions for new developers
    - Document local development with Amplify sandbox
    - Update deployment instructions
    - _Requirements: 14.1, 14.5_
  
  - [ ] 15.2 Create operational runbook
    - Document monitoring and alerting setup
    - Document troubleshooting procedures
    - Document rollback procedures
    - Document cost monitoring procedures
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [ ] 15.3 Create developer guide
    - Document how to add new Amplify Functions
    - Document how to modify Amplify Auth configuration
    - Document how to update Amplify Storage access controls
    - Document how to test locally with sandbox
    - _Requirements: 14.1, 14.2, 14.4_
  
  - [ ] 15.4 Final validation and sign-off
    - Review all requirements met
    - Verify all tests passing
    - Verify cost within budget
    - Verify all functionality preserved
    - Get user approval for migration completion

- [ ] 16. Final Checkpoint - Migration Complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- Migration follows phased approach with rollback capability at each phase
- Total estimated time: 4-6 weeks with careful execution
- Budget target: $15/month or less for dev environment
