# GitHub OIDC Troubleshooting

## Current Issue

GitHub Actions is failing to assume the AWS IAM role with error:
```
Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity
```

## Setup Verification

### OIDC Provider
✅ Provider exists: `arn:aws:iam::404875533723:oidc-provider/token.actions.githubusercontent.com`
✅ Client ID: `sts.amazonaws.com`
✅ Thumbprints: Valid

### IAM Role
✅ Role exists: `GitHubActionsDeployRole`
✅ Role ARN: `arn:aws:iam::404875533723:role/GitHubActionsDeployRole`
✅ Trust policy includes both `main` and `develop` branches

### Trust Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::404875533723:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:christophercorbin/CTCMweb:ref:refs/heads/main",
            "repo:christophercorbin/CTCMweb:ref:refs/heads/develop"
          ]
        }
      }
    }
  ]
}
```

## Possible Causes

1. **IAM Propagation Delay**: IAM changes can take up to 5 minutes to propagate globally
2. **Token Format Mismatch**: The GitHub OIDC token subject might not match the expected format
3. **Permissions Issue**: The role might not have the necessary permissions attached

## Next Steps

### 1. Wait for IAM Propagation
Wait 5-10 minutes after creating/updating the role before retrying.

### 2. Verify Token Format
Add a debug step to the workflow to see the actual token claims:

```yaml
- name: Debug OIDC Token
  run: |
    curl -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=sts.amazonaws.com" | jq
  env:
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: ${{ env.ACTIONS_ID_TOKEN_REQUEST_TOKEN }}
    ACTIONS_ID_TOKEN_REQUEST_URL: ${{ env.ACTIONS_ID_TOKEN_REQUEST_URL }}
```

### 3. Simplify Trust Policy (Temporary)
Try a more permissive trust policy for testing:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::404875533723:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:christophercorbin/CTCMweb:*"
        }
      }
    }
  ]
}
```

### 4. Check Role Permissions
Verify the role has AdministratorAccess attached:

```bash
aws iam list-attached-role-policies --role-name GitHubActionsDeployRole
```

## Resolution

Once working, document the exact configuration that succeeded.

## References

- [GitHub OIDC with AWS](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS IAM OIDC](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
