#!/bin/bash

# Script to run database migration against RDS PostgreSQL
# This script retrieves the database password from Secrets Manager and runs the migration

set -e

# Configuration
AWS_PROFILE="${AWS_PROFILE:-kiro-ctcm-dev-admin}"
AWS_REGION="us-east-1"
SECRET_ID="ctcm-dev-database-credentials"
DB_HOST="ctcmdevdatastack-databaseb269d8bb-5dp0uzejpe9c.ckfqwaw86gus.us-east-1.rds.amazonaws.com"
DB_NAME="ctcm"
DB_USER="ctcmadmin"
MIGRATION_FILE="infra/migrations/001_initial_schema.sql"

echo "🔐 Retrieving database credentials from Secrets Manager..."
DB_PASSWORD=$(AWS_PROFILE=$AWS_PROFILE aws secretsmanager get-secret-value \
  --secret-id $SECRET_ID \
  --region $AWS_REGION \
  --query SecretString \
  --output text | jq -r '.password')

if [ -z "$DB_PASSWORD" ]; then
  echo "❌ Failed to retrieve database password"
  exit 1
fi

echo "✅ Database credentials retrieved"

echo ""
echo "📊 Database connection details:"
echo "  Host: $DB_HOST"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

echo "🔍 Testing database connection..."
PGPASSWORD=$DB_PASSWORD psql \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  -p 5432 \
  -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Database connection successful"
else
  echo "❌ Failed to connect to database"
  echo "   Make sure you have psql installed and the database is accessible"
  exit 1
fi

echo ""
echo "🚀 Running database migration: $MIGRATION_FILE"
echo ""

PGPASSWORD=$DB_PASSWORD psql \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  -p 5432 \
  -f $MIGRATION_FILE

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration completed successfully!"
  echo ""
  echo "📋 Verifying tables..."
  PGPASSWORD=$DB_PASSWORD psql \
    -h $DB_HOST \
    -U $DB_USER \
    -d $DB_NAME \
    -p 5432 \
    -c "\dt"
  
  echo ""
  echo "📊 Checking sample data..."
  PGPASSWORD=$DB_PASSWORD psql \
    -h $DB_HOST \
    -U $DB_USER \
    -d $DB_NAME \
    -p 5432 \
    -c "SELECT COUNT(*) as customer_count FROM customers;"
  
  PGPASSWORD=$DB_PASSWORD psql \
    -h $DB_HOST \
    -U $DB_USER \
    -d $DB_NAME \
    -p 5432 \
    -c "SELECT COUNT(*) as shipment_count FROM shipments;"
  
  echo ""
  echo "🎉 Database is ready for use!"
else
  echo ""
  echo "❌ Migration failed"
  exit 1
fi
