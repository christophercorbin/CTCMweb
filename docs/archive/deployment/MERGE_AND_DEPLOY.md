# Merge Amplify Conversion Branch and Deploy

## Current Situation

- **Current Branch**: `amplify-conversion`
- **Amplify App ID**: d2ai2zsj42scq0 (connected to wrong branch)
- **Issue**: Build failed because Amplify is connected to a branch that doesn't have the latest code
- **Solution**: Merge to `main` and update Amplify configuration

## Step-by-Step Guide

### Step 1: Commit Current Changes

```bash
# Add all changes
git add -A

# Commit with descriptive message
git commit -m "feat: complete Phase 4 and Phase 5 Amplify Gen 2 migration

- Add Amplify Functions for shipments, customers, invoices, documents, search
- Create shared database connection module
- Configure Amplify build settings with quality gates
- Add deployment documentation and scripts"

# Push to remote
git push origin amplify-conversion
```

### Step 2: Merge to Main

```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Merge amplify-conversion branch
git merge amplify-conversion

# Push to main
git push origin main
```

### Step 3: Update Amplify App Configuration

You have two options:

#### Option A: Update Existing App (Recommended)

1. Go to Amplify Console: https://console.aws.amazon.com/amplify/home?region=us-east-1
2. Find your app (d2ai2zsj42scq0)
3. Click on the app
4. Go to "App settings" → "General"
5. Under "Branches", find the current branch
6. Click "Connect branch"
7. Select "main" branch
8. Save and trigger a new build

#### Option B: Delete and Recreate (Clean Slate)

1. Go to Amplify Console
2. Find your app (d2ai2zsj42scq0)
3. Click "Actions" → "Delete app"
4. Confirm deletion
5. Follow the setup guide in `docs/deployment/AMPLIFY_QUICK_START.md`
6. This time, select "main" branch

### Step 4: Verify Build

1. Monitor the build in Amplify Console
2. Check build logs for any errors
3. Verify all phases complete:
   - Provision
   - Build (preBuild, build)
   - Deploy
   - Verify

### Step 5: Test Deployed Application

Once the build succeeds:

1. Open the Amplify URL (shown in console)
2. Test authentication
3. Test navigation
4. Check browser console for errors

## Common Build Failures and Fixes

### Issue: "amplify/ directory not found"

**Cause**: Branch doesn't have Amplify Gen 2 code

**Fix**: Make sure you merged `amplify-conversion` to `main`

```bash
git checkout main
git log --oneline -5  # Verify merge commit is present
```

### Issue: "npm ci failed"

**Cause**: Package lock file issues or missing dependencies

**Fix**: Update package-lock.json

```bash
npm install
git add package-lock.json
git commit -m "chore: update package-lock.json"
git push origin main
```

### Issue: "Type checking failed"

**Cause**: TypeScript errors in code

**Fix**: The amplify.yml is configured to make type checking non-blocking, so this shouldn't fail the build. If it does, check the logs.

### Issue: "Build command failed"

**Cause**: Vite build errors

**Fix**: Test build locally first

```bash
npm run build --workspace=apps/web
```

Fix any errors, commit, and push.

## Environment Variables Checklist

Make sure these are set in Amplify Console:

- [ ] VITE_API_URL
- [ ] VITE_COGNITO_USER_POOL_ID=us-east-1_n8pWlYcSS
- [ ] VITE_COGNITO_CLIENT_ID=7fotk98fhtt003lf9d1728d49g
- [ ] VITE_COGNITO_REGION=us-east-1
- [ ] VITE_AWS_REGION=us-east-1

## Quick Commands

```bash
# Check current branch
git branch --show-current

# View commit history
git log --oneline -10

# Check remote branches
git branch -r

# Force push if needed (use with caution)
git push origin main --force

# View Amplify apps
aws amplify list-apps --region us-east-1

# Get app details
aws amplify get-app --app-id d2ai2zsj42scq0 --region us-east-1

# List branches for an app
aws amplify list-branches --app-id d2ai2zsj42scq0 --region us-east-1
```

## After Successful Deployment

1. ✅ Mark tasks 6.1 and 6.4 as complete
2. ✅ Update task status in `.kiro/specs/amplify-gen2-migration/tasks.md`
3. ✅ Test all functionality end-to-end
4. → Proceed to Phase 6: OCR Pipeline Migration

## Rollback Plan

If something goes wrong:

```bash
# Revert merge on main
git checkout main
git reset --hard origin/main~1  # Go back one commit
git push origin main --force

# Or revert specific commit
git revert <commit-hash>
git push origin main
```

## Support

- Amplify Console: https://console.aws.amazon.com/amplify/home?region=us-east-1
- Build logs: Click on your app → Click on a build → View logs
- AWS Support: If you encounter persistent issues
