# CTCM Deployment Status

## Current Status: ✅ Phase 3 Ready - Infrastructure Complete, Begin API Implementation

**Last Updated:** February 15, 2026

---

## Deployed Infrastructure

### Frontend (AWS Amplify)
- **Status:** ✅ Deployed and Running
- **App ID:** d1yo6c4008x99n
- **URL:** https://main.d1yo6c4008x99n.amplifyapp.com
- **Platform:** WEB (Static Hosting)
- **Console:** https://console.aws.amazon.com/amplify/home?region=us-east-1#/d1yo6c4008x99n
- **Branch:** main
- **Repository:** christophercorbin/CTCMweb
- **Build:** Automatic on push to main

### Authentication (AWS Cognito)
- **Status:** ✅ Deployed with Test Users
- **User Pool ID:** us-east-1_zqM1VNIn3
- **Client ID:** 3h9u26uesvgc019813nb3dufpq
- **Region:** us-east-1
- **Console:** https://console.aws.amazon.com/cognito/v2/idp/user-pools/us-east-1_zqM1VNIn3

### API (API Gateway + Lambda)
- **Status:** ✅ Deployed (Placeholder)
- **API URL:** https://1y447zjdhj.execute-api.us-east-1.amazonaws.com/dev/
- **API ID:** 1y447zjdhj
- **Stage:** dev
- **Note:** API endpoints not yet implemented (Phase 3 tasks 4.4-4.31)

### Database (RDS PostgreSQL)
- **Status:** ✅ Deployed with Schema
- **Endpoint:** ctcmdevdatastack-databaseb269d8bb-5dp0uzejpe9c.ckfqwaw86gus.us-east-1.rds.amazonaws.com
- **Instance:** db.t4g.micro
- **Database:** ctcm
- **Schema:** ✅ All tables created (customers, shipments, packages, charges, events, invoices, documents)
- **Security:** ⚠️ Publicly accessible for dev (port 5432 open to 0.0.0.0/0)

### Networking (VPC)
- **Status:** ✅ Deployed
- **VPC ID:** vpc-02563a885e06b672f
- **Lambda Security Group:** sg-0f375f9bf65a657cd
- **Database Security Group:** sg-09c6349eb2d89cb88
- **Subnets:** Default VPC public subnets

---

## Test Users

### Admin User
- **Email:** admin@ctcm.com
- **Password:** AdminPass123!
- **Role:** Administrator
- **Group:** admin

### Customer User
- **Email:** test@ctcm.com
- **Password:** TestPass123!
- **Role:** Customer
- **Group:** customer

---

## Environment Variables

The following environment variables are configured in Amplify:

```
VITE_API_URL=https://1y447zjdhj.execute-api.us-east-1.amazonaws.com/dev/
VITE_AWS_REGION=us-east-1
VITE_COGNITO_CLIENT_ID=3h9u26uesvgc019813nb3dufpq
VITE_COGNITO_USER_POOL_ID=us-east-1_zqM1VNIn3
```

---

## Build Configuration

### Monorepo Structure
```
CTCMweb/
├── apps/
│   ├── web/          # React frontend (deployed)
│   └── api/          # API Lambda functions (not yet implemented)
├── packages/
│   ├── types/        # Shared TypeScript types
│   └── utils/        # Shared utilities
└── infra/            # AWS CDK infrastructure
```

### Build Spec
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
        - cd apps/web
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: apps/web/dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - apps/web/node_modules/**/*
```

---

## Known Issues & Limitations

### Current Limitations (Phase 2)
1. **No Database Connection:** Frontend uses demo mode with mock data
2. **No API Endpoints:** All API calls stubbed with "Coming in Phase 3" messages
3. **No Real-Time Updates:** WebSocket/AppSync subscriptions not implemented
4. **No OCR Processing:** Document scanning feature stubbed
5. **No Email Notifications:** SES not yet configured

### Supabase Removal
- ✅ All Supabase dependencies removed
- ✅ All Supabase imports removed
- ✅ Authentication migrated to Cognito
- ✅ Database calls stubbed for Phase 3

---

## Next Steps (Phase 3 API Implementation)

### Ready to Begin API Development
All infrastructure is deployed and the frontend is live. You can now start implementing the API endpoints.

### API Implementation (Tasks 4.4-4.31)
1. Implement database connection module (task 4.4)
2. Implement base repository with tenant isolation (task 4.5)
3. Implement customer repository, service, and Lambda handler (tasks 4.6-4.7)
4. Implement shipment repository, service, and Lambda handler (tasks 4.12-4.13)
5. Implement search, documents, and invoices handlers (tasks 4.19, 4.22, 4.25)
6. Update API Stack to wire up all Lambda functions (task 4.26)
7. Update frontend to use real API (task 4.31)

### Database Connection Details
```bash
# Get database password
AWS_PROFILE=kiro-ctcm-dev-admin aws secretsmanager get-secret-value \
  --secret-id ctcm-dev-database-credentials \
  --region us-east-1 \
  --query SecretString \
  --output text | jq -r '.password'

# Connect to database
PGPASSWORD='<password>' psql \
  -h ctcmdevdatastack-databaseb269d8bb-5dp0uzejpe9c.ckfqwaw86gus.us-east-1.rds.amazonaws.com \
  -U ctcmadmin \
  -d ctcm \
  -p 5432
```

---

## Deployment Commands

### Deploy Infrastructure
```bash
cd infra
AWS_PROFILE=kiro-ctcm-dev-admin npx cdk deploy --all --require-approval never
```

### Trigger Manual Build
```bash
AWS_PROFILE=kiro-ctcm-dev-admin aws amplify start-job \
  --app-id d1lo77mj388p7z \
  --branch-name main \
  --job-type RELEASE \
  --region us-east-1
```

### View Build Logs
```bash
AWS_PROFILE=kiro-ctcm-dev-admin aws amplify list-jobs \
  --app-id d1lo77mj388p7z \
  --branch-name main \
  --max-results 5 \
  --region us-east-1
```

---

## Cost Estimate

### Current Monthly Costs (Phase 2)
- **Amplify Hosting:** ~$0.65-0.80/month
- **Cognito:** Free tier (< 50k MAU)
- **API Gateway:** ~$0.10/month (minimal usage)
- **Lambda:** Free tier
- **RDS t4g.micro:** ~$15/month
- **VPC:** ~$0/month (no NAT Gateway)
- **CloudWatch:** ~$1/month

**Total:** ~$17-18/month (within $15 budget with some overage)

### Optimization Opportunities
- Stop RDS instance when not in use (save ~$15/month)
- Use RDS snapshots for dev environment
- Implement auto-start/stop for RDS

---

## Monitoring & Logs

### Amplify Console
https://console.aws.amazon.com/amplify/home?region=us-east-1#/d1lo77mj388p7z

### CloudWatch Logs
- Amplify Build Logs: Automatic
- Lambda Logs: /aws/lambda/ctcm-* (when implemented)
- API Gateway Logs: /aws/apigateway/ctcm-api (when enabled)

### Cognito Console
https://console.aws.amazon.com/cognito/v2/idp/user-pools/us-east-1_n8pWlYcSS

---

## Support & Troubleshooting

### Common Issues

**Build Failures:**
- Check Amplify build logs in console
- Verify all Supabase references removed
- Ensure TypeScript compiles without errors

**Authentication Issues:**
- Verify Cognito user pool and client IDs
- Check environment variables in Amplify
- Ensure test users are created

**Deployment Issues:**
- Verify AWS credentials are configured
- Check CDK bootstrap status
- Review CloudFormation stack events

### Getting Help
- **Documentation:** `/docs` directory
- **AWS Console:** https://console.aws.amazon.com
- **GitHub Issues:** https://github.com/christophercorbin/CTCMweb/issues

---

## Version History

### v0.1.0 - Phase 2 Complete (February 14, 2026)
- ✅ Monorepo structure created
- ✅ AWS CDK infrastructure deployed
- ✅ Supabase removed
- ✅ Cognito authentication configured
- ✅ Amplify hosting deployed
- ✅ Frontend successfully built and deployed
- ✅ Test users created

### Next: v0.2.0 - Phase 3 (Database & API)
- Database schema creation
- API endpoint implementation
- Frontend integration with real data
