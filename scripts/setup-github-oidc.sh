#!/bin/bash

# Setup GitHub Actions OIDC for CTCM Dev Account
# This creates the OIDC provider and IAM role for GitHub Actions deployments

set -e

ACCOUNT_ID="404875533723"
REGION="us-east-1"
GITHUB_REPO="christophercorbin/CTCMweb"
ROLE_NAME="GitHubActionsDeployRole"

echo "🔧 Setting up GitHub Actions OIDC for CTCM"
echo "==========================================="
echo ""
echo "Account: $ACCOUNT_ID"
echo "Region: $REGION"
echo "Repository: $GITHUB_REPO"
echo "Role: $ROLE_NAME"
echo ""

# Step 1: Create OIDC Provider
echo "Step 1: Create OIDC Provider"
echo "-----------------------------"
echo ""

OIDC_PROVIDER_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"

# Check if provider already exists
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_PROVIDER_ARN" &>/dev/null; then
    echo "✅ OIDC provider already exists"
else
    echo "📝 Creating OIDC provider..."
    
    # Get GitHub's OIDC thumbprint
    THUMBPRINT="6938fd4d98bab03faadb97b34396831e3780aea1"
    
    aws iam create-open-id-connect-provider \
        --url "https://token.actions.githubusercontent.com" \
        --client-id-list "sts.amazonaws.com" \
        --thumbprint-list "$THUMBPRINT" \
        --tags Key=ManagedBy,Value=Script Key=Purpose,Value=GitHubActions
    
    echo "✅ OIDC provider created"
fi

echo ""

# Step 2: Create IAM Role
echo "Step 2: Create IAM Role"
echo "-----------------------"
echo ""

# Trust policy allowing GitHub Actions from specific repo and branches
cat > /tmp/github-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "${OIDC_PROVIDER_ARN}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:${GITHUB_REPO}:ref:refs/heads/main",
            "repo:${GITHUB_REPO}:ref:refs/heads/develop"
          ]
        }
      }
    }
  ]
}
EOF

echo "📝 Creating IAM role..."

# Create role
if aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
    echo "  Role already exists, updating trust policy..."
    aws iam update-assume-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-document file:///tmp/github-trust-policy.json
else
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document file:///tmp/github-trust-policy.json \
        --description "Role for GitHub Actions to deploy CTCM infrastructure" \
        --tags Key=ManagedBy,Value=Script Key=Purpose,Value=GitHubActions Key=Repository,Value="$GITHUB_REPO"
fi

echo "✅ IAM role created/updated"
echo ""

# Step 3: Attach Policies
echo "Step 3: Attach Policies"
echo "-----------------------"
echo ""

echo "📝 Attaching AdministratorAccess policy..."
aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess" \
    2>/dev/null || echo "  Policy already attached"

echo "✅ Policies attached"
echo ""

# Step 4: Verify Setup
echo "Step 4: Verify Setup"
echo "--------------------"
echo ""

echo "🧪 Verifying OIDC provider..."
aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_PROVIDER_ARN" --query 'Url' --output text
echo "✅ OIDC provider verified"
echo ""

echo "🧪 Verifying IAM role..."
ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
echo "✅ Role ARN: $ROLE_ARN"
echo ""

echo "🧪 Verifying trust policy..."
aws iam get-role --role-name "$ROLE_NAME" --query 'Role.AssumeRolePolicyDocument' --output json
echo ""

# Clean up
rm -f /tmp/github-trust-policy.json

echo "✅ Setup Complete!"
echo "=================="
echo ""
echo "📋 Summary:"
echo "  OIDC Provider: token.actions.githubusercontent.com"
echo "  Role Name: $ROLE_NAME"
echo "  Role ARN: $ROLE_ARN"
echo "  Allowed Branches: main, develop"
echo "  Repository: $GITHUB_REPO"
echo ""
echo "🚀 GitHub Actions can now deploy to this account!"
echo ""
echo "📝 Next Steps:"
echo "  1. Verify workflows use correct role ARN"
echo "  2. Push to develop or main branch to trigger deployment"
echo "  3. Monitor deployment in GitHub Actions tab"
echo ""
echo "⚠️  Security Note:"
echo "  This role has AdministratorAccess for initial setup."
echo "  Consider restricting permissions after testing."
echo ""

