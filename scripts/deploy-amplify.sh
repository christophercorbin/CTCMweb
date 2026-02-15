#!/bin/bash

# Deploy Amplify Frontend Stack
# This script deploys the new Amplify Hosting stack to replace S3 + CloudFront

set -e

echo "🚀 Deploying Amplify Frontend Stack..."
echo ""

# Set AWS profile
export AWS_PROFILE=kiro-ctcm-dev-admin

# Navigate to infra directory
cd "$(dirname "$0")/../infra"

# Build TypeScript
echo "📦 Building CDK app..."
npm run build

# Deploy only the Amplify stack
echo ""
echo "🎯 Deploying CtcmDevAmplifyFrontendStack..."
cdk deploy CtcmDevAmplifyFrontendStack --require-approval never

echo ""
echo "✅ Amplify Frontend Stack deployed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Go to AWS Amplify Console"
echo "2. Connect your GitHub repository (christophercorbin/CTCMweb)"
echo "3. Grant Amplify access to your GitHub account"
echo "4. Amplify will automatically build and deploy on push to main branch"
echo ""
echo "🔗 Amplify Console: https://console.aws.amazon.com/amplify/home?region=us-east-1"
