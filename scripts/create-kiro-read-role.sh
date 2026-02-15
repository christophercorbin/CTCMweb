#!/bin/bash

# Create a read-only role in CTCM Dev account for Kiro/AI access
# This role can be assumed from the management account

set -e

PROFILE="${AWS_PROFILE:-ctcm-dev}"
MANAGEMENT_ACCOUNT="438465156498"
ROLE_NAME="KiroReadOnlyRole"

echo "🔧 Creating Kiro Read-Only Role in CTCM Dev Account"
echo ""

# Trust policy - allows management account to assume this role
cat > /tmp/trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::${MANAGEMENT_ACCOUNT}:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "kiro-ai-access"
        }
      }
    }
  ]
}
EOF

# Create the role
echo "Creating IAM role: $ROLE_NAME..."
AWS_PROFILE=$PROFILE aws iam create-role \
  --role-name $ROLE_NAME \
  --assume-role-policy-document file:///tmp/trust-policy.json \
  --description "Read-only role for Kiro AI assistant" \
  --tags Key=ManagedBy,Value=Kiro Key=Purpose,Value=AIAccess

# Attach read-only policies
echo "Attaching read-only policies..."
AWS_PROFILE=$PROFILE aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess

AWS_PROFILE=$PROFILE aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/CloudFormationReadOnlyAccess

# Get the role ARN
ROLE_ARN=$(AWS_PROFILE=$PROFILE aws iam get-role \
  --role-name $ROLE_NAME \
  --query 'Role.Arn' \
  --output text)

echo ""
echo "✅ Role created successfully!"
echo ""
echo "Role ARN: $ROLE_ARN"
echo ""
echo "📝 Next step: Configure AWS CLI profile to use this role"
echo ""
echo "Add this to ~/.aws/config:"
echo ""
cat <<EOF
[profile kiro-ctcm-dev]
role_arn = $ROLE_ARN
source_profile = default
external_id = kiro-ai-access
region = us-east-1
EOF
echo ""
echo "Then set as default for Kiro:"
echo "  export AWS_PROFILE=kiro-ctcm-dev"
echo ""

# Clean up
rm /tmp/trust-policy.json
