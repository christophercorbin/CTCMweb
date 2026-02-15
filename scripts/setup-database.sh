#!/bin/bash

# Setup Database Schema for CTCM Dev
# This script connects to the RDS instance and creates the database schema

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗄️  CTCM Database Setup${NC}"
echo "================================"

# Get database credentials from Secrets Manager
echo -e "${BLUE}📋 Retrieving database credentials...${NC}"
SECRET=$(AWS_PROFILE=kiro-ctcm-dev-admin aws secretsmanager get-secret-value \
  --secret-id ctcm-dev-database-credentials \
  --region us-east-1 \
  --query SecretString \
  --output text)

DB_USER=$(echo $SECRET | jq -r '.username')
DB_PASS=$(echo $SECRET | jq -r '.password')

# Get database endpoint from CloudFormation
echo -e "${BLUE}🔍 Getting database endpoint...${NC}"
DB_HOST=$(AWS_PROFILE=kiro-ctcm-dev-admin aws cloudformation describe-stacks \
  --stack-name CtcmDevDataStack \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
  --output text)

DB_NAME="ctcm"
DB_PORT="5432"

echo -e "${GREEN}✓${NC} Database: ${DB_HOST}"
echo -e "${GREEN}✓${NC} User: ${DB_USER}"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql is not installed${NC}"
    echo "Please install PostgreSQL client:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

# Test connection
echo -e "${BLUE}🔌 Testing database connection...${NC}"
if PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Connection successful!"
else
    echo -e "${RED}❌ Connection failed${NC}"
    echo "Please check:"
    echo "  1. Database is publicly accessible"
    echo "  2. Security group allows your IP"
    echo "  3. Database is running"
    exit 1
fi

# Run schema migration
echo ""
echo -e "${BLUE}📝 Creating database schema...${NC}"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -f infra/migrations/001_initial_schema.sql

echo ""
echo -e "${GREEN}✅ Database setup complete!${NC}"
echo ""
echo "Connection details:"
echo "  Host: ${DB_HOST}"
echo "  Port: ${DB_PORT}"
echo "  Database: ${DB_NAME}"
echo "  User: ${DB_USER}"
echo ""
echo "To connect manually:"
echo "  PGPASSWORD='${DB_PASS}' psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -p ${DB_PORT}"
