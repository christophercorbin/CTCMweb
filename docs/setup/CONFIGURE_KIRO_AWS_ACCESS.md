# Configure Kiro AWS Access

This guide explains how to give Kiro (AI assistant) the ability to read from all AWS accounts in your organization.

## Current Situation

- Kiro's AWS MCP tools currently use your **default AWS CLI credentials**
- You're authenticated to: **Management Account (438465156498)** as user `ChrisTest`
- Kiro needs access to: **CTCM Dev Account (404875533723)** to read stack outputs and resources

## Solution Options

### Option 1: Set Default AWS Profile (Quickest)

The simplest way is to set your AWS profile environment variable before starting Kiro:

```bash
# Set the profile for your current session
export AWS_PROFILE=ctcm-dev

# Verify
aws sts get-caller-identity

# Now restart Kiro or reload the MCP server
```

**Pros**: Immediate, no configuration changes needed
**Cons**: Only works for current session, need to set each time

---

### Option 2: Change Default AWS CLI Profile (Persistent)

Make the CTCM Dev profile your default:

```bash
# Edit ~/.aws/config and add/modify:
[default]
sso_session = ctcm-dev-session
sso_account_id = 404875533723
sso_role_name = AdministratorAccess
region = us-east-1
output = json

# Or copy your ctcm-dev profile to default
[profile ctcm-dev]
# ... existing config ...

# becomes:
[default]
# ... same config ...
```

**Pros**: Persistent, works automatically
**Cons**: Changes your default AWS CLI behavior

---

### Option 3: Create Cross-Account Assume Role (Most Flexible)

This allows Kiro to access multiple accounts by assuming roles:

#### Step 1: Create Read-Only Role in CTCM Dev Account

```bash
# Run the helper script
./scripts/create-kiro-read-role.sh
```

Or manually:

```bash
# Switch to CTCM Dev account
export AWS_PROFILE=ctcm-dev

# Create trust policy
cat > trust-policy.json <<EOF
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

# Create the role
aws iam create-role \
  --role-name KiroReadOnlyRole \
  --assume-role-policy-document file://trust-policy.json \
  --description "Read-only role for Kiro AI assistant"

# Attach read-only policies
aws iam attach-role-policy \
  --role-name KiroReadOnlyRole \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess

aws iam attach-role-policy \
  --role-name KiroReadOnlyRole \
  --policy-arn arn:aws:iam::aws:policy/CloudFormationReadOnlyAccess
```

#### Step 2: Configure AWS CLI Profile

Add to `~/.aws/config`:

```ini
[profile kiro-ctcm-dev]
role_arn = arn:aws:iam::404875533723:role/KiroReadOnlyRole
source_profile = default
region = us-east-1
```

#### Step 3: Set as Default for Kiro

```bash
export AWS_PROFILE=kiro-ctcm-dev
```

**Pros**: Most secure (read-only), works across accounts, doesn't change default behavior
**Cons**: Requires role creation and configuration

---

### Option 4: Configure Kiro's MCP Server Directly

If you want to configure the AWS MCP server specifically for Kiro:

#### Edit Kiro's MCP Configuration

Location: `~/.kiro/settings/mcp.json` or `.kiro/settings/mcp.json`

```json
{
  "mcpServers": {
    "aws-knowledge": {
      "command": "uvx",
      "args": ["awslabs.aws-documentation-mcp-server@latest"],
      "env": {
        "AWS_PROFILE": "ctcm-dev",
        "AWS_REGION": "us-east-1"
      }
    },
    "aws-organizations": {
      "command": "uvx", 
      "args": ["awslabs.aws-organizations-mcp-server@latest"],
      "env": {
        "AWS_PROFILE": "ctcm-dev",
        "AWS_REGION": "us-east-1"
      }
    }
  }
}
```

Then restart Kiro or reload the MCP servers.

**Pros**: Kiro-specific, doesn't affect your CLI usage
**Cons**: Need to restart Kiro, need to find/edit MCP config

---

## Recommended Approach

For your use case, I recommend **Option 1** (set AWS_PROFILE) for immediate access:

```bash
# In your terminal before using Kiro
export AWS_PROFILE=ctcm-dev

# Verify
aws sts get-caller-identity
# Should show account: 404875533723

# Now Kiro's AWS MCP tools will use this profile
```

Then later, you can set up **Option 3** (cross-account role) for a more permanent solution.

---

## Verification

After configuring, test that Kiro can access the CTCM Dev account:

```bash
# Test with AWS CLI
aws sts get-caller-identity

# Should show:
# Account: 404875533723
# Arn: arn:aws:sts::404875533723:assumed-role/...
```

Then ask Kiro to run an AWS command:
> "List my CloudFormation stacks"

Kiro should now be able to see stacks in the CTCM Dev account.

---

## Multi-Account Access

If you want Kiro to access **multiple accounts** (Management + CTCM Dev + others):

### Create Assume Role Profiles for Each Account

In `~/.aws/config`:

```ini
# Management account (current default)
[default]
region = us-east-1

# CTCM Dev account
[profile ctcm-dev]
sso_session = ctcm-dev-session
sso_account_id = 404875533723
sso_role_name = AdministratorAccess
region = us-east-1

# ePortfolio Dev account
[profile eportfolio-dev]
sso_session = eportfolio-session
sso_account_id = 934862608865
sso_role_name = AdministratorAccess
region = us-east-1

# ... etc for other accounts
```

Then switch profiles as needed:
```bash
export AWS_PROFILE=ctcm-dev        # For CTCM work
export AWS_PROFILE=eportfolio-dev  # For ePortfolio work
export AWS_PROFILE=default         # For management account
```

---

## Troubleshooting

### "AccessDenied" or "User is not authorized"

Your current credentials don't have access to the target account.

**Solution**: Use SSO profile (`ctcm-dev`) or create assume role.

### "ExpiredToken" or "Token has expired"

Your SSO session expired.

**Solution**: 
```bash
aws sso login --profile ctcm-dev
```

### Kiro still uses wrong account

The AWS_PROFILE environment variable isn't set for Kiro's process.

**Solution**: 
1. Set `export AWS_PROFILE=ctcm-dev` in your shell
2. Restart Kiro
3. Or configure MCP server directly (Option 4)

### How to check which account Kiro is using?

Ask Kiro: "What AWS account am I authenticated to?"

Or run:
```bash
aws sts get-caller-identity
```

---

## Security Best Practices

1. **Use SSO profiles** instead of long-term access keys
2. **Use read-only roles** for AI assistants when possible
3. **Use external IDs** for assume role trust policies
4. **Rotate credentials regularly** (SSO handles this automatically)
5. **Use least privilege** - only grant permissions needed

---

## Quick Reference

```bash
# Check current identity
aws sts get-caller-identity

# List available profiles
aws configure list-profiles

# Login to SSO
aws sso login --profile ctcm-dev

# Set profile for session
export AWS_PROFILE=ctcm-dev

# Set profile permanently (add to ~/.zshrc or ~/.bashrc)
echo 'export AWS_PROFILE=ctcm-dev' >> ~/.zshrc
```
