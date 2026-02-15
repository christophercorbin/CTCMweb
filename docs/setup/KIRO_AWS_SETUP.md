# Kiro AWS Multi-Account Setup

This guide sets up Kiro with:
- ✅ **Admin access** to CTCM Dev account (404875533723)
- ✅ **Read-only access** to all other accounts

## Quick Setup (Automated)

```bash
# Run the setup script
./scripts/setup-kiro-multi-account-access.sh

# Apply changes
source ~/.zshrc  # or ~/.bashrc

# Verify
aws sts get-caller-identity
# Should show CTCM Dev account with assumed role
```

## Manual Setup

If you prefer to set it up manually:

### Step 1: Create Admin Role in CTCM Dev Account

```bash
# Switch to CTCM Dev account
export AWS_PROFILE=ctcm-dev

# Create trust policy
cat > trust-policy-admin.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::438465156498:user/ChrisTest"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the admin role
aws iam create-role \
  --role-name KiroAdminRole \
  --assume-role-policy-document file://trust-policy-admin.json \
  --description "Admin role for Kiro AI assistant"

# Attach admin policy
aws iam attach-role-policy \
  --role-name KiroAdminRole \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Get the role ARN
aws iam get-role --role-name KiroAdminRole --query 'Role.Arn'
```

### Step 2: Create Read-Only Roles in Other Accounts (Optional)

For each account you want Kiro to read from:

```bash
# Switch to target account
export AWS_PROFILE=<account-profile>

# Create trust policy (same as above)
cat > trust-policy-readonly.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::438465156498:user/ChrisTest"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create read-only role
aws iam create-role \
  --role-name KiroReadOnlyRole \
  --assume-role-policy-document file://trust-policy-readonly.json \
  --description "Read-only role for Kiro AI assistant"

# Attach read-only policies
aws iam attach-role-policy \
  --role-name KiroReadOnlyRole \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess

aws iam attach-role-policy \
  --role-name KiroReadOnlyRole \
  --policy-arn arn:aws:iam::aws:policy/CloudFormationReadOnlyAccess
```

### Step 3: Configure AWS CLI Profiles

Add to `~/.aws/config`:

```ini
# Kiro - CTCM Dev Admin (default for Kiro)
[profile kiro-ctcm-dev-admin]
role_arn = arn:aws:iam::404875533723:role/KiroAdminRole
source_profile = default
region = us-east-1
output = json

# Kiro - CTCM Dev Read-Only (for safety)
[profile kiro-ctcm-dev-ro]
role_arn = arn:aws:iam::404875533723:role/KiroReadOnlyRole
source_profile = default
region = us-east-1
output = json

# Kiro - Management Account Read-Only
[profile kiro-management-ro]
role_arn = arn:aws:iam::438465156498:role/KiroReadOnlyRole
source_profile = default
region = us-east-1
output = json

# Kiro - ePortfolio Dev Read-Only
[profile kiro-eportfolio-dev-ro]
role_arn = arn:aws:iam::934862608865:role/KiroReadOnlyRole
source_profile = default
region = us-east-1
output = json

# Kiro - ePortfolio Prod Read-Only
[profile kiro-eportfolio-prod-ro]
role_arn = arn:aws:iam::590716168923:role/KiroReadOnlyRole
source_profile = default
region = us-east-1
output = json

# Kiro - Sandbox Read-Only
[profile kiro-sandbox-ro]
role_arn = arn:aws:iam::385467776718:role/KiroReadOnlyRole
source_profile = default
region = us-east-1
output = json
```

### Step 4: Set Default Profile for Kiro

Add to `~/.zshrc` or `~/.bashrc`:

```bash
# Set default AWS profile for Kiro
export AWS_PROFILE=kiro-ctcm-dev-admin
```

Apply changes:
```bash
source ~/.zshrc  # or ~/.bashrc
```

## Verification

Test each profile:

```bash
# Test CTCM Dev admin access
AWS_PROFILE=kiro-ctcm-dev-admin aws sts get-caller-identity
# Should show: Account 404875533723, Role: KiroAdminRole

# Test CTCM Dev read-only
AWS_PROFILE=kiro-ctcm-dev-ro aws sts get-caller-identity

# Test Management read-only
AWS_PROFILE=kiro-management-ro aws sts get-caller-identity
# Should show: Account 438465156498, Role: KiroReadOnlyRole

# Test default (should be CTCM Dev admin)
aws sts get-caller-identity
```

## Usage

### For Kiro (Default)

Kiro will automatically use `kiro-ctcm-dev-admin` profile, giving it:
- ✅ Full admin access to CTCM Dev account
- ✅ Can deploy stacks, create resources, modify infrastructure
- ✅ Can read CloudFormation outputs, S3 buckets, etc.

### Switching Profiles

If you need Kiro to access a different account:

```bash
# Switch to read-only Management account
export AWS_PROFILE=kiro-management-ro

# Switch back to CTCM Dev admin
export AWS_PROFILE=kiro-ctcm-dev-admin

# Use read-only for CTCM Dev (safer for queries)
export AWS_PROFILE=kiro-ctcm-dev-ro
```

### For Your Own CLI Usage

Your existing profiles (`ctcm-dev`, `default`, etc.) remain unchanged. You can still use them:

```bash
# Use your SSO profile
export AWS_PROFILE=ctcm-dev

# Use default
export AWS_PROFILE=default
```

## Profile Summary

| Profile | Account | Access Level | Use Case |
|---------|---------|--------------|----------|
| `kiro-ctcm-dev-admin` | CTCM Dev | Admin | **Default for Kiro** - Deploy, modify resources |
| `kiro-ctcm-dev-ro` | CTCM Dev | Read-only | Safe queries, no modifications |
| `kiro-management-ro` | Management | Read-only | View org structure, billing |
| `kiro-eportfolio-dev-ro` | ePortfolio Dev | Read-only | View ePortfolio resources |
| `kiro-eportfolio-prod-ro` | ePortfolio Prod | Read-only | View production resources |
| `kiro-sandbox-ro` | Sandbox | Read-only | View sandbox experiments |

## Security Notes

1. **Admin access is limited to CTCM Dev only** - Kiro cannot modify other accounts
2. **All other accounts are read-only** - Kiro can view but not change
3. **Roles use assume-role** - No long-term credentials, more secure
4. **Source profile is 'default'** - Uses your existing ChrisTest user credentials

## Troubleshooting

### "AccessDenied" when assuming role

The role doesn't exist or trust policy is incorrect.

**Solution**: Run the setup script or create roles manually (see Step 1-2 above)

### "ExpiredToken"

Your source credentials (ChrisTest user) have expired.

**Solution**: Refresh your AWS credentials for the default profile

### Kiro still uses wrong account

The AWS_PROFILE environment variable isn't set.

**Solution**: 
```bash
export AWS_PROFILE=kiro-ctcm-dev-admin
source ~/.zshrc
```

### How to verify which profile Kiro is using?

```bash
echo $AWS_PROFILE
aws sts get-caller-identity
```

## Next Steps

After setup, Kiro can:

1. ✅ List CloudFormation stacks in CTCM Dev
2. ✅ Get stack outputs (API URLs, bucket names, etc.)
3. ✅ Deploy new stacks
4. ✅ Update existing resources
5. ✅ Read from other accounts (read-only)

Try asking Kiro:
- "List my CloudFormation stacks"
- "Get the outputs from CtcmDevFrontendStack"
- "What S3 buckets exist in CTCM Dev?"
- "Show me the Cognito User Pool configuration"
