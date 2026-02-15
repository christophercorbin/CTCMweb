# CTCM - Caribbean Trade & Cargo Management

A modern freight forwarding management system for Caribbean shipping operations.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Visit http://localhost:5173 to see the app.

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

- **[Setup Guides](./docs/setup/)** - Initial setup and AWS configuration
- **[Deployment](./docs/deployment/)** - Deployment guides and status
- **[Migration](./docs/migration/)** - Supabase to AWS migration docs
- **[User Guides](./docs/guides/)** - Quick start and best practices

👉 **Start here**: [Documentation Index](./docs/README.md)

## 🏗️ Project Structure

```
CTCMweb/
├── apps/
│   ├── web/              # React frontend application
│   └── api/              # API functions (future)
├── packages/
│   ├── types/            # Shared TypeScript types
│   └── utils/            # Shared utilities
├── infra/                # AWS CDK infrastructure code
├── scripts/              # Deployment and utility scripts
├── docs/                 # 📚 Documentation
└── .kiro/                # Kiro AI configuration
```

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: AWS Lambda + API Gateway + RDS PostgreSQL
- **Auth**: AWS Cognito
- **Hosting**: AWS Amplify
- **Infrastructure**: AWS CDK (TypeScript)

## 🎯 Features

### Current (Phase 0-2)
- ✅ User authentication (Cognito)
- ✅ Customer dashboard
- ✅ Admin dashboard
- ✅ Shipment tracking UI
- ✅ Invoice management UI
- ✅ Automatic CI/CD (Amplify)

### In Progress (Phase 3)
- 🔄 Database migration to RDS
- 🔄 API implementation
- 🔄 Real-time shipment updates

### Planned (Phase 4)
- ⏳ OCR document scanning (Textract)
- ⏳ Automated warehouse receipt intake
- ⏳ Email notifications

## 🚦 Development

### Prerequisites
- Node.js 18+
- npm 9+
- AWS CLI (for deployment)
- AWS CDK (for infrastructure)

### Environment Variables

Create `apps/web/.env.local`:

```env
VITE_API_URL=https://your-api-url.amazonaws.com/dev/
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_AWS_REGION=us-east-1
```

### Available Scripts

```bash
# Development
npm run dev              # Start dev server (all workspaces)
npm run build            # Build all workspaces
npm run lint             # Lint all workspaces
npm run typecheck        # Type check all workspaces

# Frontend specific
cd apps/web
npm run dev              # Start frontend dev server
npm run build            # Build frontend for production
npm run preview          # Preview production build

# Infrastructure
cd infra
npm run build            # Build CDK app
cdk deploy --all         # Deploy all stacks
cdk diff                 # Show infrastructure changes
```

## 🌐 Deployment

### Automatic Deployment (Amplify)
Every push to `main` branch automatically:
1. Builds the frontend
2. Runs tests
3. Deploys to AWS Amplify
4. Updates CloudFront CDN

### Manual Infrastructure Deployment
```bash
cd infra
npm run build
cdk deploy --all --profile kiro-ctcm-dev-admin
```

See [Deployment Documentation](./docs/deployment/) for details.

## 🔐 Authentication

### Test Users (Cognito)
- **Customer**: test@ctcm.com / TestPass123!
- **Admin**: admin@ctcm.com / AdminPass123!

### User Roles
- **Customer**: View own shipments, invoices, and customer info
- **Admin**: Manage all shipments, customers, and warehouse operations

## 📊 AWS Resources

### Account Information
- **Account ID**: 404875533723
- **Region**: us-east-1 (primary)
- **Environment**: Development

### Deployed Stacks
- CtcmDevNetworkStack - VPC and networking
- CtcmDevAuthStack - Cognito authentication
- CtcmDevDataStack - RDS database and S3 buckets
- CtcmDevApiStack - API Gateway and Lambda functions
- CtcmDevAmplifyFrontendStack - Amplify hosting
- CtcmDevOcrStack - Textract OCR pipeline
- CtcmDevObservabilityStack - CloudWatch monitoring

## 💰 Cost Tracking

**Monthly Budget**: $15 (development)

Current estimated costs:
- RDS PostgreSQL: ~$15/month
- Amplify Hosting: ~$0.80/month
- Lambda + API Gateway: ~$0-5/month (free tier)
- S3 + CloudWatch: ~$3-5/month

**Total**: ~$19-25/month (slightly over budget)

## 🤝 Contributing

This is a private project. For access or questions, contact the repository owner.

## 📞 Support

- **Repository**: https://github.com/christophercorbin/CTCMweb
- **Documentation**: [docs/README.md](./docs/README.md)
- **Owner**: Christopher Corbin

## 📝 License

Private - All rights reserved

---

**Last Updated**: February 2026  
**Version**: 0.1.0 (Phase 2 Complete)
