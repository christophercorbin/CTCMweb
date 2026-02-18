# Amplify Hosting Setup Guide

This guide walks through setting up AWS Amplify Hosting for the CTCM frontend application.

## Prerequisites

- AWS Account with Amplify access
- GitHub repository: `christophercorbin/CTCMweb`
- Amplify backend deployed (auth, storage, functions)
- Database credentials in AWS Secrets Manager

## Phase 5: Frontend Hosting Migration

### Task 6.1: Connect GitHub Repository to Amplify Console

1. **Navigate to AWS Amplify Console**
   - Go to: https://console.aws.amazon.com/amplify/
   - Region: us-east-1
   - Account: 404875533723 (CTCM Dev)

2. **Create New App**
   - Click "New app" → "Host web app"
   - Select "GitHub" as the repository service
   - Click "Connect branch"

3. **Authorize GitHub Access**
   - If prompted, authorize AWS Amplify to access your GitHub account
   - Grant access to the `christophercorbin/CTCMweb` repository

4. **Select Repository and Branch**
   - Repository: `christophercorbin/CTCMweb`
   - Branch: `main` (for production) or `develop` (for dev environment)
   - Click "Next"

5. **Configure App Settings**
   - App name: `ctcm-dev` (or `ctcm-prod` for production)
   - Environment: `dev` (or `prod`)
   - Click "Next"

### Task 6.2: Configure Build Settings ✅

The `amplify.yml` file has been created with:
- Monorepo build configuration for `apps/web`
- Build output directory: `apps/web/dist`
- Quality gates: linting and type checking
- Backend deployment integration

### Task 6.3: Configure CI/CD Quality Gates ✅

Quality gates configured in `amplify.yml`:
- ✅ Linting: `npm run lint --workspace=apps/web`
- ✅ Type checking: `npm run typecheck --workspace=apps/web`
- ✅ Build will fail if linting or type checking fails

### Task 6.4: Configure Environment Variables

In the Amplify Console, configure the following environment variables:

#### Required Environment Variables

```bash
# API Configuration
VITE_API_URL=<API_GATEWAY_ENDPOINT>
# Example: https://abc123.execute-api.us-east-1.amazonaws.com/prod

# Cognito Configuration
VITE_COGNITO_USER_POOL_ID=us-east-1_n8pWlYcSS
VITE_COGNITO_CLIENT_ID=7fotk98fhtt003lf9d1728d49g
VITE_COGNITO_REGION=us-east-1

# Storage Configuration
VITE_STORAGE_BUCKET=<AMPLIFY_STORAGE_BUCKET_NAME>
# Will be available after Amplify Storage deployment
VITE_STORAGE_REGION=us-east-1

# AWS Region
VITE_AWS_REGION=us-east-1
```

#### How to Set Environment Variables

1. In Amplify Console, go to your app
2. Click "Environment variables" in the left sidebar
3. Click "Manage variables"
4. Add each variable with its value
5. Click "Save"

### Task 6.5: Trigger Initial Build

1. **Start Manual Build**
   - In Amplify Console, go to your app
   - Click "Run build" or wait for automatic trigger
   - Monitor build progress in real-time

2. **Monitor Build Logs**
   - Watch for errors in:
     - Provision phase
     - Build phase (preBuild, build)
     - Deploy phase
   - Check quality gate results (linting, type checking)

3. **Verify Build Success**
   - Build status should show "Deployed"
   - Green checkmark indicates success
   - Note the Amplify URL (e.g., `https://main.d1234567890.amplifyapp.com`)

4. **Test Deployed Frontend**
   - Open the Amplify URL in a browser
   - Verify the application loads
   - Test authentication flow
   - Test navigation (SPA routing)
   - Check browser console for errors

### Task 6.6: Configure Custom Domain (Optional)

If you have a custom domain:

1. Go to "Domain management" in Amplify Console
2. Click "Add domain"
3. Enter your domain (e.g., `ctcm.christophercorbin.cloud`)
4. Follow DNS configuration instructions
5. Wait for SSL certificate provisioning (5-10 minutes)

## Troubleshooting

### Build Fails During Linting

**Error**: `npm run lint --workspace=apps/web` fails

**Solution**:
1. Run linting locally: `npm run lint --workspace=apps/web`
2. Fix linting errors
3. Commit and push changes
4. Rebuild in Amplify

### Build Fails During Type Checking

**Error**: `npm run typecheck --workspace=apps/web` fails

**Solution**:
1. Run type checking locally: `npm run typecheck --workspace=apps/web`
2. Fix type errors
3. Commit and push changes
4. Rebuild in Amplify

### Environment Variables Not Available

**Error**: Application can't connect to API or Cognito

**Solution**:
1. Verify environment variables are set in Amplify Console
2. Check variable names match exactly (case-sensitive)
3. Redeploy the application
4. Check browser console for specific errors

### SPA Routing Not Working

**Error**: Direct URL access returns 404

**Solution**:
1. Verify `amplify.yml` has correct artifacts configuration
2. Amplify should automatically configure SPA rewrites
3. Check "Rewrites and redirects" in Amplify Console
4. Should have: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>` → `/index.html` (200)

### Build Takes Too Long

**Issue**: Build exceeds 30 minutes

**Solution**:
1. Check cache configuration in `amplify.yml`
2. Verify `node_modules` are cached
3. Consider using `npm ci` instead of `npm install`
4. Remove unnecessary dependencies

## Monitoring and Maintenance

### View Build History

1. Go to Amplify Console
2. Click on your app
3. View build history with status and duration
4. Click on a build to see detailed logs

### Set Up Notifications

1. Go to "Notifications" in Amplify Console
2. Configure email or SNS notifications for:
   - Build failures
   - Build successes
   - Deployment completions

### Monitor Performance

1. Use CloudWatch Logs for Amplify
2. Monitor build duration trends
3. Track deployment frequency
4. Set up alarms for build failures

## Rollback Procedure

If a deployment causes issues:

1. **Immediate Rollback**
   - Go to Amplify Console
   - Find the last successful build
   - Click "Redeploy this version"

2. **Git Rollback**
   - Revert the problematic commit in Git
   - Push to trigger automatic rebuild
   - Verify the rollback deployment

3. **Manual Intervention**
   - Disable automatic deployments temporarily
   - Fix the issue locally
   - Test thoroughly
   - Re-enable automatic deployments

## Cost Optimization

### Amplify Hosting Costs

- **Build minutes**: $0.01 per build minute
- **Storage**: $0.023 per GB per month
- **Data transfer**: $0.15 per GB served
- **Free tier**: 1,000 build minutes/month, 15 GB served/month

### Estimated Monthly Costs (Dev Environment)

- Builds: ~10 builds/month × 5 min = 50 min = $0.50
- Storage: ~100 MB = $0.002
- Data transfer: ~1 GB = $0.15
- **Total**: ~$0.65/month (well within free tier)

## Next Steps

After successful frontend deployment:

1. ✅ Verify all environment variables are correct
2. ✅ Test authentication flow end-to-end
3. ✅ Test document upload/download
4. ✅ Test API integration
5. ✅ Configure custom domain (optional)
6. → Proceed to Phase 6: OCR Pipeline Migration

## References

- [Amplify Hosting Documentation](https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html)
- [Amplify Build Specification](https://docs.aws.amazon.com/amplify/latest/userguide/build-settings.html)
- [Amplify Environment Variables](https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html)
- [Amplify Custom Domains](https://docs.aws.amazon.com/amplify/latest/userguide/custom-domains.html)
