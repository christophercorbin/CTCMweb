# CI/CD Workflow Strategy

## Overview

This document explains the CI/CD workflow strategy for the CTCM project using AWS Amplify Hosting and GitHub Actions.

## Architecture

### Frontend Deployment (AWS Amplify)
- **Hosting**: AWS Amplify Hosting
- **Build**: Automatic builds triggered by GitHub pushes
- **Deployment**: Automatic deployment after successful build
- **CDN**: Built-in CloudFront distribution managed by Amplify
- **Environment Variables**: Injected by Amplify from CDK stack outputs

### Backend Deployment (GitHub Actions + CDK)
- **Infrastructure**: AWS CDK deployed via GitHub Actions
- **API**: Lambda functions, API Gateway, RDS, etc.
- **Deployment**: Manual trigger via GitHub Actions workflows

## Branch Strategy

### `develop` Branch (Development Environment)
- **Purpose**: Active development and testing
- **AWS Account**: 404875533723 (CTCM Dev)
- **Amplify**: Automatically deploys frontend from `develop` branch
- **GitHub Actions**: Deploys backend infrastructure on push to `develop`
- **Workflow**: `.github/workflows/deploy-dev.yml`

### `main` Branch (Production Environment)
- **Purpose**: Production-ready code (future)
- **AWS Account**: TBD (Production account not yet created)
- **Amplify**: Will deploy frontend from `main` branch (when prod account exists)
- **GitHub Actions**: Disabled until production account is created
- **Workflow**: `.github/workflows/deploy-prod.yml` (currently disabled)

## Workflow Details

### CI Workflow (`.github/workflows/ci.yml`)
**Triggers**: Push or PR to `main` or `develop`

**Jobs**:
1. **Lint**: ESLint checks
2. **Type Check**: TypeScript compilation checks
3. **Test**: Unit and integration tests
4. **Security Scan**: npm audit and Snyk
5. **Build**: Build all workspaces (types, utils, api, web, infra)

**Purpose**: Ensure code quality before deployment

### Deploy to Development (`.github/workflows/deploy-dev.yml`)
**Triggers**: Push to `develop` branch or manual dispatch

**Steps**:
1. Install dependencies
2. Build shared packages (@ctcm/types, @ctcm/utils)
3. Run linting, type checking, tests
4. Build all workspaces
5. Configure AWS credentials (OIDC)
6. Deploy CDK infrastructure (backend only)

**What it DOES deploy**:
- ✅ Network Stack (VPC, Security Groups)
- ✅ Auth Stack (Cognito)
- ✅ Data Stack (RDS, S3 buckets)
- ✅ API Stack (Lambda, API Gateway)
- ✅ Amplify Stack (Amplify App configuration)
- ✅ OCR Stack (Textract, Step Functions)
- ✅ Observability Stack (CloudWatch)

**What it DOES NOT deploy**:
- ❌ Frontend code (Amplify handles this automatically)

### Deploy to Production (`.github/workflows/deploy-prod.yml`)
**Status**: Currently DISABLED

**Reason**: Production AWS account not yet created

**When to enable**:
1. Create production AWS account
2. Set up GitHub OIDC role in production account
3. Update `AWS_ACCOUNT_ID` in workflow
4. Uncomment the `push: branches: [main]` trigger
5. Configure Amplify to deploy from `main` branch

## AWS Amplify Deployment Flow

### How Amplify Works
1. **GitHub Integration**: Amplify connects directly to your GitHub repository
2. **Automatic Builds**: When you push to `develop` (or `main` for prod), Amplify:
   - Detects the push via webhook
   - Runs the build commands from the buildSpec in CDK
   - Builds the frontend (`npm run build` in `apps/web`)
   - Deploys to Amplify hosting
   - Invalidates CDN cache automatically
3. **Environment Variables**: Amplify injects environment variables from CDK:
   - `VITE_API_URL`
   - `VITE_COGNITO_USER_POOL_ID`
   - `VITE_COGNITO_CLIENT_ID`
   - `VITE_AWS_REGION`

### Viewing Amplify Deployments
- **Console**: https://console.aws.amazon.com/amplify/home?region=us-east-1
- **App Name**: ctcm-web
- **Branch**: develop (for dev environment)

## Deployment Process

### For Backend Changes (API, Database, Infrastructure)
1. Make changes to backend code
2. Commit and push to `develop` branch
3. GitHub Actions workflow runs automatically
4. CDK deploys infrastructure changes
5. Amplify automatically rebuilds frontend (if env vars changed)

### For Frontend Changes (React App)
1. Make changes to frontend code in `apps/web`
2. Commit and push to `develop` branch
3. Amplify automatically detects the push
4. Amplify builds and deploys the frontend
5. No GitHub Actions workflow needed!

### For Full Stack Changes
1. Make changes to both frontend and backend
2. Commit and push to `develop` branch
3. GitHub Actions deploys backend infrastructure
4. Amplify automatically deploys frontend
5. Both deployments happen in parallel

## Troubleshooting

### Frontend not updating?
- Check Amplify console for build status
- Verify the correct branch is connected
- Check build logs in Amplify console

### Backend deployment failing?
- Check GitHub Actions workflow logs
- Verify AWS credentials are configured
- Check CDK stack outputs

### Environment variables not working?
- Verify they're set in the Amplify stack (CDK)
- Check Amplify console > App Settings > Environment variables
- Redeploy the Amplify stack if you changed env vars

## Cost Optimization

### What Amplify Provides
- ✅ Hosting (no S3 bucket needed)
- ✅ CDN (no separate CloudFront needed)
- ✅ SSL certificate (automatic)
- ✅ Build pipeline (no CodeBuild needed)
- ✅ Atomic deployments with rollback

### Cost Estimate
- **Amplify Hosting**: $0.01/GB served + $0.01/build minute
- **Typical dev usage**: ~$1-2/month
- **Savings**: No separate S3, CloudFront, CodeBuild costs

## Future Enhancements

### When Production Account is Created
1. Create new AWS account for production
2. Set up GitHub OIDC role in prod account
3. Create separate Amplify app for production
4. Enable prod deployment workflow
5. Configure branch protection rules
6. Add manual approval for prod deployments

### Potential Improvements
- Add Slack/SNS notifications for deployments
- Add deployment status badges to README
- Add automated rollback on failure
- Add blue/green deployments for API
- Add canary deployments for frontend

## References

- [AWS Amplify Hosting Documentation](https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html)
- [GitHub Actions OIDC with AWS](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/v2/guide/home.html)
