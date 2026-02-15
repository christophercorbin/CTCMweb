# CTCM AWS Migration - Quick Start Guide

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- AWS CLI v2
- AWS CDK CLI: `npm install -g aws-cdk`

## Step 1: Setup AWS Access to CTCM Dev Account

You need access to the CTCM Dev account (404875533723) to deploy infrastructure.

### Option A: Automated Setup (Recommended)

```bash
# Run the setup script
./scripts/setup-ctcm-dev-profile.sh
```

This will:
1. Configure AWS SSO profile for CTCM Dev account
2. Login to AWS SSO
3. Verify credentials

### Option B: Manual Setup

```bash
# Configure SSO profile
aws configure sso --profile ctcm-dev

# When prompted:
# - SSO start URL: https://d-906601aeb4.awsapps.com/start
# - SSO region: us-east-1
# - Select account: CTCM Dev (404875533723)
# - Select role: AdministratorAccess
# - Region: us-east-1
# - Profile name: ctcm-dev

# Login
aws sso login --profile ctcm-dev

# Verify
AWS_PROFILE=ctcm-dev aws sts get-caller-identity
```

## Step 2: Bootstrap AWS CDK

Bootstrap CDK in the CTCM Dev account (one-time operation):

```bash
# Automated
./scripts/bootstrap-cdk.sh

# Or manual
AWS_PROFILE=ctcm-dev cdk bootstrap aws://404875533723/us-east-1 \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
  --trust 438465156498 \
  --trust-for-lookup 438465156498
```

## Step 3: Install Dependencies

```bash
# Install all workspace dependencies
npm install
```

## Step 4: Deploy Infrastructure

### Preview Changes

```bash
cd infra
AWS_PROFILE=ctcm-dev npm run diff
```

### Deploy All Stacks

```bash
cd infra
AWS_PROFILE=ctcm-dev npm run deploy
```

### Deploy Specific Stack

```bash
cd infra
AWS_PROFILE=ctcm-dev cdk deploy CtcmDevNetworkStack
```

## Step 5: Build and Deploy Frontend

```bash
# Build frontend
npm run build:web

# Get S3 bucket name from CloudFormation outputs
BUCKET=$(AWS_PROFILE=ctcm-dev aws cloudformation describe-stacks \
  --stack-name CtcmDevFrontendStack \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text)

# Deploy to S3
AWS_PROFILE=ctcm-dev aws s3 sync apps/web/dist s3://$BUCKET --delete

# Invalidate CloudFront cache
DIST_ID=$(AWS_PROFILE=ctcm-dev aws cloudformation describe-stacks \
  --stack-name CtcmDevFrontendStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
  --output text)

AWS_PROFILE=ctcm-dev aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*"
```

## Common Commands

### Development

```bash
# Start frontend dev server
npm run dev

# Run linting
npm run lint

# Run type checking
npm run typecheck

# Run tests
npm run test
```

### Infrastructure

```bash
# Synthesize CloudFormation templates
cd infra
AWS_PROFILE=ctcm-dev npm run synth

# View differences
AWS_PROFILE=ctcm-dev npm run diff

# Deploy all stacks
AWS_PROFILE=ctcm-dev npm run deploy

# Destroy all stacks (careful!)
AWS_PROFILE=ctcm-dev npm run destroy
```

### AWS CLI

```bash
# List CloudFormation stacks
AWS_PROFILE=ctcm-dev aws cloudformation list-stacks --region us-east-1

# Describe specific stack
AWS_PROFILE=ctcm-dev aws cloudformation describe-stacks \
  --stack-name CtcmDevNetworkStack

# View stack outputs
AWS_PROFILE=ctcm-dev aws cloudformation describe-stacks \
  --stack-name CtcmDevNetworkStack \
  --query 'Stacks[0].Outputs'

# Check current AWS identity
AWS_PROFILE=ctcm-dev aws sts get-caller-identity
```

## Troubleshooting

### "User is not authorized to perform: sts:AssumeRole"

You're using the wrong AWS profile or don't have access to the CTCM Dev account.

**Solution**: Run `./scripts/setup-ctcm-dev-profile.sh` to configure SSO access.

### "CDKToolkit stack already exists"

CDK is already bootstrapped. You can proceed with deployment.

### "Token has expired" or "ExpiredToken"

Your SSO session has expired.

**Solution**: 
```bash
aws sso login --profile ctcm-dev
```

### CDK synth fails with "Could not assume role"

The CDK hasn't been bootstrapped yet.

**Solution**: Run `./scripts/bootstrap-cdk.sh`

### npm install fails

Clear cache and reinstall:
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## Project Structure

```
ctcm-web/
├── apps/
│   ├── web/              # React frontend
│   └── api/              # Lambda functions
├── packages/
│   ├── types/            # Shared TypeScript types
│   └── utils/            # Shared utilities
├── infra/                # AWS CDK infrastructure
│   ├── bin/app.ts        # CDK app entry point
│   └── lib/stacks/       # CDK stack definitions
├── scripts/              # Helper scripts
└── .github/workflows/    # CI/CD pipelines
```

## Environment Variables

For local development, create `.env` files:

### apps/web/.env.local

```env
VITE_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_AWS_REGION=us-east-1
```

Get these values from CloudFormation outputs after deployment.

## Next Steps

1. ✅ Complete Phase 0: Project setup (DONE)
2. 🔄 Phase 1: Frontend hosting migration
3. 🔄 Phase 2: Authentication migration (Cognito)
4. 🔄 Phase 3: Database and API migration
5. 🔄 Phase 4: OCR and real-time features
6. 🔄 Phase 5: Full cutover and hardening

## Documentation

- [Bootstrap Guide](BOOTSTRAP_CDK.md) - Detailed CDK bootstrap instructions
- [Requirements](.kiro/specs/aws-migration/requirements.md)
- [Design](.kiro/specs/aws-migration/design.md)
- [Tasks](.kiro/specs/aws-migration/tasks.md)

## Support

- AWS Account: 404875533723 (CTCM Dev)
- Region: us-east-1
- GitHub Repo: christophercorbin/CTCMweb
