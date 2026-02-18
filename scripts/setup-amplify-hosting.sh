#!/bin/bash

# Setup Amplify Hosting for CTCM Application
# This script provides guidance for setting up Amplify Hosting via the AWS Console

set -e

echo "=================================================="
echo "CTCM Amplify Hosting Setup Guide"
echo "=================================================="
echo ""
echo "This script will guide you through setting up Amplify Hosting"
echo "for the CTCM application in the current repository."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}STEP 1: Open Amplify Console${NC}"
echo "1. Open your browser and navigate to:"
echo "   https://console.aws.amazon.com/amplify/home?region=us-east-1"
echo ""
echo "2. Make sure you're in the us-east-1 region"
echo "3. Make sure you're in account 404875533723 (CTCM Dev)"
echo ""
read -p "Press Enter when you're in the Amplify Console..."

echo ""
echo -e "${YELLOW}STEP 2: Create New App${NC}"
echo "1. Click 'New app' → 'Host web app'"
echo "2. Select 'GitHub' as the repository service"
echo "3. Click 'Connect branch'"
echo ""
read -p "Press Enter when you've clicked 'Connect branch'..."

echo ""
echo -e "${YELLOW}STEP 3: Authorize GitHub${NC}"
echo "1. If prompted, click 'Authorize AWS Amplify'"
echo "2. Grant access to the 'christophercorbin/CTCMweb' repository"
echo "3. You may need to enter your GitHub password"
echo ""
read -p "Press Enter when GitHub is authorized..."

echo ""
echo -e "${YELLOW}STEP 4: Select Repository and Branch${NC}"
echo "1. Repository: christophercorbin/CTCMweb"
echo "2. Branch: main (or develop for dev environment)"
echo "3. Check 'Connecting a monorepo? Pick a folder'"
echo "4. Folder: apps/web"
echo "5. Click 'Next'"
echo ""
read -p "Press Enter when you've selected the repository and branch..."

echo ""
echo -e "${YELLOW}STEP 5: Configure App Settings${NC}"
echo "1. App name: ctcm-dev"
echo "2. Environment: dev"
echo "3. The build settings should auto-detect from amplify.yml"
echo "4. Click 'Next'"
echo ""
read -p "Press Enter when you've configured the app settings..."

echo ""
echo -e "${YELLOW}STEP 6: Configure Environment Variables${NC}"
echo "Add the following environment variables:"
echo ""
echo "VITE_API_URL=<YOUR_API_GATEWAY_ENDPOINT>"
echo "VITE_COGNITO_USER_POOL_ID=us-east-1_n8pWlYcSS"
echo "VITE_COGNITO_CLIENT_ID=7fotk98fhtt003lf9d1728d49g"
echo "VITE_COGNITO_REGION=us-east-1"
echo "VITE_AWS_REGION=us-east-1"
echo ""
echo "Note: VITE_STORAGE_BUCKET will be added after Amplify Storage is deployed"
echo ""
read -p "Press Enter when you've added the environment variables..."

echo ""
echo -e "${YELLOW}STEP 7: Review and Save${NC}"
echo "1. Review all settings"
echo "2. Click 'Save and deploy'"
echo "3. Wait for the initial build to complete (5-10 minutes)"
echo ""
read -p "Press Enter when the build has started..."

echo ""
echo -e "${GREEN}✓ Amplify Hosting setup initiated!${NC}"
echo ""
echo "Next steps:"
echo "1. Monitor the build in the Amplify Console"
echo "2. Once deployed, test the application at the Amplify URL"
echo "3. Configure custom domain (optional)"
echo "4. Proceed to Phase 6: OCR Pipeline Migration"
echo ""
echo "Build logs: https://console.aws.amazon.com/amplify/home?region=us-east-1"
echo ""
echo "=================================================="
echo "Setup Complete!"
echo "=================================================="
