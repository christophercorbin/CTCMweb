#!/bin/bash

# Configure Amplify environment variables
# This script sets up environment variables for the Amplify app

set -e

APP_ID="d1yo6c4008x99n"
BRANCH_NAME="main"
REGION="us-east-1"

echo "Configuring Amplify environment variables..."

# Set environment variables
aws amplify update-branch \
  --app-id "$APP_ID" \
  --branch-name "$BRANCH_NAME" \
  --region "$REGION" \
  --environment-variables \
    VITE_API_URL="https://1y447zjdhj.execute-api.us-east-1.amazonaws.com/dev" \
    VITE_AWS_REGION="us-east-1" \
    VITE_COGNITO_USER_POOL_ID="us-east-1_n8pWlYcSS" \
    VITE_COGNITO_CLIENT_ID="7fotk98fhtt003lf9d1728d49g" \
    VITE_CLOUDFRONT_DISTRIBUTION_ID="E34Q2E7TZIYZAB" \
    VITE_FRONTEND_BUCKET="ctcm-dev-frontend-404875533723" \
    VITE_DOCUMENT_BUCKET="ctcm-dev-documents-404875533723"

echo "✅ Environment variables configured successfully!"
echo "Triggering a new build..."

# Trigger a new build
aws amplify start-job \
  --app-id "$APP_ID" \
  --branch-name "$BRANCH_NAME" \
  --job-type RELEASE \
  --region "$REGION"

echo "✅ Build triggered! Check Amplify console for progress."
