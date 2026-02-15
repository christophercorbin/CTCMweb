# Changelog

All notable changes to the CTCM project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation structure in `docs/` directory
- Documentation index with categorized guides
- Improved README with quick start and project overview
- CHANGELOG for tracking project changes

### Changed
- Organized documentation into setup, deployment, migration, and guides categories
- Updated .gitignore with comprehensive exclusions
- Cleaned up build artifacts and temporary files

## [0.1.0] - 2026-02-14

### Added - Phase 2: Authentication Migration
- AWS Cognito authentication integration
- Amplify Auth library for frontend
- JWT token management
- User registration and login flows
- Protected routes with Cognito
- Test users (customer and admin)

### Added - Phase 1: Frontend Hosting
- AWS Amplify Hosting setup
- Automatic CI/CD from GitHub
- CloudFront CDN distribution
- Environment variable configuration
- SPA routing rules

### Added - Phase 0: Monorepo Setup
- Monorepo structure with npm workspaces
- TypeScript project references
- Workspace organization (apps, packages, infra)
- CDK infrastructure code
- AWS stack deployments:
  - NetworkStack (VPC, Security Groups)
  - AuthStack (Cognito)
  - DataStack (RDS, S3)
  - ApiStack (API Gateway, Lambda)
  - AmplifyFrontendStack (Amplify Hosting)
  - OcrStack (Textract pipeline)
  - ObservabilityStack (CloudWatch)

### Removed
- Supabase dependencies (@supabase/supabase-js)
- Supabase authentication code
- Supabase database queries
- Supabase Edge Functions integration
- All Supabase environment variables

### Changed
- Migrated from Supabase Auth to AWS Cognito
- Updated authentication flow to use Cognito
- Stubbed database operations for Phase 3
- Stubbed OCR features for Phase 4
- Updated frontend to use Cognito tokens for API requests

### Fixed
- TypeScript compilation errors after Supabase removal
- Import errors from removed Supabase client
- Authentication context to use Cognito
- Protected routes to check Cognito session

## [0.0.1] - 2026-02-01

### Added - Initial Setup
- React frontend with TypeScript
- Vite build tool
- TailwindCSS styling
- React Router for navigation
- Supabase integration (legacy)
- Basic UI components:
  - Customer dashboard
  - Admin dashboard
  - Shipment tracking
  - Invoice management
  - Customer management
  - Warehouse receipt intake
- Mock data for development

### Infrastructure
- AWS account setup (404875533723)
- GitHub repository (christophercorbin/CTCMweb)
- Development environment configuration

---

## Migration Progress

### ✅ Completed Phases

#### Phase 0: Monorepo Setup
- Restructured project as monorepo
- Set up npm workspaces
- Configured TypeScript project references
- Organized code into apps and packages

#### Phase 1: Frontend Hosting
- Deployed AWS Amplify Hosting
- Configured automatic CI/CD
- Set up CloudFront CDN
- Removed S3 + manual deployment

#### Phase 2: Authentication
- Migrated to AWS Cognito
- Implemented JWT token management
- Removed all Supabase dependencies
- Updated authentication flows

### 🔄 In Progress

#### Phase 3: Database & API
- [ ] Migrate database schema to RDS PostgreSQL
- [ ] Implement Lambda functions for API endpoints
- [ ] Set up API Gateway REST API
- [ ] Update frontend to call AWS API
- [ ] Implement real-time updates (AppSync or WebSocket)

### ⏳ Planned

#### Phase 4: OCR Integration
- [ ] Implement AWS Textract for document scanning
- [ ] Create Step Functions workflow
- [ ] Update DocumentScanner component
- [ ] Test OCR extraction accuracy

#### Phase 5: Production Readiness
- [ ] Set up production AWS account
- [ ] Configure custom domain
- [ ] Implement monitoring and alerting
- [ ] Set up backup and disaster recovery
- [ ] Security audit and hardening
- [ ] Performance optimization
- [ ] Load testing

---

## Version History

- **0.1.0** (2026-02-14) - Phase 2 Complete: Authentication Migration
- **0.0.1** (2026-02-01) - Initial Setup with Supabase

---

## Notes

### Breaking Changes
- **0.1.0**: Removed Supabase - all Supabase code and dependencies removed
- **0.1.0**: Changed authentication from Supabase to Cognito - requires new user registration

### Migration Notes
- Users from Supabase need to re-register in Cognito
- Database data will be migrated in Phase 3
- OCR features temporarily disabled until Phase 4

### Known Issues
- Database features show "Coming in Phase 3" messages
- OCR features show "Coming in Phase 4" messages
- Some TypeScript errors in legacy code (non-blocking)
- Cost slightly over $15/month budget (needs optimization)

---

**Maintained by**: Christopher Corbin  
**Last Updated**: February 14, 2026
