#!/bin/bash

# Migration script to copy documents from old S3 bucket to new Amplify Storage bucket
# 
# Usage: ./scripts/migrate-documents-to-amplify.sh [--dry-run]
#
# This script:
# 1. Lists all objects in the source bucket (ctcm-dev-documents-404875533723)
# 2. Copies them to the new Amplify Storage bucket
# 3. Preserves directory structure and metadata
# 4. Verifies successful copy

set -e

# Configuration
SOURCE_BUCKET="ctcm-dev-documents-404875533723"
REGION="us-east-1"
PROFILE="ctcm-dev"
DRY_RUN=false

# Parse arguments
if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "🔍 DRY RUN MODE - No changes will be made"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📦 CTCM Document Migration to Amplify Storage"
echo "=============================================="
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo -e "${RED}❌ AWS CLI is not installed${NC}"
  echo "Install it from: https://aws.amazon.com/cli/"
  exit 1
fi

# Check if profile exists
if ! aws configure list-profiles | grep -q "^${PROFILE}$"; then
  echo -e "${YELLOW}⚠️  Profile '${PROFILE}' not found${NC}"
  echo "Using default AWS credentials"
  PROFILE=""
else
  echo -e "${GREEN}✓ Using AWS profile: ${PROFILE}${NC}"
fi

# Get the Amplify Storage bucket name from amplify_outputs.json
if [ ! -f "amplify_outputs.json" ]; then
  echo -e "${RED}❌ amplify_outputs.json not found${NC}"
  echo "Please deploy the Amplify backend first:"
  echo "  cd amplify && npm run deploy"
  exit 1
fi

# Extract bucket name from amplify_outputs.json
DEST_BUCKET=$(cat amplify_outputs.json | grep -o '"bucket_name":"[^"]*"' | cut -d'"' -f4)

if [ -z "$DEST_BUCKET" ]; then
  echo -e "${RED}❌ Could not find destination bucket in amplify_outputs.json${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Source bucket: ${SOURCE_BUCKET}${NC}"
echo -e "${GREEN}✓ Destination bucket: ${DEST_BUCKET}${NC}"
echo ""

# Count objects in source bucket
echo "📊 Counting objects in source bucket..."
PROFILE_ARG=""
if [ -n "$PROFILE" ]; then
  PROFILE_ARG="--profile $PROFILE"
fi

OBJECT_COUNT=$(aws s3 ls "s3://${SOURCE_BUCKET}" --recursive $PROFILE_ARG | wc -l)
echo -e "${GREEN}✓ Found ${OBJECT_COUNT} objects to migrate${NC}"
echo ""

if [ "$OBJECT_COUNT" -eq 0 ]; then
  echo -e "${YELLOW}⚠️  No objects found in source bucket${NC}"
  exit 0
fi

# Confirm migration
if [ "$DRY_RUN" = false ]; then
  echo -e "${YELLOW}⚠️  This will copy ${OBJECT_COUNT} objects to the new bucket${NC}"
  read -p "Continue? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled"
    exit 0
  fi
fi

# Perform migration
echo "🚀 Starting migration..."
echo ""

if [ "$DRY_RUN" = true ]; then
  # Dry run - just list what would be copied
  aws s3 ls "s3://${SOURCE_BUCKET}" --recursive $PROFILE_ARG | while read -r line; do
    key=$(echo "$line" | awk '{print $4}')
    echo "  Would copy: s3://${SOURCE_BUCKET}/${key} -> s3://${DEST_BUCKET}/${key}"
  done
else
  # Actual copy with progress
  aws s3 sync \
    "s3://${SOURCE_BUCKET}" \
    "s3://${DEST_BUCKET}" \
    --region "$REGION" \
    $PROFILE_ARG \
    --metadata-directive COPY \
    --storage-class INTELLIGENT_TIERING
  
  echo ""
  echo -e "${GREEN}✓ Migration completed successfully${NC}"
  
  # Verify object count
  echo ""
  echo "🔍 Verifying migration..."
  DEST_COUNT=$(aws s3 ls "s3://${DEST_BUCKET}" --recursive $PROFILE_ARG | wc -l)
  
  if [ "$DEST_COUNT" -eq "$OBJECT_COUNT" ]; then
    echo -e "${GREEN}✓ Verification passed: ${DEST_COUNT} objects in destination${NC}"
  else
    echo -e "${RED}❌ Verification failed: Expected ${OBJECT_COUNT}, found ${DEST_COUNT}${NC}"
    exit 1
  fi
fi

echo ""
echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Test document access in the application"
echo "2. Verify OCR processing works with new bucket"
echo "3. Keep old bucket for 30 days as backup"
echo "4. Update application to use new bucket exclusively"
