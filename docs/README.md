# CTCM Documentation

Welcome to the CTCM (Caribbean Trade & Cargo Management) documentation. This directory contains all documentation for the freight forwarding system.

## 📚 Documentation Structure

### 🚀 [Setup](./setup/)
Initial setup and configuration guides for developers and AWS infrastructure.

- **[Bootstrap CDK](./setup/BOOTSTRAP_CDK.md)** - CDK bootstrapping for AWS deployment
- **[Kiro AWS Setup](./setup/KIRO_AWS_SETUP.md)** - Configure Kiro AI assistant for AWS access
- **[Configure Kiro AWS Access](./setup/CONFIGURE_KIRO_AWS_ACCESS.md)** - Detailed AWS access configuration

### 📦 [Deployment](./deployment/)
Deployment guides and status tracking.

- **[Deployment Status](./deployment/DEPLOYMENT_STATUS.md)** - Current deployment status and stack outputs
- **[Amplify Setup Guide](./deployment/AMPLIFY_SETUP_GUIDE.md)** - AWS Amplify Hosting setup and configuration

### 🔄 [Migration](./migration/)
Migration documentation from Supabase to AWS.

- **[Phase 2 Summary](./migration/PHASE2_SUMMARY.md)** - Authentication migration to Cognito
- **[Supabase Removal Summary](./migration/SUPABASE_REMOVAL_SUMMARY.md)** - Complete Supabase removal documentation

### 📖 [Guides](./guides/)
User guides and best practices.

- **[Quick Start](./guides/QUICK_START.md)** - Quick start guide for developers
- **[Steering](./guides/STEERING.md)** - Development guidelines and best practices

## 🏗️ Project Overview

CTCM is a freight forwarding management system built with:

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: AWS Lambda + API Gateway + RDS PostgreSQL
- **Authentication**: AWS Cognito
- **Hosting**: AWS Amplify
- **Infrastructure**: AWS CDK (TypeScript)

## 🎯 Quick Links

### For Developers
- [Quick Start Guide](./guides/QUICK_START.md) - Get started quickly
- [Deployment Status](./deployment/DEPLOYMENT_STATUS.md) - Check current deployment

### For DevOps
- [Bootstrap CDK](./setup/BOOTSTRAP_CDK.md) - Initial AWS setup
- [Amplify Setup](./deployment/AMPLIFY_SETUP_GUIDE.md) - Configure hosting

### For Migration
- [Phase 2 Summary](./migration/PHASE2_SUMMARY.md) - Authentication migration
- [Supabase Removal](./migration/SUPABASE_REMOVAL_SUMMARY.md) - Database migration prep

## 📋 Migration Phases

### ✅ Phase 0: Monorepo Setup
- Restructured project as monorepo
- Set up workspaces for apps and packages
- Configured TypeScript project references

### ✅ Phase 1: Frontend Hosting
- Migrated from Supabase to AWS Amplify Hosting
- Configured automatic CI/CD from GitHub
- Set up CloudFront CDN distribution

### ✅ Phase 2: Authentication
- Migrated from Supabase Auth to AWS Cognito
- Implemented JWT token management
- Removed all Supabase dependencies

### 🔄 Phase 3: Database & API (In Progress)
- Migrate database from Supabase to RDS PostgreSQL
- Implement Lambda functions for API
- Set up API Gateway REST API

### ⏳ Phase 4: OCR Integration (Planned)
- Implement AWS Textract for document scanning
- Create Step Functions workflow
- Integrate with warehouse receipt intake

## 🛠️ Tech Stack

### Frontend
- React 18
- TypeScript 5
- Vite 5
- TailwindCSS 3
- React Router 7
- AWS Amplify (Auth)
- Axios (HTTP client)

### Backend (AWS)
- Lambda (Node.js/TypeScript)
- API Gateway (REST)
- RDS PostgreSQL (t4g.micro)
- Cognito (Authentication)
- S3 (Document storage)
- Textract (OCR - Phase 4)

### Infrastructure
- AWS CDK (TypeScript)
- CloudFormation
- GitHub Actions (CI/CD)

### Development Tools
- ESLint
- Prettier
- TypeScript
- npm workspaces

## 📊 Architecture

```
┌─────────────────┐
│   AWS Amplify   │  Frontend Hosting + CI/CD
│   (CloudFront)  │
└────────┬────────┘
         │
         ├─────────────────────────────────┐
         │                                 │
┌────────▼────────┐              ┌────────▼────────┐
│  AWS Cognito    │              │  API Gateway    │
│  (Auth)         │              │  (REST API)     │
└─────────────────┘              └────────┬────────┘
                                          │
                                 ┌────────▼────────┐
                                 │  Lambda         │
                                 │  Functions      │
                                 └────────┬────────┘
                                          │
                        ┌─────────────────┼─────────────────┐
                        │                 │                 │
               ┌────────▼────────┐ ┌─────▼──────┐ ┌───────▼────────┐
               │  RDS PostgreSQL │ │  S3        │ │  Textract      │
               │  (Database)     │ │  (Docs)    │ │  (OCR)         │
               └─────────────────┘ └────────────┘ └────────────────┘
```

## 💰 Cost Estimate

### Development Environment (~$15/month budget)
- **RDS PostgreSQL t4g.micro**: ~$15/month
- **Lambda**: ~$0-5/month (free tier)
- **API Gateway**: ~$0-3/month (free tier)
- **Cognito**: Free (< 50k MAU)
- **Amplify Hosting**: ~$0.65-0.80/month
- **S3**: ~$0.50/month
- **CloudWatch**: ~$3-5/month

**Total**: ~$19-28/month (slightly over budget, needs optimization)

## 🔐 Security

- All data encrypted at rest (S3, RDS)
- All data encrypted in transit (TLS 1.2+)
- Cognito MFA for admin users
- IAM least privilege access
- Security Groups deny by default
- Secrets in AWS Secrets Manager
- No hardcoded credentials

## 🚦 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/christophercorbin/CTCMweb.git
   cd CTCMweb
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   # Edit .env.local with your AWS credentials
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Deploy infrastructure** (DevOps only)
   ```bash
   cd infra
   npm run build
   cdk deploy --all
   ```

## 📞 Support

- **Repository**: https://github.com/christophercorbin/CTCMweb
- **AWS Account**: 404875533723 (CTCM Dev)
- **Region**: us-east-1
- **Owner**: Christopher Corbin

## 📝 License

Private - All rights reserved
