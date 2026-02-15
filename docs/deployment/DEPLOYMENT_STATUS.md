# CTCM AWS Infrastructure Deployment Status

**Last Updated:** February 14, 2026  
**Environment:** Development  
**Account:** 404875533723 (CTCM Dev)  
**Region:** us-east-1

## Deployment Summary

✅ All infrastructure stacks deployed successfully!
✅ Frontend built and deployed to S3!

## Phase 1 Completion Status

### Completed Tasks
- [x] Frontend Stack with S3 and CloudFront OAI created
- [x] Frontend build configuration updated
- [x] GitHub Actions workflow updated for frontend deployment
- [x] Frontend successfully built and deployed to S3

### CloudFront Configuration Note
The CloudFront distribution E34Q2E7TZIYZAB is referenced but needs to be configured manually:
1. The distribution may be in the management account (438465156498)
2. Alternatively, create a new CloudFront distribution in the CTCM Dev account
3. Configure origin to point to: `ctcm-dev-frontend-404875533723.s3.us-east-1.amazonaws.com`
4. Use OAI: `E2RGZGGI3OFF9Y`
5. Set default root object: `index.html`
6. Configure error pages: 404 → /index.html (for SPA routing)

## Stack Outputs

### Network Stack (CtcmDevNetworkStack)
- **VPC ID:** `vpc-02563a885e06b672f`
- **Lambda Security Group:** `sg-00cbec581d51c9be2`
- **Database Security Group:** `sg-0322730ac1ea81d4b`
- **Status:** CREATE_COMPLETE

### Auth Stack (CtcmDevAuthStack)
- **User Pool ID:** `us-east-1_n8pWlYcSS`
- **User Pool ARN:** `arn:aws:cognito-idp:us-east-1:404875533723:userpool/us-east-1_n8pWlYcSS`
- **User Pool Client ID:** `7fotk98fhtt003lf9d1728d49g`
- **Status:** CREATE_COMPLETE

### Data Stack (CtcmDevDataStack)
- **Database Endpoint:** `ctcmdevdatastack-databaseb269d8bb-m4maqdhhpwt9.ckfqwaw86gus.us-east-1.rds.amazonaws.com`
- **Database Secret ARN:** `arn:aws:secretsmanager:us-east-1:404875533723:secret:ctcm-dev-database-credentials-MW2daj`
- **Document Bucket:** `ctcm-dev-documents-404875533723`
- **Frontend Bucket:** `ctcm-dev-frontend-404875533723`
- **Status:** CREATE_COMPLETE

### API Stack (CtcmDevApiStack)
- **API ID:** `phr2i6vklj`
- **API URL:** `https://phr2i6vklj.execute-api.us-east-1.amazonaws.com/dev/`
- **Stage:** `dev`
- **Status:** CREATE_COMPLETE

### Frontend Stack (CtcmDevFrontendStack)
- **Frontend Bucket:** `ctcm-dev-frontend-404875533723`
- **CloudFront Distribution ID:** `E34Q2E7TZIYZAB`
- **API URL:** `https://phr2i6vklj.execute-api.us-east-1.amazonaws.com/dev/`
- **Status:** CREATE_COMPLETE

### OCR Stack (CtcmDevOcrStack)
- **Status:** CREATE_COMPLETE (placeholder)

### Observability Stack (CtcmDevObservabilityStack)
- **Status:** CREATE_COMPLETE (placeholder)

## Next Steps

### Phase 0 Completion
- [x] Monorepo structure created
- [x] AWS CDK infrastructure deployed
- [x] GitHub Actions CI/CD configured
- [x] Shared TypeScript types package created

### Phase 1: Frontend Hosting (Completed ✅)
- [x] S3 bucket created for frontend hosting
- [x] CloudFront OAI configured
- [x] S3 bucket policy applied
- [x] Frontend built successfully
- [x] Frontend deployed to S3
- [x] GitHub Actions workflow updated

**Frontend URL:** Access via S3 bucket or CloudFront (needs configuration)
**S3 Bucket:** `ctcm-dev-frontend-404875533723`

### Phase 2: Authentication Migration (Next)
1. Implement Cognito authentication in frontend
2. Replace Supabase Auth with Cognito
3. Test login/register flows

### Phase 3: Database and API Migration
1. Create database schema in RDS
2. Implement Lambda handlers
3. Deploy API Gateway endpoints
4. Migrate data from Supabase

## Environment Variables for Frontend

Create `.env.local` in `apps/web/`:

```env
VITE_API_URL=https://phr2i6vklj.execute-api.us-east-1.amazonaws.com/dev
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_n8pWlYcSS
VITE_COGNITO_CLIENT_ID=7fotk98fhtt003lf9d1728d49g
```

## Database Connection

To connect to the RDS database:

1. Get credentials from Secrets Manager:
```bash
aws secretsmanager get-secret-value \
  --secret-id arn:aws:secretsmanager:us-east-1:404875533723:secret:ctcm-dev-database-credentials-MW2daj \
  --query SecretString \
  --output text
```

2. Connection details:
- **Host:** `ctcmdevdatastack-databaseb269d8bb-m4maqdhhpwt9.ckfqwaw86gus.us-east-1.rds.amazonaws.com`
- **Port:** `5432`
- **Database:** `ctcm`
- **Username:** `ctcmadmin`
- **Password:** (from Secrets Manager)

## Cost Monitoring

Current estimated monthly costs:
- RDS t4g.micro: ~$15/month
- S3 storage: ~$1/month
- API Gateway: Pay per request
- Lambda: Pay per invocation
- CloudWatch Logs: ~$3/month

**Total estimated:** ~$19-25/month (within budget range)

## Troubleshooting

### Check stack status
```bash
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query 'StackSummaries[?starts_with(StackName, `CtcmDev`)].{Name:StackName, Status:StackStatus}' \
  --output table
```

### View stack outputs
```bash
aws cloudformation describe-stacks \
  --query 'Stacks[?starts_with(StackName, `CtcmDev`)].Outputs' \
  --output table
```

### Check CloudWatch Logs
```bash
aws logs tail /aws/lambda/ctcm-api-function --follow
```

## Support

For issues or questions:
- **Owner:** Christopher Corbin
- **Email:** christophercorbin24@gmail.com
- **GitHub:** christophercorbin/CTCMweb
