# CTCM Testing Guide

## Quick Start Testing

### 1. Access the Application

**Frontend URL:** https://main.d1yo6c4008x99n.amplifyapp.com

The application should load in your browser. You'll see the CTCM login page.

### 2. Test Authentication

#### Admin User Login
```
Email: admin@ctcm.com
Password: AdminPass123!
```

This user has admin privileges and should see:
- Admin dashboard
- Customer management
- All shipments
- System settings

#### Customer User Login
```
Email: test@ctcm.com
Password: TestPass123!
```

This user has customer privileges and should see:
- Customer dashboard
- Their own shipments only
- Limited features

### 3. Expected Behavior (Phase 2)

**What Works:**
- ✅ Login/logout functionality
- ✅ Navigation between pages
- ✅ UI components render correctly
- ✅ Mock data displays in dashboards
- ✅ Forms and inputs work

**What Doesn't Work Yet:**
- ❌ Creating/editing real data (uses mock data)
- ❌ API calls return "Coming in Phase 3" messages
- ❌ Document upload/OCR processing
- ❌ Real-time shipment updates
- ❌ Email notifications

### 4. Browser Console

Open browser developer tools (F12) and check the console. You should see:

```
Cognito Configuration: {
  userPoolId: "us-east-1_zqM1VNIn3",
  clientId: "3h9u26uesvgc019813nb3dufpq",
  region: "us-east-1"
}
Amplify configured successfully
```

If you see errors about missing environment variables, the Amplify build may not have picked up the environment variables correctly.

### 5. Test API Endpoint (Placeholder)

The API is deployed but returns placeholder responses:

```bash
curl https://1y447zjdhj.execute-api.us-east-1.amazonaws.com/dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "CTCM API is running (placeholder)"
}
```

### 6. Verify Database Connection

The database is running but not yet connected to the API:

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

# List tables (should be empty or have schema only)
\dt
```

---

## Troubleshooting

### Login Fails

**Symptom:** "User does not exist" or "Incorrect username or password"

**Solutions:**
1. Verify you're using the correct credentials (see above)
2. Check that users exist in Cognito:
   ```bash
   AWS_PROFILE=kiro-ctcm-dev-admin aws cognito-idp list-users \
     --user-pool-id us-east-1_zqM1VNIn3 \
     --region us-east-1
   ```
3. If users don't exist, recreate them (see below)

### Environment Variables Not Loading

**Symptom:** Console shows `undefined` for Cognito configuration

**Solutions:**
1. Check Amplify environment variables in AWS Console
2. Trigger a new build:
   ```bash
   AWS_PROFILE=kiro-ctcm-dev-admin aws amplify start-job \
     --app-id d1yo6c4008x99n \
     --branch-name main \
     --job-type RELEASE \
     --region us-east-1
   ```
3. Verify environment variables in Amplify Console:
   - Go to: https://console.aws.amazon.com/amplify/home?region=us-east-1#/d1yo6c4008x99n
   - Click "Environment variables" in left sidebar
   - Verify all VITE_* variables are set

### Page Shows Blank Screen

**Symptom:** White screen or "Loading..." that never completes

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify the build completed successfully in Amplify Console
3. Check that all dependencies are installed (look at build logs)
4. Try hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

### API Returns 403 Forbidden

**Symptom:** API calls fail with 403 errors

**Solutions:**
1. This is expected in Phase 2 - API endpoints are not fully implemented
2. Verify you're logged in and have a valid JWT token
3. Check browser console for authentication errors

---

## Creating Test Users (If Needed)

If test users don't exist or you need to reset passwords:

### Create Admin User

```bash
AWS_PROFILE=kiro-ctcm-dev-admin aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_zqM1VNIn3 \
  --username admin@ctcm.com \
  --user-attributes Name=email,Value=admin@ctcm.com Name=email_verified,Value=true \
  --temporary-password TempPass123! \
  --message-action SUPPRESS \
  --region us-east-1

# Set permanent password
AWS_PROFILE=kiro-ctcm-dev-admin aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_zqM1VNIn3 \
  --username admin@ctcm.com \
  --password AdminPass123! \
  --permanent \
  --region us-east-1

# Add to admin group
AWS_PROFILE=kiro-ctcm-dev-admin aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-1_zqM1VNIn3 \
  --username admin@ctcm.com \
  --group-name admin \
  --region us-east-1
```

### Create Customer User

```bash
AWS_PROFILE=kiro-ctcm-dev-admin aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_zqM1VNIn3 \
  --username test@ctcm.com \
  --user-attributes Name=email,Value=test@ctcm.com Name=email_verified,Value=true \
  --temporary-password TempPass123! \
  --message-action SUPPRESS \
  --region us-east-1

# Set permanent password
AWS_PROFILE=kiro-ctcm-dev-admin aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_zqM1VNIn3 \
  --username test@ctcm.com \
  --password TestPass123! \
  --permanent \
  --region us-east-1

# Add to customer group
AWS_PROFILE=kiro-ctcm-dev-admin aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-1_zqM1VNIn3 \
  --username test@ctcm.com \
  --group-name customer \
  --region us-east-1
```

---

## Monitoring

### View Amplify Build Logs

1. Go to: https://console.aws.amazon.com/amplify/home?region=us-east-1#/d1yo6c4008x99n
2. Click on the branch (main or develop)
3. Click on the latest deployment
4. View build logs for each phase (Provision, Build, Deploy, Verify)

### View CloudWatch Logs

```bash
# List log groups
AWS_PROFILE=kiro-ctcm-dev-admin aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/ctcm \
  --region us-east-1

# Tail logs (when Lambda functions are implemented)
AWS_PROFILE=kiro-ctcm-dev-admin aws logs tail /aws/lambda/ctcm-api-function \
  --follow \
  --region us-east-1
```

### Check Stack Status

```bash
AWS_PROFILE=kiro-ctcm-dev-admin aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --region us-east-1 \
  --query 'StackSummaries[?starts_with(StackName, `CtcmDev`)].{Name:StackName,Status:StackStatus}' \
  --output table
```

---

## Phase 3 Testing (Coming Soon)

Once Phase 3 API implementation is complete, you'll be able to test:

- Creating real customers and shipments
- Uploading documents with OCR processing
- Real-time shipment status updates
- Invoice generation
- Email notifications
- Search functionality
- Multi-tenant data isolation

Stay tuned!
