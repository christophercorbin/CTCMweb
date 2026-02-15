#!/bin/bash

# Get CloudFormation Stack Outputs
# This script retrieves outputs from all deployed CTCM stacks

set -e

PROFILE="${AWS_PROFILE:-ctcm-dev}"
REGION="us-east-1"

echo "📊 CTCM Stack Outputs"
echo "===================="
echo ""
echo "Profile: $PROFILE"
echo "Region: $REGION"
echo ""

# Function to get stack outputs
get_stack_outputs() {
    local stack_name=$1
    echo "📦 $stack_name"
    echo "-------------------"
    
    # Check if stack exists
    if ! AWS_PROFILE=$PROFILE aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region $REGION &>/dev/null; then
        echo "❌ Stack not found"
        echo ""
        return
    fi
    
    # Get stack status
    STATUS=$(AWS_PROFILE=$PROFILE aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region $REGION \
        --query 'Stacks[0].StackStatus' \
        --output text)
    echo "Status: $STATUS"
    
    # Get outputs
    OUTPUTS=$(AWS_PROFILE=$PROFILE aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region $REGION \
        --query 'Stacks[0].Outputs' \
        --output table 2>/dev/null)
    
    if [ -n "$OUTPUTS" ]; then
        echo "$OUTPUTS"
    else
        echo "No outputs available"
    fi
    echo ""
}

# List all CTCM stacks
echo "🔍 Finding CTCM stacks..."
STACKS=$(AWS_PROFILE=$PROFILE aws cloudformation list-stacks \
    --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
    --region $REGION \
    --query 'StackSummaries[?starts_with(StackName, `CtcmDev`)].StackName' \
    --output text)

if [ -z "$STACKS" ]; then
    echo "❌ No CTCM stacks found"
    echo ""
    echo "Expected stacks:"
    echo "  - CtcmDevNetworkStack"
    echo "  - CtcmDevAuthStack"
    echo "  - CtcmDevDataStack"
    echo "  - CtcmDevApiStack"
    echo "  - CtcmDevFrontendStack"
    echo "  - CtcmDevOcrStack"
    echo "  - CtcmDevObservabilityStack"
    exit 1
fi

echo "✅ Found stacks: $STACKS"
echo ""
echo "===================="
echo ""

# Get outputs for each stack
for stack in $STACKS; do
    get_stack_outputs "$stack"
done

# Save outputs to file
OUTPUT_FILE="deployment-outputs.json"
echo "💾 Saving outputs to $OUTPUT_FILE..."

AWS_PROFILE=$PROFILE aws cloudformation describe-stacks \
    --region $REGION \
    --query 'Stacks[?starts_with(StackName, `CtcmDev`)]' \
    > "$OUTPUT_FILE"

echo "✅ Outputs saved!"
echo ""

# Extract key values
echo "🔑 Key Configuration Values"
echo "===================="

# Network Stack
VPC_ID=$(AWS_PROFILE=$PROFILE aws cloudformation describe-stacks \
    --stack-name CtcmDevNetworkStack \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`VpcId`].OutputValue' \
    --output text 2>/dev/null || echo "N/A")
echo "VPC ID: $VPC_ID"

# Auth Stack
USER_POOL_ID=$(AWS_PROFILE=$PROFILE aws cloudformation describe-stacks \
    --stack-name CtcmDevAuthStack \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text 2>/dev/null || echo "N/A")
echo "Cognito User Pool ID: $USER_POOL_ID"

USER_POOL_CLIENT_ID=$(AWS_PROFILE=$PROFILE aws cloudformation describe-stacks \
    --stack-name CtcmDevAuthStack \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
    --output text 2>/dev/null || echo "N/A")
echo "Cognito Client ID: $USER_POOL_CLIENT_ID"

# Data Stack
DB_ENDPOINT=$(AWS_PROFILE=$PROFILE aws cloudformation describe-stacks \
    --stack-name CtcmDevDataStack \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text 2>/dev/null || echo "N/A")
echo "Database Endpoint: $DB_ENDPOINT"

DOCUMENT_BUCKET=$(AWS_PROFILE=$PROFILE aws cloudformation describe-stacks \
    --stack-name CtcmDevDataStack \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`DocumentBucketName`].OutputValue' \
    --output text 2>/dev/null || echo "N/A")
echo "Document Bucket: $DOCUMENT_BUCKET"

# API Stack
API_URL=$(AWS_PROFILE=$PROFILE aws cloudformation describe-stacks \
    --stack-name CtcmDevApiStack \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text 2>/dev/null || echo "N/A")
echo "API URL: $API_URL"

# Frontend Stack
FRONTEND_BUCKET=$(AWS_PROFILE=$PROFILE aws cloudformation describe-stacks \
    --stack-name CtcmDevFrontendStack \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
    --output text 2>/dev/null || echo "N/A")
echo "Frontend Bucket: $FRONTEND_BUCKET"

DISTRIBUTION_ID=$(AWS_PROFILE=$PROFILE aws cloudformation describe-stacks \
    --stack-name CtcmDevFrontendStack \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text 2>/dev/null || echo "N/A")
echo "CloudFront Distribution: $DISTRIBUTION_ID"

echo ""
echo "===================="
echo ""
echo "📝 Next Steps:"
echo "  1. Create .env file for frontend:"
echo "     cp apps/web/.env.example apps/web/.env.local"
echo "     # Update with values above"
echo ""
echo "  2. Build and deploy frontend:"
echo "     npm run build:web"
echo "     AWS_PROFILE=$PROFILE aws s3 sync apps/web/dist s3://$FRONTEND_BUCKET --delete"
echo ""
echo "  3. Invalidate CloudFront cache:"
echo "     AWS_PROFILE=$PROFILE aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths '/*'"
echo ""
