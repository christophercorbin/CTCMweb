---
title: AWS Account Usage Best Practices
description: Guidelines for proper usage of AWS Organization accounts
inclusion: always
---

# AWS Account Usage Best Practices

This document outlines the best practices and guidelines for using the AWS Organization accounts properly. Following these practices ensures security, cost optimization, and operational excellence.

---

## Account Structure Overview

### Management Account (438465156498)
**Purpose:** Organization administration and billing consolidation only

**DO:**
- Manage AWS Organization structure and policies
- Configure consolidated billing and cost allocation
- Set up organization-wide CloudTrail
- Manage IAM Identity Center (SSO)
- Create and manage Service Control Policies (SCPs)
- Monitor organization-wide budgets and costs
- Configure organization-level security services (GuardDuty, Security Hub)

**DO NOT:**
- Deploy application workloads
- Create application resources (EC2, Lambda, RDS, etc.)
- Store application data
- Run development or testing activities
- Use for personal experimentation

**Why:** The management account should remain clean and focused on governance. Compromising this account could affect the entire organization.

---

### Security Tooling Account (590716168923)
**Purpose:** Centralized security monitoring and audit logging

**DO:**
- Aggregate CloudTrail logs from all accounts
- Run security scanning and compliance tools
- Deploy AWS Security Hub aggregation
- Configure GuardDuty master account
- Store security audit logs (read-only access from other accounts)
- Run vulnerability scanning tools
- Deploy AWS Config aggregator

**DO NOT:**
- Deploy application workloads
- Allow application teams direct access
- Store application data
- Use for development or testing

**Access:** Security team and automated security tools only

---

### Log Archive Account (Account ID from your org)
**Purpose:** Long-term log retention and compliance

**DO:**
- Store CloudTrail logs with lifecycle policies
- Maintain immutable log storage
- Configure S3 bucket policies for write-once-read-many
- Set up log retention per compliance requirements
- Enable S3 Object Lock for regulatory compliance

**DO NOT:**
- Allow log modification or deletion
- Deploy any compute resources
- Grant broad access permissions

**Access:** Automated log delivery only, read access for security/compliance teams

---

### ePortfolio Development Account (934862608865)
**Purpose:** Development and testing environment for ePortfolio application

**DO:**
- Deploy development versions of ePortfolio application
- Test new features and changes
- Experiment with AWS services
- Run integration tests
- Deploy via CI/CD from `develop` branch
- Use cost-effective instance types (t3.micro, t3.small)
- Tag all resources with `Environment=dev`
- Delete unused resources regularly

**DO NOT:**
- Store production data
- Use production-grade instance sizes
- Keep resources running 24/7 unless necessary
- Deploy manually (use CI/CD)
- Share credentials outside the team

**Budget:** $10/month - Monitor closely and clean up unused resources

**Access:** Development team via IAM Identity Center

---

### ePortfolio Production Account (590716168923)
**Purpose:** Production environment for ePortfolio application

**DO:**
- Deploy production-ready code only
- Deploy via CI/CD from `main` branch with approval
- Use appropriate instance sizing for production load
- Enable high availability and disaster recovery
- Implement comprehensive monitoring and alerting
- Tag all resources with `Environment=prod`
- Enable automated backups
- Use encryption at rest and in transit
- Implement least privilege access

**DO NOT:**
- Deploy untested code
- Experiment with new services
- Deploy manually without CI/CD
- Allow direct database access from internet
- Share production credentials
- Make changes without change management process

**Budget:** $20/month - Monitor and optimize costs

**Access:** Limited production support team via IAM Identity Center, automated deployments only

---

### Sandbox Account (385467776718)
**Purpose:** Proof of concepts, experimentation, and learning

**DO:**
- Experiment with new AWS services
- Build proof of concepts before committing to Dev
- Test architectural patterns and designs
- Learn AWS services hands-on
- Try different approaches to solve problems
- Test cost implications of services
- Prototype features before formal development
- Delete resources when done experimenting

**DO NOT:**
- Store any production or sensitive data
- Use for actual development work (use Dev account)
- Keep expensive resources running
- Share access with external parties
- Deploy customer-facing applications

**Budget:** $15/month - Clean up aggressively after experiments

**Access:** Development team via IAM Identity Center

**Lifecycle:** Resources should be temporary and deleted after POC completion

---

## Cross-Account Best Practices

### 1. Access Management

**Use IAM Identity Center (SSO):**
- Never create IAM users in member accounts
- All human access through SSO portal: https://d-906601aeb4.awsapps.com/start
- Assign permission sets based on job function
- Use temporary credentials (no long-term access keys)

**Role-Based Access:**
- Development team: Full access to Dev account, read-only to Prod
- Operations team: Limited access to Prod for troubleshooting
- Security team: Read-only access to all accounts
- No one gets access to Management account except administrators

### 2. Deployment Strategy

**CI/CD Pipeline:**
```
Code Push → GitHub Actions → Build → Test → Deploy
```

**Development Workflow:**
1. Develop and test locally
2. Push to `develop` branch
3. Automatic deployment to Dev account
4. Test in Dev environment
5. Create pull request to `main`
6. Code review and approval
7. Merge to `main`
8. Manual approval required
9. Automatic deployment to Prod account

**Never:**
- Deploy directly via AWS Console
- Use `aws cli` commands for deployments
- Share AWS credentials
- Commit credentials to Git

### 3. Resource Tagging

**Required Tags for All Resources:**
```
Environment: dev | prod
Application: eportfolio
ManagedBy: terraform | cloudformation | cdk
Owner: team-name
CostCenter: eportfolio
```

**Why:** Enables cost allocation, resource tracking, and automated cleanup

### 4. Security Practices

**Network Security:**
- Use VPCs with private subnets for databases
- Public subnets only for load balancers
- Enable VPC Flow Logs
- Use Security Groups (not NACLs) for instance-level security
- Never expose databases to internet (0.0.0.0/0)

**Data Security:**
- Enable encryption at rest for all data stores (S3, RDS, EBS)
- Use AWS KMS for encryption keys
- Enable encryption in transit (TLS/SSL)
- Regular automated backups
- Test backup restoration quarterly

**Secrets Management:**
- Store secrets in AWS Secrets Manager
- Never hardcode credentials
- Rotate secrets regularly
- Use IAM roles for service-to-service authentication

### 5. Cost Optimization

**Development Account:**
- Stop EC2 instances outside business hours
- Use t3.micro/small instance types
- Delete unused resources weekly
- Use spot instances for non-critical workloads
- Set up budget alerts at $8 (80% of budget)

**Production Account:**
- Right-size instances based on actual usage
- Use Reserved Instances or Savings Plans for steady-state workloads
- Enable S3 Intelligent-Tiering
- Use CloudFront for static content
- Review AWS Cost Explorer monthly
- Set up budget alerts at $16 (80% of budget)

**Both Accounts:**
- Delete old snapshots and AMIs
- Clean up unused Elastic IPs
- Remove old CloudWatch Logs
- Use lifecycle policies for S3

### 6. Monitoring and Alerting

**Required Monitoring:**
- CloudWatch alarms for critical metrics
- Application performance monitoring (APM)
- Log aggregation and analysis
- Security event monitoring
- Cost anomaly detection

**Alert Thresholds:**
- CPU > 80% for 5 minutes
- Memory > 85% for 5 minutes
- Disk > 90%
- Error rate > 1%
- Response time > 2 seconds
- Budget > 80% of monthly allocation

### 7. Backup and Disaster Recovery

**Development Account:**
- Daily automated snapshots (7-day retention)
- No cross-region replication required
- Recovery Time Objective (RTO): 4 hours
- Recovery Point Objective (RPO): 24 hours

**Production Account:**
- Automated backups every 6 hours
- 30-day retention for backups
- Cross-region backup replication
- Test restoration monthly
- RTO: 1 hour
- RPO: 6 hours

### 8. Compliance and Governance

**Service Control Policies (SCPs):**
- Root user access denied (except Management account emergencies)
- Region restriction: us-east-1 and us-east-2 only
- CloudTrail protection enabled
- Prevent disabling security services

**Audit Requirements:**
- All API calls logged via CloudTrail
- CloudTrail logs stored in Log Archive account
- Log retention: 7 years
- Quarterly security audits
- Monthly cost reviews

### 9. Change Management

**Development Changes:**
- Can be deployed immediately after code review
- Rollback plan required
- Document changes in Git commit messages

**Production Changes:**
- Require change request and approval
- Must be tested in Dev first
- Scheduled during maintenance windows
- Rollback plan mandatory
- Post-deployment verification required

**Emergency Changes:**
- Security patches: Immediate deployment allowed
- Critical bugs: Expedited approval process
- Document all emergency changes within 24 hours

### 10. Incident Response

**Severity Levels:**
- **P1 (Critical):** Production down, data loss risk
  - Response time: 15 minutes
  - All hands on deck
  
- **P2 (High):** Major functionality impaired
  - Response time: 1 hour
  - Assigned team responds
  
- **P3 (Medium):** Minor functionality impaired
  - Response time: 4 hours
  - Normal business hours
  
- **P4 (Low):** Cosmetic issues, feature requests
  - Response time: Next sprint

**Incident Process:**
1. Detect and alert
2. Assess severity
3. Assemble response team
4. Investigate and diagnose
5. Implement fix
6. Verify resolution
7. Post-mortem within 48 hours

---

## Common Scenarios

### Deploying a New Feature

1. Create feature branch from `develop`
2. Develop and test locally
3. Push to feature branch
4. Create PR to `develop`
5. Code review and approval
6. Merge to `develop` → Auto-deploys to Dev
7. Test in Dev account
8. Create PR from `develop` to `main`
9. Code review and approval
10. Merge to `main` → Requires manual approval
11. Approve deployment → Auto-deploys to Prod
12. Monitor and verify

### Investigating a Production Issue

1. Check CloudWatch dashboards
2. Review CloudWatch Logs
3. Check recent deployments
4. Review CloudTrail for recent changes
5. If needed, assume read-only role in Prod account
6. Never make changes directly in Prod
7. Reproduce issue in Dev if possible
8. Fix in Dev, test, then deploy to Prod via CI/CD

### Adding a New AWS Service

1. Research service in Dev account
2. Test implementation in Dev
3. Document configuration and costs
4. Update Infrastructure as Code
5. Review security implications
6. Get approval for Prod deployment
7. Deploy via CI/CD pipeline
8. Update documentation

### Cost Overrun

1. Check AWS Cost Explorer for anomalies
2. Identify resource causing overrun
3. Determine if resource is necessary
4. If Dev: Delete or stop immediately
5. If Prod: Assess impact, plan optimization
6. Implement cost controls
7. Update budget alerts if needed

---

## Quick Reference

### Access URLs
- **SSO Portal:** https://d-906601aeb4.awsapps.com/start
- **AWS Console:** Use SSO portal, never direct login
- **Support:** AWS Support in Management account

### Emergency Contacts
- **Security Issues:** security-team@christophercorbin.cloud
- **Production Issues:** ops-team@christophercorbin.cloud
- **Billing Issues:** billing@christophercorbin.cloud

### Key Policies
- **Root User:** Locked down, MFA required, emergency use only
- **Regions:** us-east-1 (primary), us-east-2 (DR)
- **Encryption:** Required for all data at rest
- **MFA:** Required for all human access
- **Credentials:** Never commit to Git, use Secrets Manager

---

## Violations and Consequences

**Immediate Termination of Access:**
- Sharing credentials
- Deploying to Prod without approval
- Disabling security controls
- Accessing data without authorization

**Warning and Retraining:**
- Deploying manually instead of via CI/CD
- Not tagging resources
- Leaving resources running unnecessarily
- Not following change management

**Cost Recovery:**
- Excessive costs due to negligence
- Leaving expensive resources running
- Not cleaning up after testing

---

## Review and Updates

This document should be reviewed:
- Quarterly by the team
- After any security incident
- When adding new accounts or services
- When AWS releases new best practices

**Last Updated:** February 11, 2026  
**Next Review:** May 11, 2026  
**Document Owner:** Christopher Corbin
