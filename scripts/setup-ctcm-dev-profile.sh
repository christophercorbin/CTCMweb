#!/bin/bash

# Setup AWS SSO Profile for CTCM Dev Account
# This script helps configure AWS CLI to access the CTCM Dev account (404875533723)

set -e

echo "🔧 Setting up AWS SSO profile for CTCM Dev account..."
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   brew install awscli"
    exit 1
fi

echo "📋 Current AWS profiles:"
aws configure list-profiles
echo ""

# Check if ctcm-dev profile already exists
if aws configure list-profiles | grep -q "^ctcm-dev$"; then
    echo "⚠️  Profile 'ctcm-dev' already exists."
    read -p "Do you want to reconfigure it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping profile configuration."
        exit 0
    fi
fi

echo ""
echo "🔐 Configuring SSO profile for CTCM Dev account..."
echo ""
echo "When prompted, enter the following:"
echo "  SSO session name: ctcm-dev-session"
echo "  SSO start URL: https://d-906601aeb4.awsapps.com/start"
echo "  SSO region: us-east-1"
echo "  SSO registration scopes: sso:account:access"
echo "  Then select:"
echo "    - Account: CTCM Dev (404875533723)"
echo "    - Role: AdministratorAccess or PowerUserAccess"
echo "  CLI default region: us-east-1"
echo "  CLI default output format: json"
echo "  Profile name: ctcm-dev"
echo ""
read -p "Press Enter to continue..."

# Run AWS SSO configuration
aws configure sso --profile ctcm-dev

echo ""
echo "✅ Profile configured!"
echo ""
echo "🔑 Now logging in to SSO..."
aws sso login --profile ctcm-dev

echo ""
echo "✅ SSO login successful!"
echo ""
echo "🧪 Testing credentials..."
AWS_PROFILE=ctcm-dev aws sts get-caller-identity

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Bootstrap CDK:"
echo "     AWS_PROFILE=ctcm-dev cdk bootstrap aws://404875533723/us-east-1 \\"
echo "       --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \\"
echo "       --trust 438465156498 \\"
echo "       --trust-for-lookup 438465156498"
echo ""
echo "  2. Test CDK synth:"
echo "     cd infra"
echo "     AWS_PROFILE=ctcm-dev npm run synth"
echo ""
echo "  3. Deploy stacks:"
echo "     AWS_PROFILE=ctcm-dev npm run deploy"
echo ""
