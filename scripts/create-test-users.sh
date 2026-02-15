#!/bin/bash

# Create Test Users in Cognito
# This script creates admin and customer test users

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}👥 Creating Test Users in Cognito${NC}"
echo "================================"

USER_POOL_ID="us-east-1_zqM1VNIn3"
REGION="us-east-1"

# Admin User
ADMIN_EMAIL="admin@ctcm.com"
ADMIN_PASSWORD="AdminPass123!"

echo -e "${BLUE}Creating admin user...${NC}"
AWS_PROFILE=kiro-ctcm-dev-admin aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username $ADMIN_EMAIL \
  --user-attributes Name=email,Value=$ADMIN_EMAIL Name=email_verified,Value=true \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS \
  --region $REGION > /dev/null 2>&1 || echo "Admin user may already exist"

# Set permanent password
AWS_PROFILE=kiro-ctcm-dev-admin aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username $ADMIN_EMAIL \
  --password $ADMIN_PASSWORD \
  --permanent \
  --region $REGION > /dev/null 2>&1

# Add to admin group
AWS_PROFILE=kiro-ctcm-dev-admin aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username $ADMIN_EMAIL \
  --group-name admin \
  --region $REGION > /dev/null 2>&1

echo -e "${GREEN}✓${NC} Admin user created: $ADMIN_EMAIL / $ADMIN_PASSWORD"

# Customer User
CUSTOMER_EMAIL="test@ctcm.com"
CUSTOMER_PASSWORD="TestPass123!"

echo -e "${BLUE}Creating customer user...${NC}"
AWS_PROFILE=kiro-ctcm-dev-admin aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username $CUSTOMER_EMAIL \
  --user-attributes Name=email,Value=$CUSTOMER_EMAIL Name=email_verified,Value=true \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS \
  --region $REGION > /dev/null 2>&1 || echo "Customer user may already exist"

# Set permanent password
AWS_PROFILE=kiro-ctcm-dev-admin aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username $CUSTOMER_EMAIL \
  --password $CUSTOMER_PASSWORD \
  --permanent \
  --region $REGION > /dev/null 2>&1

# Add to customer group
AWS_PROFILE=kiro-ctcm-dev-admin aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username $CUSTOMER_EMAIL \
  --group-name customer \
  --region $REGION > /dev/null 2>&1

echo -e "${GREEN}✓${NC} Customer user created: $CUSTOMER_EMAIL / $CUSTOMER_PASSWORD"

echo ""
echo -e "${GREEN}✅ Test users created successfully!${NC}"
echo ""
echo "Login credentials:"
echo "  Admin:    $ADMIN_EMAIL / $ADMIN_PASSWORD"
echo "  Customer: $CUSTOMER_EMAIL / $CUSTOMER_PASSWORD"
echo ""
echo "Amplify App: https://main.d1yo6c4008x99n.amplifyapp.com"
