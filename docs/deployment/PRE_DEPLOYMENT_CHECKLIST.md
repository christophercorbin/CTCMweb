# Pre-Deployment Checklist

This document outlines what needs to be verified before the GitHub Actions deployment will work.

## ✅ Completed

1. **TypeScript Errors Fixed** - All 37+ TypeScript errors resolved
2. **ESLint Configuration Fixed** - Disabled problematic `no-unused-expressions` rule, configured underscore-prefixed vars
3. **Workflow Files Updated** - All workflows use Node 20, consistent build commands
4. **Amplify App Created** - App ID: `d3fm03a2oiet1x` in account 404875533723
5. **AWS OIDC Role Configured** - `arn:aws:iam::404875533723:role/GitHubActionsDeployRole`
6. **Code Pushed to GitHub** - All fixes committed to `develop` branch

## ⚠️ Needs Verification

### 1. GitHub Secrets Configuration

The following secrets must be set in GitHub repository settings:

**Required:**
- `AMPLIFY_APP_ID` = `d3fm03a2oiet1x`

**Optional (CI will continue without these):**
- `SNYK_TOKEN` = Your Snyk API token (for security scanning)

**How to set:**
1. Go to https://github.com/christophercorbin/CTCMweb/settings/secrets/actions
2. Click "New repository secret"
3. Add `AMPLIFY_APP_ID` with value `d3fm03a2oiet1x`

### 2. GitHub Environments

The workflows reference two environments that should be configured:

**Development Environment:**
- Name: `development`
- No approval required
- Used by: `deploy-dev.yml`

**Production Environment:**
- Name: `production`
- Requires manual approval
- Approvers: christophercorbin
- Used by: `deploy-prod.yml`

**How to configure:**
1. Go to https://github.com/christophercorbin/CTCMweb/settings/environments
2. Create `development` environment (no protection rules needed)
3. Create `production` environment with required reviewers

### 3. AWS Permissions Verification

Verify the GitHubActionsDeployRole has permissions for:
- Amplify (full access for pipeline deploys)
- CloudFormation (for CDK stack operations)
- S3 (for Amplify artifacts)
- Lambda (for function deployments)
- DynamoDB (for data model)
- Cognito (for auth)
- AppSync (for GraphQL API)
- IAM (for creating service roles)

**How to verify:**
```bash
aws iam get-role --role-name GitHubActionsDeployRole --profile ctcm-dev
aws iam list-attached-role-policies --role-name GitHubActionsDeployRole --profile ctcm-dev
```

## 📋 Deployment Workflow

Once the above is verified, the deployment will work as follows:

### Automatic Deployment (develop branch)

1. Push to `develop` branch triggers `deploy-dev.yml`
2. Workflow runs:
   - Lint (with warnings allowed)
   - Typecheck (must pass)
   - Test (if tests exist)
   - AWS OIDC authentication
   - Amplify backend deploy via `ampx pipeline-deploy`
   - Frontend build check
3. Amplify Hosting auto-deploys frontend from Git

### Manual Deployment (production)

1. Trigger `deploy-prod.yml` manually from GitHub Actions UI
2. Workflow runs same checks as dev
3. **Manual approval required** before deployment
4. Deploys to production after approval

## 🔍 Monitoring Deployment

### Check GitHub Actions
https://github.com/christophercorbin/CTCMweb/actions

### Check Amplify Console
https://us-east-1.console.aws.amazon.com/amplify/home?region=us-east-1#/d3fm03a2oiet1x

### Check CloudFormation Stacks
```bash
aws cloudformation list-stacks --region us-east-1 --profile ctcm-dev
```

### View Amplify Logs
```bash
aws amplify get-app --app-id d3fm03a2oiet1x --region us-east-1 --profile ctcm-dev
```

## 🚨 Troubleshooting

### Deployment Fails with "App not found"
- Verify AMPLIFY_APP_ID secret is set correctly
- Verify app exists: `aws amplify get-app --app-id d3fm03a2oiet1x --region us-east-1`

### Deployment Fails with "Access Denied"
- Verify OIDC trust relationship in GitHubActionsDeployRole
- Check role has necessary permissions
- Verify GitHub repository is `christophercorbin/CTCMweb`

### Lint Warnings
- Warnings are allowed and won't block deployment
- TypeScript version warning is expected (5.9.3 vs 5.6.0 supported)
- React refresh warning in AuthContext is acceptable

### Backend Deploy Fails
- Check CloudFormation stack events for errors
- Verify all Amplify resources are valid
- Check Lambda function resource groups are correct

## 📝 Next Steps After Successful Deployment

1. **Connect Amplify Hosting to GitHub**
   - Go to Amplify Console → Hosting → Connect branch
   - Select `develop` branch
   - Configure build settings (should auto-detect)

2. **Create First Admin User**
   ```bash
   aws cognito-idp admin-create-user \
     --user-pool-id <USER_POOL_ID> \
     --username admin@ctcm.com \
     --user-attributes Name=email,Value=admin@ctcm.com Name=email_verified,Value=true \
     --temporary-password TempPass123! \
     --region us-east-1
   
   aws cognito-idp admin-add-user-to-group \
     --user-pool-id <USER_POOL_ID> \
     --username admin@ctcm.com \
     --group-name admins \
     --region us-east-1
   ```

3. **Test the Application**
   - Visit the Amplify hosting URL
   - Login with admin credentials
   - Verify all features work

4. **Monitor Costs**
   - Check AWS Cost Explorer daily
   - Set up budget alerts at $12 (80% of $15 budget)
   - Monitor DynamoDB, Lambda, and AppSync usage

## 📚 Related Documentation

- [Handoff to Kiro](../HANDOFF_TO_KIRO.md) - Complete deployment guide
- [Amplify Quick Start](./AMPLIFY_QUICK_START.md) - Amplify Gen 2 setup
- [Workflow Strategy](./WORKFLOW_STRATEGY.md) - CI/CD strategy
- [AWS Organization Context](../../.kiro/steering/aws-organization-context.md) - AWS account details
