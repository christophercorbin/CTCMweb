# CDK Bootstrap Guide for CTCM Dev Account

## Current Status
- You're authenticated to: Management Account (438465156498)
- Target account: CTCM Dev Account (404875533723)
- Region: us-east-1

## Option 1: Use AWS IAM Identity Center (SSO) - RECOMMENDED

### Step 1: Configure AWS SSO Profile

```bash
# Configure SSO profile for CTCM Dev account
aws configure sso

# When prompted, enter:
# SSO session name: ctcm-dev
# SSO start URL: https://d-906601aeb4.awsapps.com/start
# SSO region: us-east-1
# SSO registration scopes: sso:account:access
# Select the CTCM Dev account (404875533723)
# Select the role: AdministratorAccess or PowerUserAccess
# CLI default region: us-east-1
# CLI default output format: json
# Profile name: ctcm-dev
```

### Step 2: Login to SSO

```bash
aws sso login --profile ctcm-dev
```

This will open your browser for authentication.

### Step 3: Bootstrap CDK

```bash
# Bootstrap CDK in CTCM Dev account
AWS_PROFILE=ctcm-dev cdk bootstrap aws://404875533723/us-east-1 \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
  --trust 438465156498 \
  --trust-for-lookup 438465156498

# Verify bootstrap
AWS_PROFILE=ctcm-dev aws cloudformation describe-stacks \
  --stack-name CDKToolkit \
  --region us-east-1
```

### Step 4: Test CDK Synth

```bash
cd infra
AWS_PROFILE=ctcm-dev npm run synth
```

---

## Option 2: Assume Role from Management Account

If you have a cross-account role set up:

### Step 1: Check if Cross-Account Role Exists

```bash
# Check if the role exists in CTCM Dev account
aws iam get-role \
  --role-name OrganizationAccountAccessRole \
  --profile ctcm-dev 2>/dev/null || echo "Role not found"
```

### Step 2: Configure Assume Role Profile

Add to `~/.aws/config`:

```ini
[profile ctcm-dev-assume]
role_arn = arn:aws:iam::404875533723:role/OrganizationAccountAccessRole
source_profile = default
region = us-east-1
```

### Step 3: Bootstrap with Assumed Role

```bash
AWS_PROFILE=ctcm-dev-assume cdk bootstrap aws://404875533723/us-east-1 \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
  --trust 438465156498 \
  --trust-for-lookup 438465156498
```

---

## Option 3: Use Existing GitHubActionsDeployRole (For CI/CD Only)

The GitHubActionsDeployRole (arn:aws:iam::404875533723:role/GitHubActionsDeployRole) is already configured for GitHub Actions. This role can bootstrap CDK, but it's designed for CI/CD, not local development.

If you want to use this role locally (not recommended for regular use):

```bash
# Assume the GitHub Actions role
aws sts assume-role \
  --role-arn arn:aws:iam::404875533723:role/GitHubActionsDeployRole \
  --role-session-name local-bootstrap \
  --profile default

# Extract credentials from the output and set them as environment variables
export AWS_ACCESS_KEY_ID=<AccessKeyId>
export AWS_SECRET_ACCESS_KEY=<SecretAccessKey>
export AWS_SESSION_TOKEN=<SessionToken>

# Bootstrap CDK
cdk bootstrap aws://404875533723/us-east-1 \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
```

---

## Verification Steps

After bootstrapping, verify the setup:

```bash
# 1. Check CDKToolkit stack exists
AWS_PROFILE=ctcm-dev aws cloudformation describe-stacks \
  --stack-name CDKToolkit \
  --region us-east-1

# 2. List S3 bucket created by CDK
AWS_PROFILE=ctcm-dev aws s3 ls | grep cdk

# 3. Test CDK synth
cd infra
AWS_PROFILE=ctcm-dev npm run synth

# 4. Test CDK diff (should show resources to be created)
AWS_PROFILE=ctcm-dev npm run diff
```

---

## Troubleshooting

### Error: "User is not authorized to perform: sts:AssumeRole"

This means your current user (ChrisTest) doesn't have permission to assume roles in the target account.

**Solution**: Use IAM Identity Center (Option 1) instead.

### Error: "CDKToolkit stack already exists"

The account is already bootstrapped. You can proceed with deployment.

### Error: "Access Denied" during bootstrap

Check that:
1. You're using the correct profile
2. The profile has AdministratorAccess or sufficient permissions
3. The account ID is correct (404875533723)

---

## Next Steps After Bootstrap

Once bootstrapped, you can:

1. **Deploy all stacks**:
   ```bash
   cd infra
   AWS_PROFILE=ctcm-dev npm run deploy
   ```

2. **Deploy specific stack**:
   ```bash
   AWS_PROFILE=ctcm-dev cdk deploy CtcmDevNetworkStack
   ```

3. **View what will be deployed**:
   ```bash
   AWS_PROFILE=ctcm-dev npm run diff
   ```

---

## Important Notes

- **Trust Relationships**: The `--trust` flag allows the management account to look up resources in the CTCM Dev account during synthesis
- **Execution Policies**: AdministratorAccess is used for development; use more restrictive policies for production
- **Cost**: CDK bootstrap creates an S3 bucket and ECR repository (minimal cost, ~$0.01/month)
- **One-Time Operation**: Bootstrap only needs to be done once per account/region combination

---

## For GitHub Actions (Already Configured)

The GitHub Actions workflows will use the GitHubActionsDeployRole automatically via OIDC. No additional configuration needed for CI/CD.

The workflows already include:
```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::404875533723:role/GitHubActionsDeployRole
    role-session-name: GitHubActions-Deploy-Dev
    aws-region: us-east-1
```
