# Requirements Document: AWS Amplify Gen 2 Migration

## Introduction

This document specifies the requirements for migrating the CTCM freight forwarding application from a custom CDK-based infrastructure to AWS Amplify Gen 2. The migration aims to simplify deployment, reduce operational complexity, and optimize costs while maintaining all existing functionality.

The current system uses separate CDK stacks for networking, authentication, data, API, frontend, OCR processing, and observability. Amplify Gen 2 provides an integrated platform that consolidates these concerns into a unified deployment model with managed services for hosting, authentication, data, storage, and serverless functions.

## Glossary

- **Amplify_Gen2**: AWS Amplify Generation 2, the latest version of AWS Amplify with TypeScript-first configuration
- **CDK**: AWS Cloud Development Kit, infrastructure-as-code framework currently used
- **Frontend_App**: React-based web application for CTCM freight forwarding
- **API_Layer**: Backend API handling shipments, customers, invoices, documents, and search
- **Auth_System**: Authentication and authorization system (currently Cognito)
- **Database**: PostgreSQL database storing application data
- **Document_Storage**: S3-based storage for invoices, receipts, and other documents
- **OCR_Pipeline**: Optical Character Recognition system for processing warehouse receipts
- **Monorepo**: Project structure with multiple workspaces (apps/web, apps/api, packages)
- **Migration**: Process of transitioning from CDK infrastructure to Amplify Gen 2

## Requirements

### Requirement 1: Amplify Gen 2 Project Initialization

**User Story:** As a developer, I want to initialize an Amplify Gen 2 project structure, so that I can configure all services using TypeScript-first definitions.

#### Acceptance Criteria

1. WHEN initializing the Amplify project, THE System SHALL create an amplify/ directory at the project root
2. WHEN configuring Amplify, THE System SHALL use TypeScript for all resource definitions
3. THE System SHALL maintain the existing monorepo structure with apps/ and packages/ directories
4. WHEN Amplify is initialized, THE System SHALL configure the backend using the defineBackend pattern
5. THE System SHALL support environment-specific configurations for dev and future prod environments

### Requirement 2: Frontend Hosting Migration

**User Story:** As a developer, I want to migrate frontend hosting to Amplify Hosting, so that I can eliminate the need for separate S3 buckets and CloudFront distributions.

#### Acceptance Criteria

1. WHEN deploying the frontend, THE Amplify_Gen2 SHALL host the React application using Amplify Hosting
2. WHEN a user accesses the application, THE System SHALL serve the frontend from Amplify's managed CDN
3. THE System SHALL support SPA routing with proper fallback to index.html for client-side routes
4. WHEN code is pushed to the main branch, THE System SHALL automatically trigger builds and deployments
5. THE System SHALL inject environment variables during the build process for API endpoints and configuration
6. THE Frontend_App SHALL remain in the apps/web directory with no structural changes to source code

### Requirement 3: Authentication Migration

**User Story:** As a developer, I want to migrate authentication to Amplify Auth, so that I can use declarative configuration instead of manual Cognito setup.

#### Acceptance Criteria

1. WHEN configuring authentication, THE System SHALL use Amplify Auth with Cognito as the provider
2. THE Auth_System SHALL support email and password authentication
3. THE Auth_System SHALL maintain existing user pools or provide a migration path for existing users
4. WHEN a user authenticates, THE System SHALL issue JWT tokens compatible with the API layer
5. THE Auth_System SHALL support user groups for role-based access control (admin, customer roles)
6. THE System SHALL provide authentication UI components or integrate with existing React components

### Requirement 4: API Layer Migration

**User Story:** As a developer, I want to migrate the API layer to Amplify Functions, so that I can simplify Lambda deployment and API Gateway configuration.

#### Acceptance Criteria

1. WHEN defining API endpoints, THE System SHALL use Amplify Functions for serverless compute
2. THE API_Layer SHALL maintain all existing endpoints for shipments, customers, invoices, documents, and search
3. WHEN a function is deployed, THE System SHALL automatically configure API Gateway integration
4. THE System SHALL support TypeScript for all function code
5. THE API_Layer SHALL maintain the existing handler structure in apps/api/src/handlers/
6. WHEN functions access the database, THE System SHALL provide connection configuration via environment variables
7. THE System SHALL support CORS configuration for frontend-to-API communication

### Requirement 5: Database Strategy

**User Story:** As a developer, I want to determine the optimal database strategy, so that I can balance cost, compatibility, and migration effort.

#### Acceptance Criteria

1. THE System SHALL evaluate keeping PostgreSQL via RDS or Aurora Serverless v2
2. THE System SHALL evaluate migrating to DynamoDB for cost optimization
3. WHEN using PostgreSQL, THE System SHALL configure Amplify Data to connect to the existing database
4. WHEN using DynamoDB, THE System SHALL provide a migration path for existing data
5. THE Database SHALL support all existing queries for shipments, customers, invoices, and search
6. THE System SHALL maintain data integrity during any migration process
7. THE Database configuration SHALL stay within the $15/month budget constraint

### Requirement 6: Document Storage Migration

**User Story:** As a developer, I want to migrate document storage to Amplify Storage, so that I can use declarative S3 configuration with built-in access controls.

#### Acceptance Criteria

1. WHEN configuring storage, THE System SHALL use Amplify Storage backed by S3
2. THE Document_Storage SHALL support uploading invoices, receipts, and warehouse documents
3. THE System SHALL maintain existing document organization and naming conventions
4. WHEN a user uploads a document, THE System SHALL enforce access controls based on user identity
5. THE System SHALL support presigned URLs for secure document access
6. THE Document_Storage SHALL integrate with the OCR pipeline for processing uploaded receipts

### Requirement 7: OCR Pipeline Migration

**User Story:** As a developer, I want to migrate the OCR processing pipeline to Amplify Functions, so that I can maintain document processing capabilities with simplified deployment.

#### Acceptance Criteria

1. WHEN a warehouse receipt is uploaded, THE System SHALL trigger OCR processing via Amplify Functions
2. THE OCR_Pipeline SHALL use AWS Textract for text extraction
3. THE System SHALL maintain the existing OCR workflow: upload → process → extract data → store results
4. WHEN OCR processing completes, THE System SHALL update the database with extracted information
5. THE OCR_Pipeline SHALL handle errors gracefully and provide status updates
6. THE System SHALL support asynchronous processing for large documents

### Requirement 8: Search Functionality Preservation

**User Story:** As a user, I want to search for shipments, customers, and invoices, so that I can quickly find relevant information.

#### Acceptance Criteria

1. THE System SHALL maintain existing search capabilities across shipments, customers, and invoices
2. WHEN using PostgreSQL, THE System SHALL use full-text search features
3. WHEN using DynamoDB, THE System SHALL implement search using query patterns or OpenSearch integration
4. THE Search functionality SHALL return results within 2 seconds for typical queries
5. THE System SHALL support filtering and sorting of search results

### Requirement 9: CDK Infrastructure Removal

**User Story:** As a developer, I want to remove obsolete CDK infrastructure, so that I can eliminate maintenance overhead and reduce complexity.

#### Acceptance Criteria

1. WHEN Amplify migration is complete, THE System SHALL identify CDK stacks that are no longer needed
2. THE System SHALL safely destroy replaced CDK stacks (frontend, auth, API, observability)
3. THE System SHALL preserve any CDK stacks that cannot be replaced by Amplify (if any)
4. THE System SHALL remove the infra/ directory and related CDK configuration files
5. THE System SHALL remove CDK-related scripts from the scripts/ directory
6. THE System SHALL update package.json to remove CDK dependencies
7. THE System SHALL document which resources were migrated and which were destroyed

### Requirement 10: CI/CD Configuration

**User Story:** As a developer, I want to configure CI/CD through Amplify Console, so that I can automate deployments without managing GitHub Actions workflows.

#### Acceptance Criteria

1. WHEN connecting the repository, THE System SHALL use GitHub as the source control provider
2. THE Amplify_Gen2 SHALL automatically build and deploy on pushes to the main branch
3. THE System SHALL run tests before deployment and block deployment on test failures
4. THE System SHALL provide build logs and deployment status in the Amplify Console
5. THE System SHALL support manual deployments for testing and rollback scenarios
6. THE System SHALL use the existing GitHub OIDC role for AWS authentication

### Requirement 11: Cost Optimization

**User Story:** As a project owner, I want to optimize costs to stay within budget, so that the dev environment remains affordable.

#### Acceptance Criteria

1. THE System SHALL target a total monthly cost of $15 or less for the dev environment
2. WHEN selecting database options, THE System SHALL choose the most cost-effective solution
3. THE System SHALL use Amplify's free tier where available (hosting, auth, functions)
4. THE System SHALL configure appropriate resource limits to prevent cost overruns
5. THE System SHALL implement CloudWatch alarms for budget thresholds (80%, 100%)
6. THE System SHALL document expected monthly costs for each service component

### Requirement 12: Functionality Preservation

**User Story:** As a user, I want all existing features to work after migration, so that I can continue using the application without disruption.

#### Acceptance Criteria

1. THE System SHALL maintain all shipment management features (create, read, update, delete, search)
2. THE System SHALL maintain all customer management features (create, read, update, delete, search)
3. THE System SHALL maintain all invoice management features (create, read, update, delete, search)
4. THE System SHALL maintain document upload and retrieval functionality
5. THE System SHALL maintain OCR processing for warehouse receipts
6. THE System SHALL maintain user authentication and authorization
7. THE System SHALL maintain all existing API endpoints and response formats
8. WHEN users access the application, THE System SHALL provide the same user experience as before migration

### Requirement 13: Monitoring and Observability

**User Story:** As a developer, I want to monitor application health and performance, so that I can identify and resolve issues quickly.

#### Acceptance Criteria

1. THE System SHALL use CloudWatch Logs for all function execution logs
2. THE System SHALL provide metrics for API request counts, latency, and error rates
3. THE System SHALL configure alarms for critical errors and performance degradation
4. THE Amplify_Gen2 SHALL provide built-in monitoring dashboards in the Amplify Console
5. THE System SHALL maintain log retention policies to control costs (7-14 days for dev)
6. THE System SHALL support distributed tracing for debugging complex workflows

### Requirement 14: Development Workflow

**User Story:** As a developer, I want to test changes locally before deployment, so that I can iterate quickly and catch issues early.

#### Acceptance Criteria

1. THE System SHALL support local development using Amplify sandbox environments
2. WHEN running locally, THE System SHALL connect to cloud resources (database, storage, auth)
3. THE System SHALL provide hot-reload for frontend changes during local development
4. THE System SHALL support running functions locally for testing
5. THE System SHALL maintain the existing npm scripts for dev, build, and test commands

### Requirement 15: Migration Execution Strategy

**User Story:** As a developer, I want a clear migration execution plan, so that I can transition to Amplify with minimal risk and downtime.

#### Acceptance Criteria

1. THE System SHALL support a phased migration approach with incremental cutover
2. WHEN migrating, THE System SHALL maintain the ability to rollback to CDK infrastructure
3. THE System SHALL provide a testing phase where both infrastructures can coexist
4. THE System SHALL document the migration sequence and dependencies between components
5. THE System SHALL identify breaking changes and required code modifications
6. THE System SHALL provide validation steps to confirm successful migration of each component
