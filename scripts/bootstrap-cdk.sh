#!/bin/bash

# Bootstrap AWS CDK in CTCM Dev Account
# This script bootstraps CDK in account 404875533723 (CTCM Dev)

set -e

ACCOUNT_ID="404875533723"
REGION="us-east-1"
MANAGEMENT_ACCOUNT="438465156498"
PROFILE="${AWS_PROFILE:-ctcm-dev}"

echo "🚀 Bootstrapping AWS CDK for CTCM Dev Account"
echo ""
echo "Account ID: $ACCOUNT_ID"
echo "Region: $REGION"
echo "Profile: $PROFILE"
echo ""

# Check if profile exists
if ! aws configure list-profiles | grep -q "^$PROFILE$"; then
    echo "❌ Profile '$PROFILE' not found."
    echo ""
    echo "Please run: ./scripts/setup-ctcm-dev-profile.sh"
    echo "Or set AWS_PROFILE to an existing profile with access to account $ACCOUNT_ID"
    exit 1
fi

# Verify credentials
echo "🔍 Verifying AWS credentials..."
CALLER_IDENTITY=$(AWS_PROFILE=$PROFILE aws sts get-caller-identity 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Failed to get caller identity. Please login:"
    echo "   aws sso login --profile $PROFILE"
    exit 1
fi

CURRENT_ACCOUNT=$(echo "$CALLER_IDENTITY" | grep -o '"Account": "[0-9]*"' | grep -o '[0-9]*')

if [ "$CURRENT_ACCOUNT" != "$ACCOUNT_ID" ]; then
    echo "❌ Wrong account! Currently authenticated to: $CURRENT_ACCOUNT"
    echo "   Expected: $ACCOUNT_ID"
    echo ""
    echo "Please ensure your profile is configured for the CTCM Dev account."
    exit 1
fi

echo "✅ Authenticated to account: $CURRENT_ACCOUNT"
echo ""

# Check if already bootstrapped
echo "🔍 Checking if CDK is already bootstrapped..."
STACK_STATUS=$(AWS_PROFILE=$PROFILE aws cloudformation describe-stacks \
    --stack-name CDKToolkit \
    --region $REGION \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$STACK_STATUS" != "NOT_FOUND" ]; then
    echo "⚠️  CDK is already bootstrapped (Stack status: $STACK_STATUS)"
    read -p "Do you want to re-bootstrap? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping bootstrap."
        exit 0
    fi
fi

# Bootstrap CDK
echo ""
echo "🔧 Bootstrapping CDK..."
echo ""

AWS_PROFILE=$PROFILE cdk bootstrap aws://$ACCOUNT_ID/$REGION \
    --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
    --trust $MANAGEMENT_ACCOUNT \
    --trust-for-lookup $MANAGEMENT_ACCOUNT \
    --toolkit-stack-name CDKToolkit

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ CDK bootstrap completed successfully!"
    echo ""
    echo "📦 Resources created:"
    echo "  - S3 Bucket: cdk-hnb659fds-assets-$ACCOUNT_ID-$REGION"
    echo "  - ECR Repository: cdk-hnb659fds-container-assets-$ACCOUNT_ID-$REGION"
    echo "  - IAM Roles: CDK execution and deployment roles"
    echo ""
    echo "🧪 Testing CDK synth..."
    cd infra
    AWS_PROFILE=$PROFILE npm run synth > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ CDK synth successful!"
        echo ""
        echo "📝 Next steps:"
        echo "  1. Review what will be deployed:"
        echo "     cd infra && AWS_PROFILE=$PROFILE npm run diff"
        echo ""
        echo "  2. Deploy all stacks:"
        echo "     cd infra && AWS_PROFILE=$PROFILE npm run deploy"
        echo ""
        echo "  3. Deploy specific stack:"
        echo "     cd infra && AWS_PROFILE=$PROFILE cdk deploy CtcmDevNetworkStack"
    else
        echo "⚠️  CDK synth failed. Check the errors above."
    fi
else
    echo ""
    echo "❌ CDK bootstrap failed. Check the errors above."
    exit 1
fi
