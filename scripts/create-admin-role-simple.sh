#!/bin/bash

# Simple script to create KiroAdminRole in CTCM Dev account
# Run this with: AWS_PROFILE=ctcm-dev ./scripts/create-admin-role-simple.sh

set -e

echo "🔧 Creating KiroAdminRole in CTCM Dev Account"
echo "=============================================="
echo ""

# Check we're in the right account
CURRENT_ACCOUNT=$(aws sts get-caller-identity --query 'Account' --output text)
echo "Current account: $CURRENT_ACCOUNT"

if [ "$CURRENT_ACCOUNT" != "404875533723" ]; then
    echo "❌ Wrong account! You're in account $CURRENT_ACCOUNT"
    echo "   Expected: 404875533723 (CTCM Dev)"
    echo ""
    echo "Please run with the correct profile:"
    echo "   AWS_PROFILE=ctcm-dev ./scripts/create-admin-role-simple.sh"
    exit 1
fi

echo "✅ Correct account (CTCM Dev)"
echo ""

# Create trust policy
echo "📝 Creating trust policy..."
cat > /tmp/kiro-admin-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::438465156498:user/ChrisTest"
      },
      "Action": "sts:AssumeRole",
      "Condition": {}
    }
  ]
}
EOF

echo "✅ Trust policy created"
echo ""

# Create the role
echo "👑 Creating KiroAdminRole..."
if aws iam create-role \
    --role-name KiroAdminRole \
    --assume-role-policy-document file:///tmp/kiro-admin-trust-policy.json \
    --description "Admin role for Kiro AI assistant in CTCM Dev" \
    --tags Key=ManagedBy,Value=Kiro Key=Purpose,Value=AIAdminAccess; then
    echo "✅ Role created successfully"
else
    echo "⚠️  Role may already exist, continuing..."
fi

echo ""

# Attach admin policy
echo "🔐 Attaching AdministratorAccess policy..."
if aws iam attach-role-policy \
    --role-name KiroAdminRole \
    --policy-arn arn:aws:iam::aws:policy/AdministratorAccess; then
    echo "✅ Policy attached successfully"
else
    echo "⚠️  Policy may already be attached, continuing..."
fi

echo ""

# Get role details
echo "📋 Role Details:"
ROLE_ARN=$(aws iam get-role --role-name KiroAdminRole --query 'Role.Arn' --output text)
echo "Role ARN: $ROLE_ARN"

echo ""
echo "✅ Setup Complete!"
echo "=================="
echo ""
echo "The role is now ready. You can test it with:"
echo "  AWS_PROFILE=kiro-ctcm-dev-admin aws sts get-caller-identity"
echo ""

# Clean up
rm /tmp/kiro-admin-trust-policy.json
