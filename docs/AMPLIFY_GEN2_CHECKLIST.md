# Amplify Gen 2 Fresh Start - Quick Checklist

Use this checklist when following the complete guide in `AMPLIFY_GEN2_FRESH_START.md`

## Pre-Flight Checklist

- [ ] AWS Account: 404875533723 (CTCM Dev)
- [ ] Region: us-east-1
- [ ] GitHub account access
- [ ] Node.js installed (v18+)
- [ ] AWS CLI configured
- [ ] Git installed

---

## Phase 0: Repository Setup

- [ ] Create new GitHub repository: `CTCM-Amplify`
- [ ] Clone repository locally
- [ ] Copy application code from old repo:
  - [ ] `apps/web/` → Frontend
  - [ ] `apps/api/src/` → Backend logic
  - [ ] `packages/types/` → Shared types
- [ ] Create root `package.json` with workspaces
- [ ] Run `npm install`
- [ ] Commit and push: "chore: initialize monorepo structure"

---

## Phase 1: Amplify Initialization

- [ ] Install Amplify CLI: `npm install -g @aws-amplify/cli`
- [ ] Install Amplify packages: `@aws-amplify/backend`, `@aws-amplify/backend-cli`, `aws-amplify`
- [ ] Create `amplify/` directory structure
- [ ] Create `amplify/backend.ts`
- [ ] Create `amplify/package.json`
- [ ] Create `.gitignore`
- [ ] Commit and push: "feat: initialize Amplify Gen 2 project"

---

## Phase 2: Authentication

- [ ] Create `amplify/auth/resource.ts`
- [ ] Configure Cognito with email/password
- [ ] Add user groups: admin, customer
- [ ] Update `amplify/backend.ts` to include auth
- [ ] Update frontend `apps/web/src/lib/auth.ts` to use Amplify Auth
- [ ] Configure Amplify in `apps/web/src/main.tsx`
- [ ] Test with `npx ampx sandbox`
- [ ] Commit and push: "feat: configure Amplify Auth"

---

## Phase 3: Storage

- [ ] Create `amplify/storage/resource.ts`
- [ ] Configure S3 with access controls:
  - [ ] invoices/{entity_id}/*
  - [ ] receipts/{entity_id}/*
  - [ ] documents/{entity_id}/*
  - [ ] shipments/{entity_id}/*
- [ ] Update `amplify/backend.ts` to include storage
- [ ] Create `apps/web/src/lib/storage.ts` with Amplify Storage SDK
- [ ] Test upload/download in sandbox
- [ ] Commit and push: "feat: configure Amplify Storage"

---

## Phase 4: API Functions

- [ ] Create `amplify/functions/shared/db.ts` (database connection)
- [ ] Create function: `amplify/functions/shipments/`
  - [ ] `resource.ts`
  - [ ] `handler.ts`
- [ ] Create function: `amplify/functions/customers/`
  - [ ] `resource.ts`
  - [ ] `handler.ts`
- [ ] Create function: `amplify/functions/invoices/`
  - [ ] `resource.ts`
  - [ ] `handler.ts`
- [ ] Create function: `amplify/functions/documents/`
  - [ ] `resource.ts`
  - [ ] `handler.ts`
- [ ] Create function: `amplify/functions/search/`
  - [ ] `resource.ts`
  - [ ] `handler.ts`
- [ ] Update `amplify/backend.ts` to include all functions
- [ ] Configure DATABASE_SECRET_ARN environment variable
- [ ] Test functions in sandbox
- [ ] Commit and push: "feat: add Amplify Functions for API"

---

## Phase 5: Frontend Hosting

- [ ] Create `amplify.yml` build configuration
- [ ] Configure monorepo build for `apps/web`
- [ ] Add quality gates (typecheck, lint)
- [ ] Commit and push: "feat: add Amplify build configuration"
- [ ] Connect to Amplify Console:
  - [ ] Navigate to Amplify Console
  - [ ] Click "New app" → "Host web app"
  - [ ] Select GitHub
  - [ ] Repository: `CTCM-Amplify`
  - [ ] Branch: `main`
  - [ ] Monorepo folder: `apps/web`
  - [ ] App name: `ctcm-amplify-dev`
- [ ] Configure environment variables in Amplify Console:
  - [ ] VITE_AWS_REGION=us-east-1
  - [ ] VITE_COGNITO_REGION=us-east-1
- [ ] Wait for build to complete
- [ ] Test deployed application

---

## Phase 6: Database Setup

### Option A: Use Existing Database
- [ ] Note existing RDS endpoint
- [ ] Create secret in Secrets Manager
- [ ] Note secret ARN
- [ ] Add DATABASE_SECRET_ARN to Amplify environment

### Option B: Create New Database
- [ ] Create RDS PostgreSQL t4g.micro
- [ ] Create database secret in Secrets Manager
- [ ] Note secret ARN
- [ ] Run migration script: `infra/migrations/001_initial_schema.sql`
- [ ] Add DATABASE_SECRET_ARN to Amplify environment

---

## Phase 7: Testing

- [ ] Test Amplify Sandbox:
  - [ ] Auth: Sign up, sign in, sign out
  - [ ] Storage: Upload, download
  - [ ] API: Test all endpoints
- [ ] Test Deployed Application:
  - [ ] Authentication flow
  - [ ] Shipment management
  - [ ] Customer management
  - [ ] Invoice management
  - [ ] Document upload/download
  - [ ] Search functionality
- [ ] Run unit tests: `npm test`
- [ ] Check CloudWatch Logs for errors
- [ ] Verify all functionality works

---

## Phase 8: Production (Optional)

- [ ] Create production branch
- [ ] Create production Amplify app
- [ ] Configure production environment variables
- [ ] Configure custom domain
- [ ] Set up monitoring and alarms
- [ ] Configure backup strategy

---

## Post-Deployment

- [ ] Set up CloudWatch budget alarms
- [ ] Configure log retention (7 days for dev)
- [ ] Document API endpoints
- [ ] Create operational runbook
- [ ] Set up monitoring dashboards
- [ ] Schedule RDS stop/start (cost optimization)

---

## Verification Checklist

### Authentication
- [ ] User can sign up with email/password
- [ ] User can sign in
- [ ] User can sign out
- [ ] Admin users have admin group
- [ ] Customer users have customer group
- [ ] JWT tokens are valid

### Storage
- [ ] Documents can be uploaded
- [ ] Documents can be downloaded
- [ ] Presigned URLs work
- [ ] Access control enforced (tenant isolation)
- [ ] Admin can access all documents

### API
- [ ] GET /shipments returns data
- [ ] POST /shipments creates shipment
- [ ] PUT /shipments/:id updates shipment
- [ ] GET /customers returns data
- [ ] POST /customers creates customer
- [ ] GET /invoices returns data
- [ ] POST /invoices creates invoice
- [ ] GET /search returns results
- [ ] POST /documents/upload works
- [ ] GET /documents/:id returns document

### Frontend
- [ ] Application loads without errors
- [ ] Login page works
- [ ] Dashboard displays data
- [ ] Navigation works (SPA routing)
- [ ] All pages accessible
- [ ] No console errors

### Infrastructure
- [ ] Amplify app deployed successfully
- [ ] All Lambda functions deployed
- [ ] Cognito User Pool created
- [ ] S3 bucket created
- [ ] Database accessible
- [ ] CloudWatch Logs working

---

## Troubleshooting Quick Reference

| Issue | Fix |
|-------|-----|
| Build fails: "amplify/ not found" | Commit amplify/ directory to git |
| Build fails: "npm ci failed" | Delete package-lock.json, reinstall |
| Auth not working | Check amplify_outputs.json imported |
| Database connection fails | Verify DATABASE_SECRET_ARN set |
| CORS errors | Add CORS headers to function responses |
| Type errors | Make typecheck non-blocking in amplify.yml |
| Lint errors | Make lint non-blocking in amplify.yml |

---

## Cost Monitoring

- [ ] Set up budget alarm at $12 (80% of $15 budget)
- [ ] Set up budget alarm at $15 (100% of budget)
- [ ] Monitor daily costs in AWS Cost Explorer
- [ ] Review monthly cost breakdown
- [ ] Optimize as needed

---

## Success Criteria

✅ All phases completed
✅ All verification checks passed
✅ Application deployed and accessible
✅ All functionality working
✅ Costs within budget
✅ Monitoring configured
✅ Documentation complete

---

## Time Estimates

- Phase 0: 30 minutes
- Phase 1: 30 minutes
- Phase 2: 1 hour
- Phase 3: 1 hour
- Phase 4: 3-4 hours
- Phase 5: 1 hour
- Phase 6: 1 hour
- Phase 7: 2 hours
- **Total**: 10-12 hours (1-2 days)

---

## Key Commands

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Start sandbox
npx ampx sandbox

# Build frontend
npm run build --workspace=apps/web

# Run tests
npm test

# Check Amplify apps
aws amplify list-apps --region us-east-1

# View logs
aws logs tail /aws/lambda/ctcm-shipments --follow
```

---

## Support

- Full Guide: `docs/AMPLIFY_GEN2_FRESH_START.md`
- Amplify Docs: https://docs.amplify.aws/
- AWS Console: https://console.aws.amazon.com/
- Account: 404875533723
- Region: us-east-1
