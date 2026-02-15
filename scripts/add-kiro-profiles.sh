#!/bin/bash

# Add Kiro AWS Profiles to ~/.aws/config
# This script only adds profiles, doesn't create IAM roles
# Run this if roles already exist or you created them manually

set -e

echo "📝 Adding Kiro AWS Profiles"
echo "==========================="
echo ""

# Backup existing config
if [ -f ~/.aws/config ]; then
    BACKUP_FILE=~/.aws/config.backup.$(date +%Y%m%d_%H%M%S)
    cp ~/.aws/config "$BACKUP_FILE"
    echo "✅ Backed up existing config to: $BACKUP_FILE"
fi

# Check if profiles already exist
if grep -q "\[profile kiro-ctcm-dev-admin\]" ~/.aws/config 2>/dev/null; then
    echo "⚠️  Kiro profiles already exist in ~/.aws/config"
    read -p "Do you want to overwrite them? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    # Remove existing Kiro profiles
    sed -i.tmp '/# Kiro AI Assistant Profiles/,/^$/d' ~/.aws/config
    rm ~/.aws/config.tmp 2>/dev/null || true
fi

# Add Kiro profiles
cat >> ~/.aws/config <<'EOF'

# Kiro AI Assistant Profiles
# Admin access to CTCM Dev, read-only to others

# CTCM Dev - Admin (default for Kiro)
[profile kiro-ctcm-dev-admin]
role_arn = arn:aws:iam::404875533723:role/KiroAdminRole
source_profile = default
region = us-east-1
output = json

# CTCM Dev - Read-only
[profile kiro-ctcm-dev-ro]
role_arn = arn:aws:iam::404875533723:role/KiroReadOnlyRole
source_profile = default
region = us-east-1
output = json

# Management - Read-only
[profile kiro-management-ro]
role_arn = arn:aws:iam::438465156498:role/KiroReadOnlyRole
source_profile = default
region = us-east-1
output = json

# ePortfolio Dev - Read-only
[profile kiro-eportfolio-dev-ro]
role_arn = arn:aws:iam::934862608865:role/KiroReadOnlyRole
source_profile = default
region = us-east-1
output = json

# ePortfolio Prod - Read-only
[profile kiro-eportfolio-prod-ro]
role_arn = arn:aws:iam::590716168923:role/KiroReadOnlyRole
source_profile = default
region = us-east-1
output = json

# Sandbox - Read-only
[profile kiro-sandbox-ro]
role_arn = arn:aws:iam::385467776718:role/KiroReadOnlyRole
source_profile = default
region = us-east-1
output = json

EOF

echo "✅ Profiles added to ~/.aws/config"
echo ""

# Add to shell profile
SHELL_RC=""
if [ -f ~/.zshrc ]; then
    SHELL_RC=~/.zshrc
elif [ -f ~/.bashrc ]; then
    SHELL_RC=~/.bashrc
fi

if [ -n "$SHELL_RC" ]; then
    if grep -q "AWS_PROFILE=kiro-ctcm-dev-admin" "$SHELL_RC" 2>/dev/null; then
        echo "✅ AWS_PROFILE already set in $SHELL_RC"
    else
        echo "📝 Adding AWS_PROFILE to $SHELL_RC..."
        cat >> "$SHELL_RC" <<'EOF'

# Kiro AI Assistant - Default AWS Profile
export AWS_PROFILE=kiro-ctcm-dev-admin

EOF
        echo "✅ Added to $SHELL_RC"
    fi
fi

echo ""
echo "✅ Setup Complete!"
echo "=================="
echo ""
echo "📋 Profiles added:"
echo "  kiro-ctcm-dev-admin      - Admin access to CTCM Dev (default)"
echo "  kiro-ctcm-dev-ro         - Read-only CTCM Dev"
echo "  kiro-management-ro       - Read-only Management"
echo "  kiro-eportfolio-dev-ro   - Read-only ePortfolio Dev"
echo "  kiro-eportfolio-prod-ro  - Read-only ePortfolio Prod"
echo "  kiro-sandbox-ro          - Read-only Sandbox"
echo ""
echo "🔄 Apply changes:"
echo "  source $SHELL_RC"
echo ""
echo "🧪 Test access:"
echo "  aws sts get-caller-identity"
echo "  # Should show CTCM Dev account (404875533723)"
echo ""
echo "⚠️  Note: IAM roles must exist in each account for profiles to work"
echo "   If roles don't exist, run: ./scripts/setup-kiro-multi-account-access.sh"
echo ""
