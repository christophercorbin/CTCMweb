# CTCM Deployment Status

## Current Status: ✅ Phase 2 Complete - Frontend Deployed

**Last Updated:** February 14, 2026

---

## Deployed Infrastructure

### Frontend (AWS Amplify)
- **Status:** ✅ Deployed and Running
- **App ID:** d1lo77mj388p7z
- **URL:** https://main.d1lo77mj388p7z.amplifyapp.com
- **Platform:** WEB (Static Hosting)
- **Build Status:** SUCCEED (Build #6)
- **Last Deploy:** February 14, 2026 21:26:18
- **Branch:** main
- **Repository:** christophercorbin/CTCMweb

### Authentication (AWS Cognito)
- **Status:** ✅ Deployed
- **User Pool ID:** us-east-1_n8pWlYcSS
- **Client ID:** 7fotk98fhtt003lf9d1728d49g
- **Region:** us-east-1

### API (API Gateway + Lambda)
- **Status:** ✅ Deployed (Placeholder)
- **API URL:** https://phr2i6vklj.execute-api.us-east-1.amazonaws.com/dev/
- **Stage:** dev
- **Note:** API endpoints not yet implemented (Phase 3)

### Database (RDS PostgreSQL)
- **Status:** ✅ Deployed (Not Connected)
- **Endpoint:** ctcmdevdatastack-databaseb269d8bb-m4maqdhhpwt9.ckfqwaw86gus.us-east-1.rds.amazonaws.com
- **Instance:** db.t4g.micro
- **Note:** Database schema not yet created (Phase 3)

### Networking (VPC)
- **Status:** ✅ Deployed
- **VPC ID:** vpc-02563a885e06b672f
- **Subnets:** Public and Private subnets across 2 AZs

---

## Test Users

### Admin User
- **Email:** admin@ctcm.com
- **Password:** AdminPass123!
- **Role:** Administrator

### Customer User
- **Email:** test@ctcm.com
- **Password:** TestPass123!
- **Role:** Customer

---

## Environment Variables

The following environment variables are configured in Amplify:

```
VITE_API_URL=https://phr2i6vklj.execute-api.us-east-1.amazonaws.com/dev/
VITE_AWS_REGION=us-east-1
VITE_COGNITO_CLIENT_ID=7fotk98fhtt003lf9d1728d49g
VITE_COGNITO_USER_POOL_ID=us-east-1_n8pWlYcSS
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

## Next Steps (Phase 3)

### Database Setup
1. Create database schema in RDS
2. Set up database migrations
3. Configure connection pooling
4. Implement data access layer

### API Implementation
1. Create Lambda functions for CRUD operations
2. Implement API Gateway endpoints
3. Add authentication middleware
4. Connect to RDS database

### Frontend Integration
1. Replace mock data with real API calls
2. Implement error handling
3. Add loading states
4. Test end-to-end flows

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
