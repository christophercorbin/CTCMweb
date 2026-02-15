#!/bin/bash

# Script to run database migrations against RDS
# Usage: ./scripts/run-migration.sh [migration-file]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== CTCM Database Migration Script ===${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql is not installed${NC}"
    echo "Install with: brew install postgresql (macOS) or apt-get install postgresql-client (Linux)"
    exit 1
fi

# Set AWS profile
export AWS_PROFILE=kiro-ctcm-dev-admin
export AWS_REGION=us-east-1

echo -e "${YELLOW}Using AWS Profile: $AWS_PROFILE${NC}"
echo -e "${YELLOW}Using AWS Region: $AWS_REGION${NC}"

# Get database credentials from Secrets Manager
echo -e "${YELLOW}Fetching database credentials from Secrets Manager...${NC}"
SECRET_ARN=$(aws cloudformation describe-stacks \
    --stack-name CtcmDevDataStack \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseSecretArn`].OutputValue' \
    --output text)

if [ -z "$SECRET_ARN" ]; then
    echo -e "${RED}Error: Could not find database secret ARN${NC}"
    exit 1
fi

echo -e "${GREEN}Found secret: $SECRET_ARN${NC}"

# Get secret value
SECRET_JSON=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_ARN" \
    --query 'SecretString' \
    --output text)

DB_USERNAME=$(echo "$SECRET_JSON" | jq -r '.username')
DB_PASSWORD=$(echo "$SECRET_JSON" | jq -r '.password')
DB_HOST=$(aws cloudformation describe-stacks \
    --stack-name CtcmDevDataStack \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text)
DB_NAME="ctcm"
DB_PORT="5432"

echo -e "${GREEN}Database Host: $DB_HOST${NC}"
echo -e "${GREEN}Database Name: $DB_NAME${NC}"
echo -e "${GREEN}Database User: $DB_USERNAME${NC}"

# Determine which migration file to run
if [ -z "$1" ]; then
    MIGRATION_FILE="infra/migrations/001_initial_schema.sql"
else
    MIGRATION_FILE="$1"
fi

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}Error: Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}Running migration: $MIGRATION_FILE${NC}"

# Run the migration
export PGPASSWORD="$DB_PASSWORD"
psql -h "$DB_HOST" \
     -U "$DB_USERNAME" \
     -d "$DB_NAME" \
     -p "$DB_PORT" \
     -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migration completed successfully!${NC}"
else
    echo -e "${RED}✗ Migration failed!${NC}"
    exit 1
fi

# Verify tables were created
echo -e "${YELLOW}Verifying tables...${NC}"
TABLE_COUNT=$(psql -h "$DB_HOST" \
     -U "$DB_USERNAME" \
     -d "$DB_NAME" \
     -p "$DB_PORT" \
     -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")

echo -e "${GREEN}Found $TABLE_COUNT tables in database${NC}"

# List all tables
echo -e "${YELLOW}Tables created:${NC}"
psql -h "$DB_HOST" \
     -U "$DB_USERNAME" \
     -d "$DB_NAME" \
     -p "$DB_PORT" \
     -c "\dt"

echo -e "${GREEN}=== Migration Complete ===${NC}"
