#!/bin/bash

# Configure S3 bucket policy for CloudFront access
# This script adds a bucket policy to allow CloudFront OAI to read from the frontend bucket

set -e

BUCKET_NAME="ctcm-dev-frontend-404875533723"
OAI_ID="E2RGZGGI3OFF9Y"

echo "Configuring S3 bucket policy for CloudFront access..."
echo "Bucket: $BUCKET_NAME"
echo "OAI ID: $OAI_ID"

# Create bucket policy JSON
cat > /tmp/bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAI",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity $OAI_ID"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF

# Apply bucket policy
echo "Applying bucket policy..."
aws s3api put-bucket-policy \
  --bucket "$BUCKET_NAME" \
  --policy file:///tmp/bucket-policy.json

echo "✅ Bucket policy configured successfully!"
echo ""
echo "Next steps:"
echo "1. Configure CloudFront distribution E34Q2E7TZIYZAB with S3 origin"
echo "2. Set origin domain: $BUCKET_NAME.s3.us-east-1.amazonaws.com"
echo "3. Set origin access: Use OAI $OAI_ID"
echo "4. Set default root object: index.html"
echo "5. Configure error pages: 404 -> /index.html (for SPA routing)"

# Clean up
rm /tmp/bucket-policy.json
