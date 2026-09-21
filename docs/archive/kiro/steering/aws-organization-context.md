---
inclusion: always
---

# AWS Organization Context for CTCM

This document provides Kiro with essential context about your AWS Organization setup and CTCM-specific resources. Use this context when designing AWS architectures and infrastructure.

## IMPORTANT: When Acting as Cloud Architect

When given architecture or infrastructure design tasks:
- You have access to a multi-account AWS Organization (details below)
- CTCM Dev account (404875533723) is ready for deployment
- GitHub OIDC authentication is already configured
- Use AWS CDK TypeScript for Infrastructure-as-Code
- Follow the account usage best practices (separate document)
- All infrastructure must be deployed via CI/CD (GitHub Actions)
- Security baseline is non-negotiable: least privilege, encryption, logging

## Organization Overview

**Organization ID:** o-gcj4l3h86o  
**Management Account:** 438465156498  
**Primary Region:** us-east-1  
**Secondary Region:** us-east-2

## CTCM Development Account

**Account ID:** 404875533723  
**Email:** ctcm-dev@christophercorbin.cloud  
**Purpose:** CTCM freight forwarding system development  
**Budget:** $15/month (monitor costs closely)  
**OU:** Foundational → Workloads → CTCM (ou-vq3l-k4rid5o7)  
**Region:** us-east-1 (primary), us-east-2 (DR/secondary)

### Pre-Configured Resources

✅ **GitHub OIDC Role:** arn:aws:iam::404875533723:role/GitHubActionsDeployRole  
✅ **GitHub Repository:** christophercorbin/CTCMweb  
✅ **Budget Alerts:** Configured at 80%, 100% actual, 100% forecasted  
✅ **CloudFormation StackSet Execution Role:** Ready for centralized deployments  
✅ **Service Control Policies:** Region restriction (us-east-1, us-east-2 only), CloudTrail protection

### Available for Deployment

The following AWS services are available and ready to use:
- **Compute:** Lambda, ECS Fargate, EC2 (prefer serverless)
- **Database:** Aurora Serverless v2, RDS PostgreSQL, DynamoDB
- **Storage:** S3 (with lifecycle policies), EFS
- **Networking:** VPC (can be created), Security Groups, VPC Endpoints
- **Auth:** Cognito User Pools, IAM
- **API:** API Gateway (REST/WebSocket), AppSync (GraphQL)
- **Real-time:** AppSync Subscriptions, API Gateway WebSockets, EventBridge
- **ML/AI:** Textract (OCR), Comprehend, Rekognition
- **Orchestration:** Step Functions, EventBridge
- **Monitoring:** CloudWatch Logs/Metrics/Alarms, X-Ray
- **Security:** Secrets Manager, Systems Manager Parameter Store, KMS, WAF
- **CDN:** CloudFront (shared distribution E34Q2E7TZIYZAB available)
- **Notifications:** SES, SNS, SQS

## Future CTCM Accounts (Not Yet Created)

### CTCM Production Account (Phase 2)
- **Purpose:** Production environment for live freight operations
- **Email:** ctcm-prod@christophercorbin.cloud (to be created)
- **Budget:** $30/month (estimated)
- **OU:** Foundational → Workloads → CTCM

**Note:** Production account will be created after dev environment is stable and tested.

## Other AWS Accounts in Organization

### Management Account (438465156498)
- **Email:** christophercorbin24@gmail.com
- **Purpose:** Organization governance, billing, CloudFront
- **DO NOT:** Deploy application workloads here
- **CloudFormation StackSets:** Managed from this account

### ePortfolio Development (934862608865)
- **Email:** eportfolio-dev@christophercorbin.cloud
- **Purpose:** ePortfolio development and testing
- **Budget:** $10/month
- **GitHub OIDC Role:** arn:aws:iam::934862608865:role/GitHubActionsDeployRole

### ePortfolio Production (590716168923)
- **Email:** eportfolio-prod@christophercorbin.cloud
- **Purpose:** ePortfolio live production workloads
- **Budget:** $20/month
- **GitHub OIDC Role:** arn:aws:iam::590716168923:role/GitHubActionsDeployRole

### Sandbox Account (385467776718)
- **Email:** sandbox@christophercorbin.cloud
- **Purpose:** POCs and experimentation
- **Budget:** $15/month

### Network Edge Account (711907671290)
- **Email:** network@christophercorbin.cloud
- **Purpose:** Centralized networking (VPC for future use)

### Log Archive Account (998506036437)
- **Email:** log-archive@christophercorbin.cloud
- **Purpose:** CloudTrail logs storage
- **CloudTrail Bucket:** aws-cloudtrail-logs-998506036437

### Security Tooling Account (702252494165)
- **Email:** security-tooling@christophercorbin.cloud
- **Purpose:** Security monitoring and compliance

## Architecture Design Guidelines for CTCM

When designing AWS architecture for CTCM, follow these principles:

### Cost Optimization (Critical - $15/month budget)
- Prefer serverless: Lambda, Aurora Serverless v2, DynamoDB on-demand
- Use S3 Intelligent-Tiering for storage
- Implement CloudWatch Logs retention policies (7-14 days for dev)
- Use NAT Gateway sparingly (consider VPC endpoints instead)
- Right-size resources: t4g.micro/small for any EC2, minimal RDS instances
- Consider keeping Supabase temporarily to reduce initial AWS costs

### Security Baseline (Non-Negotiable)
- All data encrypted at rest (S3, RDS, DynamoDB) and in transit (TLS)
- Secrets in AWS Secrets Manager or Systems Manager Parameter Store
- Least privilege IAM roles and policies
- Security Groups: deny by default, allow specific ports only
- Enable CloudTrail logging (already configured at org level)
- WAF on CloudFront/API Gateway for production
- Cognito MFA for admin users (production requirement)

### Multi-Account Strategy
- Dev account (404875533723): Active development, testing, experimentation
- Prod account (future): Isolated production workloads, stricter controls
- Shared services in Management account: CloudFront, Route 53, billing

### Infrastructure-as-Code Requirements
- **Preferred:** AWS CDK TypeScript (matches frontend stack)
- **Alternative:** Terraform (justify if chosen)
- All infrastructure must be in version control
- No manual ClickOps changes (except emergency fixes, document immediately)
- Use CDK constructs for reusability
- Tag all resources: Environment, Application, ManagedBy, CostCenter

### CI/CD Requirements
- GitHub Actions with OIDC (already configured)
- Quality gates: lint, typecheck, tests, security scans
- Automated deployments to dev on merge to main/develop
- Manual approval required for production deployments
- Rollback strategy must be defined

### Observability Requirements
- CloudWatch Logs for all Lambda functions, API Gateway, ECS
- CloudWatch Metrics and Alarms for critical resources
- X-Ray tracing for distributed systems (optional for dev, required for prod)
- Cost anomaly detection alerts
- Error rate and latency alarms

## Key Infrastructure

### CloudFormation StackSets
- **GitHubOIDCStackSet:** Manages OIDC providers and deployment roles across accounts
- **StackSetExecutionRoleSetup:** Manages execution roles for StackSets

### IAM Identity Center
- **Portal:** https://d-906601aeb4.awsapps.com/start
- **User:** RootuserChris (christophercorbin24@gmail.com)
- **Kiro User:** ai@christophercorbin.cloud

### Service Control Policies
1. **DenyRootUserAccess** (p-yfqraaj7) - Applied to Foundational OU
2. **RegionRestriction** (p-ber8id2e) - Applied to Workloads OU (us-east-1, us-east-2 only)
3. **ProtectCloudTrail** (p-d8ti9ywq) - Applied to Foundational OU

### CloudFront
- **Distribution ID:** E34Q2E7TZIYZAB
- **Location:** Management account (438465156498)
- **Origins:** 
  - ePortfolio S3 bucket (Production account 590716168923)
  - CTCM S3 bucket (CTCM Dev account 404875533723)

## AWS Service Recommendations for CTCM Use Cases

Based on the freight forwarding system requirements:

### Authentication & Authorization
- **Recommended:** Amazon Cognito User Pools
  - Built-in user management, MFA, groups for admin/customer roles
  - JWT tokens work seamlessly with API Gateway, AppSync, Lambda
  - Cost: Free tier covers 50k MAU, then $0.0055/MAU
- **Alternative:** Keep Supabase Auth temporarily (reduces migration complexity)

### Database
- **Recommended:** Aurora PostgreSQL Serverless v2
  - Auto-scaling, pay-per-use, PostgreSQL compatible
  - Min capacity: 0.5 ACU (~$0.12/hour when active, scales to zero)
  - Cost estimate: $20-40/month for dev workload
- **Alternative:** RDS PostgreSQL t4g.micro ($15/month) - cheaper but less scalable
- **Alternative:** Keep Supabase Postgres temporarily (free tier or $25/month Pro)

### API Layer
- **Recommended:** API Gateway REST + Lambda (TypeScript/Node.js)
  - Serverless, pay-per-request, integrates with Cognito
  - Cost: $3.50 per million requests + Lambda costs
  - Best for REST APIs with moderate complexity
- **Alternative:** AppSync GraphQL
  - Better for real-time subscriptions, complex data fetching
  - Cost: $4 per million requests + data transfer
  - Consider if real-time is critical from day 1

### Real-Time Updates (Shipment Status)
- **Recommended:** AppSync Subscriptions (if using AppSync)
  - Native GraphQL subscriptions, managed WebSocket connections
  - Cost: $2 per million connection minutes
- **Alternative:** API Gateway WebSocket + Lambda
  - More control, but more complex to implement
  - Cost: $1 per million messages + Lambda
- **Alternative:** EventBridge + polling (simplest, no real-time)

### OCR Processing (Warehouse Receipt Intake)
- **Recommended:** S3 + Textract + Lambda + Step Functions
  - Upload to S3 → trigger Lambda → Textract async job → Step Functions orchestration
  - Textract: $1.50 per 1000 pages (Detect Document Text)
  - Cost estimate: $5-10/month for 100-200 receipts
- **Alternative:** Keep Supabase Edge Functions + external OCR temporarily

### Document Storage (Invoices, Receipts)
- **Recommended:** S3 with Intelligent-Tiering
  - Presigned URLs for secure access
  - Lifecycle policies: move to IA after 30 days, Glacier after 90 days
  - Cost: $0.023/GB/month (Standard), $0.0125/GB (IA)

### Search (Shipments, Customers)
- **Recommended:** PostgreSQL Full-Text Search (for dev)
  - Built into Aurora/RDS, no additional cost
  - Good enough for 10k-100k records
- **Alternative:** OpenSearch (for production scale)
  - Better for complex queries, analytics
  - Cost: $20-50/month minimum (t3.small.search instance)

### Frontend Hosting
- **Recommended:** S3 + CloudFront (already configured)
  - Static React build, global CDN
  - Cost: ~$0.17/month for dev traffic
- **Alternative:** AWS Amplify Hosting
  - Easier CI/CD, preview environments
  - Cost: $0.15/build minute + $0.15/GB served

### Networking
- **Recommended for Dev:** Public subnets only (Lambda, Aurora Serverless v2 can be public with security groups)
  - No NAT Gateway needed (saves $32/month)
  - Use VPC endpoints for S3, DynamoDB if needed ($7/month each)
- **Required for Prod:** VPC with private subnets, NAT Gateway, VPC endpoints

## Common CTCM Tasks

## Common AWS Operations for CTCM

### Deploying Infrastructure (CDK)

```bash
# Install CDK
npm install -g aws-cdk

# Bootstrap CDK in account (one-time)
cdk bootstrap aws://404875533723/us-east-1

# Deploy stack
cd infra
cdk deploy --all --require-approval never

# Diff before deploy
cdk diff

# Destroy stack (careful!)
cdk destroy
```

### Checking Deployment Status

```bash
# List CloudFormation stacks
aws cloudformation list-stacks --region us-east-1

# Describe stack
aws cloudformation describe-stacks --stack-name CtcmDevStack --region us-east-1

# View stack events
aws cloudformation describe-stack-events --stack-name CtcmDevStack --region us-east-1
```

### Monitoring and Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/ctcm-api-function --follow

# View API Gateway logs
aws logs tail /aws/apigateway/ctcm-api --follow

# List CloudWatch alarms
aws cloudwatch describe-alarms --region us-east-1

# Get cost and usage
aws ce get-cost-and-usage \
  --time-period Start=2026-02-01,End=2026-02-28 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

## Migration Strategy Considerations

When planning migration from Supabase to AWS:

### Phased Approach (Recommended)
1. **Phase 0:** Keep Supabase, host frontend on AWS (S3 + CloudFront)
2. **Phase 1:** Move auth to Cognito, keep database in Supabase
3. **Phase 2:** Move database to Aurora/RDS, implement API layer
4. **Phase 3:** Implement real-time and OCR on AWS
5. **Phase 4:** Full cutover, decommission Supabase

### Big Bang Approach (Higher Risk)
- Migrate everything at once
- Requires comprehensive testing
- Higher risk of downtime
- Faster to full AWS ownership

### Hybrid Approach (Pragmatic)
- Keep Supabase for database and auth initially
- Build new features on AWS (OCR, real-time, API)
- Gradually migrate data and users
- Lower risk, incremental value

## Cost Estimates for Different Architectures

### Option 1: Supabase + AWS Frontend Only
- AWS: $0.17/month (S3 + CloudFront)
- Supabase: $0-25/month (Free or Pro tier)
- **Total: $0.17-25/month**

### Option 2: Full AWS Serverless (Recommended for Dev)
- Aurora Serverless v2: $20-40/month
- Lambda + API Gateway: $5-10/month
- Cognito: Free tier
- S3 + CloudFront: $1/month
- Textract: $5-10/month
- CloudWatch: $5/month
- **Total: $36-71/month** (over budget, needs optimization)

### Option 3: AWS with RDS t4g.micro (Budget-Friendly)
- RDS PostgreSQL t4g.micro: $15/month
- Lambda + API Gateway: $5-10/month
- Cognito: Free tier
- S3 + CloudFront: $1/month
- Textract: $5-10/month
- CloudWatch: $3/month
- **Total: $29-44/month** (within reasonable range)

### Option 4: Hybrid (Best for Initial Dev)
- Keep Supabase: $25/month (Pro tier)
- AWS Frontend: $0.17/month
- AWS OCR pipeline: $5-10/month
- **Total: $30-35/month**

**Recommendation:** Start with Option 4 (Hybrid) or Option 1 (Supabase + AWS Frontend) to stay within budget, then migrate to Option 3 when ready.

## Security Best Practices

## Security Best Practices for CTCM

### Authentication & Authorization
✅ Use Cognito User Pools with groups (admin, customer)  
✅ Implement MFA for admin users (production requirement)  
✅ JWT tokens with short expiration (15 minutes access, 7 days refresh)  
✅ Role-based access control (RBAC) enforced at API layer  
✅ Customer data isolation via tenant ID in all queries

### Data Protection
✅ Encrypt all data at rest (S3, RDS, DynamoDB) using KMS  
✅ Encrypt all data in transit (TLS 1.2+ only)  
✅ Use presigned URLs for S3 document access (time-limited)  
✅ Implement database backups (automated daily, 7-day retention for dev)  
✅ Enable versioning on S3 buckets for documents

### Network Security
✅ Security Groups: deny by default, allow specific ports only  
✅ Use VPC endpoints for S3, DynamoDB to avoid internet traffic  
✅ No public database access (use bastion host or Systems Manager Session Manager)  
✅ WAF on CloudFront/API Gateway (production requirement)  
✅ DDoS protection via CloudFront and Shield Standard (free)

### Secrets Management
✅ Store all secrets in AWS Secrets Manager or Systems Manager Parameter Store  
✅ Never commit secrets to Git  
✅ Use IAM roles for service-to-service authentication  
✅ Rotate secrets regularly (90 days for dev, 30 days for prod)  
✅ Use GitHub Secrets for CI/CD environment variables

### Logging & Monitoring
✅ Enable CloudTrail (already configured at org level)  
✅ CloudWatch Logs for all Lambda, API Gateway, ECS  
✅ Set up alarms for error rates, latency, cost anomalies  
✅ Implement X-Ray tracing for distributed systems (production)  
✅ Log retention: 7-14 days for dev, 90 days for prod

### IAM Best Practices
✅ Least privilege: grant only necessary permissions  
✅ Use IAM roles, not IAM users (except for emergency access)  
✅ No long-term access keys (use OIDC for CI/CD)  
✅ Implement resource-based policies where applicable  
✅ Tag all resources for cost allocation and access control

## Important Reminders

## Important Reminders for Architecture Design

- **Budget:** $15/month for dev - be cost-conscious in all design decisions
- **Region:** us-east-1 (primary), us-east-2 (DR) - region restriction enforced by SCP
- **GitHub OIDC:** Already configured - use for all CI/CD, no access keys
- **Multi-Account:** Dev account ready, prod account to be created later
- **IaC:** AWS CDK TypeScript preferred, all infrastructure in version control
- **Security:** Non-negotiable baseline - encryption, least privilege, logging
- **Observability:** CloudWatch Logs, Metrics, Alarms required for all services
- **CI/CD:** GitHub Actions with quality gates and security scans
- **Data Isolation:** Customer data must be strictly isolated (tenant ID in all queries)
- **Phased Migration:** Consider keeping Supabase temporarily to reduce complexity and cost

## Quick Reference

**CTCM Dev Account:** 404875533723  
**Region:** us-east-1  
**GitHub Repo:** christophercorbin/CTCMweb  
**IAM Role:** arn:aws:iam::404875533723:role/GitHubActionsDeployRole  
**CloudFront:** E34Q2E7TZIYZAB (shared)  
**Budget:** $15/month

## Support & Documentation

**Account Owner:** Christopher Corbin  
**Email:** christophercorbin24@gmail.com  
**Organization:** o-gcj4l3h86o  
**IAM Identity Center:** https://d-906601aeb4.awsapps.com/start

**Related Documentation:**
- AWS Organization Setup: `/Users/christophercorbin/AWS-orgsetup/`
- Account Usage Best Practices: `.kiro/steering/aws-account-usage-best-practices.md`
- Common AWS Workflows: `.kiro/steering/common-aws-workflows.md`
