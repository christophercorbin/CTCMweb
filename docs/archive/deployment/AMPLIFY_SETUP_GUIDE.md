# AWS Amplify Hosting Setup Guide

## Overview
Successfully deployed AWS Amplify Hosting for the CTCM frontend application. Amplify provides automatic CI/CD, preview environments, and global CDN distribution.

## Deployment Summary

### Stack Information
- **Stack Name**: CtcmDevAmplifyFrontendStack
- **Amplify App ID**: d1lo77mj388p7z
- **Region**: us-east-1
- **Status**: ✅ Deployed

### Amplify Console URL
https://console.aws.amazon.com/amplify/home?region=us-east-1#/d1lo77mj388p7z

## Next Steps: Connect GitHub Repository

### Step 1: Open Amplify Console
1. Go to: https://console.aws.amazon.com/amplify/home?region=us-east-1#/d1lo77mj388p7z
2. You should see the "ctcm-web" app

### Step 2: Connect GitHub Repository
1. Click on the app name "ctcm-web"
2. Click "Host web app" or "Connect repository"
3. Select "GitHub" as the source
4. Click "Connect branch"
5. Authorize AWS Amplify to access your GitHub account
6. Select repository: **christophercorbin/CTCMweb**
7. Select branch: **main**
8. Click "Next"

### Step 3: Configure Build Settings
The build settings are already configured in the CDK stack:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - cd apps/web
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

**Environment Variables** (already configured):
- `VITE_API_URL`: https://phr2i6vklj.execute-api.us-east-1.amazonaws.com/dev/
- `VITE_COGNITO_USER_POOL_ID`: us-east-1_n8pWlYcSS
- `VITE_COGNITO_CLIENT_ID`: 7fotk98fhtt003lf9d1728d49g
- `VITE_AWS_REGION`: us-east-1

Click "Next"

### Step 4: Review and Deploy
1. Review the settings
2. Click "Save and deploy"
3. Amplify will automatically:
   - Clone your repository
   - Install dependencies
   - Build the frontend
   - Deploy to global CDN
   - Provide a URL

### Step 5: Wait for Deployment
- First deployment takes ~5-10 minutes
- You can watch the build logs in real-time
- Once complete, you'll get a URL like: `https://main.d1lo77mj388p7z.amplifyapp.com`

## Features Enabled

### ✅ Automatic Deployments
- Every push to `main` branch triggers automatic build and deployment
- No manual deployment needed

### ✅ SPA Routing
- Custom rewrite rules configured for React Router
- All routes redirect to `index.html` for client-side routing

### ✅ Global CDN
- Amplify uses CloudFront for global distribution
- Automatic HTTPS with AWS-managed certificate
- Fast load times worldwide

### ✅ Build Caching
- Node modules cached between builds
- Faster subsequent deployments

### 🚫 Preview Environments (Disabled)
- Disabled to save costs
- Can be enabled later if needed

## Cost Estimate

### Amplify Hosting Costs
- **Build minutes**: $0.01 per build minute
  - Estimated: 5 minutes per build
  - Cost per build: ~$0.05
  - Monthly (10 builds): ~$0.50

- **Hosting**: $0.15 per GB served
  - Estimated: 1-2 GB/month for dev
  - Cost: ~$0.15-0.30/month

- **Total estimated**: ~$0.65-0.80/month for development

### Comparison with S3 + CloudFront
- **S3 + CloudFront**: ~$0.02-0.17/month (manual deployment)
- **Amplify**: ~$0.65-0.80/month (automatic CI/CD)
- **Difference**: ~$0.50-0.65/month

**Worth it for**:
- Automatic deployments on every push
- No manual build/upload steps
- Preview environments (if enabled)
- Built-in monitoring and logs

## Monitoring and Logs

### Build Logs
- View in Amplify Console under "Build history"
- Shows all build steps and errors
- Useful for debugging build failures

### Access Logs
- CloudWatch Logs integration
- Monitor traffic and errors
- Set up alarms for failures

### Metrics
- Request count
- Data transfer
- Error rates
- Available in Amplify Console

## Custom Domain (Optional)

To add a custom domain:
1. Go to Amplify Console > App Settings > Domain management
2. Click "Add domain"
3. Enter your domain (e.g., ctcm.yourdomain.com)
4. Follow DNS configuration instructions
5. Amplify will provision SSL certificate automatically

## Rollback

If you need to rollback to a previous deployment:
1. Go to Amplify Console
2. Click on "Deployments" tab
3. Find the previous successful deployment
4. Click "Redeploy this version"

## Troubleshooting

### Build Fails
1. Check build logs in Amplify Console
2. Verify environment variables are set correctly
3. Test build locally: `cd apps/web && npm run build`
4. Check for TypeScript errors: `npm run typecheck`

### App Not Loading
1. Check browser console for errors
2. Verify Cognito configuration in environment variables
3. Check API Gateway URL is correct
4. Verify CORS settings on API Gateway

### GitHub Connection Issues
1. Revoke and re-authorize GitHub access
2. Check repository permissions
3. Verify branch name is correct

## Cleanup Old Resources

Now that we're using Amplify, we can clean up the old S3 + CloudFront resources:

### Delete Old Frontend Stack (Optional)
```bash
AWS_PROFILE=kiro-ctcm-dev-admin aws cloudformation delete-stack --stack-name CtcmDevFrontendStack
```

### Delete S3 Frontend Bucket (Optional)
The bucket `ctcm-dev-frontend-404875533723` is no longer needed and can be deleted.

**Note**: Keep the CloudFront distribution E34Q2E7TZIYZAB if it's shared with other projects (ePortfolio).

## Next Steps

1. ✅ Connect GitHub repository (follow steps above)
2. ✅ Wait for first deployment to complete
3. ✅ Test the deployed app
4. ✅ Verify authentication works
5. ✅ Check all pages load correctly
6. 🔄 Update GitHub Actions workflow (if needed)
7. 🔄 Add custom domain (optional)
8. 🔄 Set up monitoring and alarms

## Support

- **Amplify Documentation**: https://docs.aws.amazon.com/amplify/
- **Amplify Console**: https://console.aws.amazon.com/amplify/
- **GitHub Repository**: https://github.com/christophercorbin/CTCMweb

## Summary

AWS Amplify Hosting is now configured for the CTCM frontend. Once you connect the GitHub repository, every push to the `main` branch will automatically build and deploy the application. The app will be available at a URL like `https://main.d1lo77mj388p7z.amplifyapp.com`.

The additional cost (~$0.50-0.65/month) is worth it for the automatic CI/CD pipeline and simplified deployment process.
