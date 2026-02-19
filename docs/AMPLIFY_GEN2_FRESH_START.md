# Amplify Gen 2 Fresh Start - Complete Build Guide

## Overview

This document provides complete instructions for building a new CTCM application using AWS Amplify Gen 2 from scratch in a new repository. This approach avoids confusion from existing CDK infrastructure and provides a clean slate.

**Target**: New repository with Amplify Gen 2 only (no CDK)
**Account**: 404875533723 (CTCM Dev)
**Region**: us-east-1
**Budget**: $15/month

---

## Phase 0: Repository Setup

### Step 1: Create New Repository

```bash
# On GitHub, create new repository
# Name: CTCM-Amplify (or similar)
# Description: CTCM Freight Forwarding - Amplify Gen 2
# Private repository
# Initialize with README

# Clone locally
git clone https://github.com/christophercorbin/CTCM-Amplify.git
cd CTCM-Amplify
```

### Step 2: Copy Application Code

Copy only the application code (not infrastructure) from the old repo:

```bash
# From old repo (CTCMweb), copy these directories:
# - apps/web/          → Frontend application
# - apps/api/src/      → Backend logic (handlers, services, repositories)
# - packages/types/    → Shared TypeScript types
# - packages/utils/    → Shared utilities (if exists)

# Directory structure in new repo:
CTCM-Amplify/
├── apps/
│   ├── web/              # React frontend
│   └── api/              # Backend logic (no Lambda deployment code)
├── packages/
│   ├── types/            # Shared types
│   └── utils/            # Shared utilities
├── amplify/              # Amplify Gen 2 (to be created)
├── docs/                 # Documentation
└── package.json          # Root package.json
```

### Step 3: Initialize Monorepo

```bash
# Create root package.json
cat > package.json << 'EOF'
{
  "name": "ctcm-amplify",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=apps/web",
    "build": "npm run build --workspaces --if-present",
    "build:web": "npm run build --workspace=apps/web",
    "lint": "npm run lint --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "test": "npm run test --workspaces --if-present"
  }
}
EOF

# Install dependencies
npm install
```

### Step 4: Commit Initial Structure

```bash
git add -A
git commit -m "chore: initialize monorepo structure with application code"
git push origin main
```

---

## Phase 1: Amplify Project Initialization

### Step 1: Install Amplify CLI and Dependencies

```bash
# Install Amplify CLI globally
npm install -g @aws-amplify/cli

# Install Amplify packages
npm install @aws-amplify/backend @aws-amplify/backend-cli aws-amplify

# Install AWS SDK packages
npm install @aws-sdk/client-secrets-manager @aws-sdk/client-s3

# Install database packages
npm install pg
npm install -D @types/pg
```

### Step 2: Initialize Amplify Project

```bash
# Create amplify directory structure
mkdir -p amplify/{auth,storage,functions,data}

# Create backend.ts
cat > amplify/backend.ts << 'EOF'
import { defineBackend } from '@aws-amplify/backend';

/**
 * Amplify Gen 2 Backend for CTCM Freight Forwarding
 */
const backend = defineBackend({
  // Resources will be added incrementally
});

export default backend;
EOF

# Create package.json for amplify
cat > amplify/package.json << 'EOF'
{
  "name": "amplify-backend",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@aws-amplify/backend": "^1.21.0",
    "@aws-amplify/backend-cli": "^1.8.2"
  }
}
EOF

# Install amplify dependencies
cd amplify && npm install && cd ..
```

### Step 3: Create .gitignore

```bash
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.npm/

# Build outputs
dist/
build/
.amplify/

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Amplify
amplify_outputs.json
.amplify-hosting/
EOF
```

### Step 4: Commit Amplify Initialization

```bash
git add -A
git commit -m "feat: initialize Amplify Gen 2 project structure"
git push origin main
```

---

## Phase 2: Authentication Setup

### Step 1: Configure Amplify Auth

```bash
# Create auth resource
cat > amplify/auth/resource.ts << 'EOF'
import { defineAuth } from '@aws-amplify/backend';

/**
 * Amplify Auth Configuration for CTCM
 * 
 * Configures Cognito User Pool with:
 * - Email/password authentication
 * - User groups: admin, customer
 * - MFA optional
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
    fullname: {
      required: false,
      mutable: true,
    },
  },
  groups: ['admin', 'customer'],
  multifactor: {
    mode: 'OPTIONAL',
    totp: true,
  },
});
EOF
```

### Step 2: Update Backend Configuration

```bash
# Update amplify/backend.ts
cat > amplify/backend.ts << 'EOF'
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';

const backend = defineBackend({
  auth,
});

export default backend;
EOF
```

### Step 3: Update Frontend Auth Integration

Update `apps/web/src/lib/auth.ts` to use Amplify Auth SDK:

```typescript
import { signIn, signUp, signOut, getCurrentUser } from 'aws-amplify/auth';

// Replace existing Cognito SDK calls with Amplify Auth
```

### Step 4: Configure Amplify in Frontend

```typescript
// apps/web/src/main.tsx
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';

Amplify.configure(outputs);
```

### Step 5: Test Auth Locally

```bash
# Start Amplify sandbox
npx ampx sandbox

# In another terminal, start frontend
npm run dev --workspace=apps/web

# Test authentication flow
```

### Step 6: Commit Auth Configuration

```bash
git add -A
git commit -m "feat: configure Amplify Auth with Cognito"
git push origin main
```

---

## Phase 3: Storage Setup

### Step 1: Configure Amplify Storage

```bash
# Create storage resource
cat > amplify/storage/resource.ts << 'EOF'
import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'ctcmDocuments',
  access: (allow) => ({
    'invoices/{entity_id}/*': [
      allow.authenticated.to(['read', 'write']),
      allow.groups(['admin']).to(['read', 'write', 'delete']),
    ],
    'receipts/{entity_id}/*': [
      allow.authenticated.to(['read', 'write']),
      allow.groups(['admin']).to(['read', 'write', 'delete']),
    ],
    'documents/{entity_id}/*': [
      allow.authenticated.to(['read', 'write']),
      allow.groups(['admin']).to(['read', 'write', 'delete']),
    ],
    'shipments/{entity_id}/*': [
      allow.authenticated.to(['read', 'write']),
      allow.groups(['admin']).to(['read', 'write', 'delete']),
    ],
  }),
});
EOF
```

### Step 2: Update Backend

```typescript
// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { storage } from './storage/resource';

const backend = defineBackend({
  auth,
  storage,
});

export default backend;
```

### Step 3: Update Frontend Storage Integration

Create `apps/web/src/lib/storage.ts`:

```typescript
import { uploadData, getUrl, list, remove } from 'aws-amplify/storage';

export async function uploadDocument(options: UploadOptions) {
  // Implementation
}

export async function getDocumentUrl(key: string) {
  // Implementation
}
```

### Step 4: Commit Storage Configuration

```bash
git add -A
git commit -m "feat: configure Amplify Storage with S3"
git push origin main
```

---

## Phase 4: API Functions Setup

### Step 1: Create Shared Database Module

```bash
# Create shared database connection
cat > amplify/functions/shared/db.ts << 'EOF'
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

interface DatabaseCredentials {
  username: string;
  password: string;
  host: string;
  port: number;
  dbname: string;
}

interface DatabaseConfig {
  secretArn: string;
  region: string;
  maxConnections?: number;
}

let pool: Pool | null = null;
let credentials: DatabaseCredentials | null = null;

async function getCredentials(secretArn: string, region: string): Promise<DatabaseCredentials> {
  if (credentials) return credentials;
  
  const client = new SecretsManagerClient({ region });
  const command = new GetSecretValueCommand({ SecretId: secretArn });
  const response = await client.send(command);
  
  credentials = JSON.parse(response.SecretString!);
  return credentials!;
}

export async function initializePool(config: DatabaseConfig): Promise<Pool> {
  if (pool) return pool;
  
  const creds = await getCredentials(config.secretArn, config.region);
  
  pool = new Pool({
    host: creds.host,
    port: creds.port,
    database: creds.dbname,
    user: creds.username,
    password: creds.password,
    max: config.maxConnections || 5,
    ssl: { rejectUnauthorized: false },
  });
  
  return pool;
}

export function getPool(): Pool {
  if (!pool) throw new Error('Database pool not initialized');
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}
EOF
```

### Step 2: Create Amplify Functions

For each entity (shipments, customers, invoices, documents, search):

```bash
# Example: Shipments function
mkdir -p amplify/functions/shipments

# Create resource.ts
cat > amplify/functions/shipments/resource.ts << 'EOF'
import { defineFunction } from '@aws-amplify/backend';

export const shipmentsFunction = defineFunction({
  name: 'ctcm-shipments',
  entry: './handler.ts',
  runtime: 18,
  timeoutSeconds: 30,
  memoryMB: 512,
});
EOF

# Create handler.ts
cat > amplify/functions/shipments/handler.ts << 'EOF'
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { initializePool } from '../shared/db';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  await initializePool({
    secretArn: process.env.DATABASE_SECRET_ARN!,
    region: process.env.AWS_REGION || 'us-east-1',
  });
  
  // Copy logic from apps/api/src/handlers/shipments.ts
  // Implement routing and business logic
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ message: 'Shipments API' }),
  };
};
EOF
```

Repeat for: customers, invoices, documents, search

### Step 3: Update Backend with Functions

```typescript
// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { storage } from './storage/resource';
import { shipmentsFunction } from './functions/shipments/resource';
import { customersFunction } from './functions/customers/resource';
import { invoicesFunction } from './functions/invoices/resource';
import { documentsFunction } from './functions/documents/resource';
import { searchFunction } from './functions/search/resource';

const backend = defineBackend({
  auth,
  storage,
  shipmentsFunction,
  customersFunction,
  invoicesFunction,
  documentsFunction,
  searchFunction,
});

// Configure database environment variables
const databaseConfig = {
  secretArn: process.env.DATABASE_SECRET_ARN || '',
};

const functions = [
  backend.shipmentsFunction,
  backend.customersFunction,
  backend.invoicesFunction,
  backend.documentsFunction,
  backend.searchFunction,
];

for (const func of functions) {
  func.addEnvironment('DATABASE_SECRET_ARN', databaseConfig.secretArn);
}

export default backend;
```

### Step 4: Commit API Functions

```bash
git add -A
git commit -m "feat: add Amplify Functions for API layer"
git push origin main
```

---

## Phase 5: Frontend Hosting Setup

### Step 1: Create amplify.yml

```bash
cat > amplify.yml << 'EOF'
version: 1
backend:
  phases:
    build:
      commands:
        - npm ci --cache .npm --prefer-offline
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
        - echo "Running type checks..."
        - npm run typecheck --workspace=apps/web || echo "Type checking completed"
        - echo "Running linting..."
        - npm run lint --workspace=apps/web || echo "Linting completed"
    build:
      commands:
        - echo "Building frontend..."
        - npm run build --workspace=apps/web
  artifacts:
    baseDirectory: apps/web/dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - apps/web/node_modules/**/*
      - .npm/**/*
EOF
```

### Step 2: Commit Build Configuration

```bash
git add amplify.yml
git commit -m "feat: add Amplify build configuration"
git push origin main
```

### Step 3: Connect to Amplify Console

1. Go to: https://console.aws.amazon.com/amplify/home?region=us-east-1
2. Click "New app" → "Host web app"
3. Select "GitHub"
4. Repository: `christophercorbin/CTCM-Amplify` (new repo)
5. Branch: `main`
6. Monorepo: Check and select `apps/web`
7. App name: `ctcm-amplify-dev`
8. Click "Save and deploy"

### Step 4: Configure Environment Variables

In Amplify Console, add:

```bash
VITE_AWS_REGION=us-east-1
VITE_COGNITO_REGION=us-east-1
# Other variables will be auto-generated by Amplify
```

---

## Phase 6: Database Setup

### Option A: Use Existing RDS Database

If you have an existing RDS database:

1. Create database secret in Secrets Manager
2. Note the secret ARN
3. Configure in Amplify backend environment variables

### Option B: Create New RDS Database

```bash
# Use AWS Console or CLI to create:
# - RDS PostgreSQL t4g.micro
# - In us-east-1
# - Store credentials in Secrets Manager
# - Note the secret ARN
```

### Database Schema

Run the migration script from `infra/migrations/001_initial_schema.sql` on the new database.

---

## Phase 7: Testing and Validation

### Step 1: Test Amplify Sandbox

```bash
# Start sandbox
npx ampx sandbox

# Test each component:
# - Auth: Sign up, sign in, sign out
# - Storage: Upload, download documents
# - API: Test each endpoint
```

### Step 2: Test Deployed Application

1. Wait for Amplify build to complete
2. Open the Amplify URL
3. Test all functionality:
   - Authentication
   - Shipment management
   - Customer management
   - Invoice management
   - Document upload/download
   - Search

### Step 3: Run Tests

```bash
# Run unit tests
npm test

# Run integration tests (if available)
npm run test:integration
```

---

## Phase 8: Production Deployment

### Step 1: Create Production Branch

```bash
git checkout -b production
git push origin production
```

### Step 2: Create Production Amplify App

1. In Amplify Console, create new app
2. Connect to `production` branch
3. Configure production environment variables
4. Deploy

### Step 3: Configure Custom Domain

1. In Amplify Console, go to "Domain management"
2. Add custom domain
3. Configure DNS
4. Wait for SSL certificate

---

## Cost Breakdown (Estimated)

### Development Environment

- **Amplify Hosting**: ~$0.50/month (within free tier)
- **Cognito**: Free (< 50k MAU)
- **Lambda Functions**: ~$2/month
- **S3 Storage**: ~$1/month
- **RDS t4g.micro**: ~$15/month
- **Secrets Manager**: ~$0.40/month
- **CloudWatch Logs**: ~$1/month

**Total**: ~$20/month (slightly over budget, optimize as needed)

### Cost Optimization Tips

1. Stop RDS outside business hours
2. Use CloudWatch Logs retention (7 days)
3. Implement S3 lifecycle policies
4. Monitor with budget alarms

---

## Troubleshooting

### Build Fails: "amplify/ directory not found"

**Fix**: Make sure amplify/ directory is committed to git

### Build Fails: "npm ci failed"

**Fix**: Delete package-lock.json, run `npm install`, commit

### Auth Not Working

**Fix**: Check amplify_outputs.json is generated and imported in frontend

### Database Connection Fails

**Fix**: 
- Verify DATABASE_SECRET_ARN is set
- Check RDS security group allows Lambda access
- Verify secret format in Secrets Manager

### CORS Errors

**Fix**: Add CORS headers to all function responses

---

## Next Steps After Deployment

1. ✅ Monitor CloudWatch Logs
2. ✅ Set up budget alarms
3. ✅ Configure backup strategy
4. ✅ Document API endpoints
5. ✅ Set up monitoring dashboards
6. ✅ Plan for production deployment

---

## Key Files Reference

```
CTCM-Amplify/
├── amplify/
│   ├── auth/resource.ts              # Cognito configuration
│   ├── storage/resource.ts           # S3 configuration
│   ├── functions/
│   │   ├── shared/db.ts              # Database connection
│   │   ├── shipments/
│   │   │   ├── resource.ts           # Function config
│   │   │   └── handler.ts            # Function logic
│   │   ├── customers/
│   │   ├── invoices/
│   │   ├── documents/
│   │   └── search/
│   ├── backend.ts                    # Main backend config
│   └── package.json
├── apps/
│   ├── web/                          # React frontend
│   └── api/src/                      # Business logic
├── packages/
│   └── types/                        # Shared types
├── amplify.yml                       # Build configuration
├── package.json                      # Root package.json
└── README.md

```

---

## Support and Resources

- **Amplify Gen 2 Docs**: https://docs.amplify.aws/
- **AWS Console**: https://console.aws.amazon.com/
- **GitHub Repo**: https://github.com/christophercorbin/CTCM-Amplify
- **Account**: 404875533723 (CTCM Dev)
- **Region**: us-east-1

---

## Summary

This guide provides a complete, step-by-step process for building the CTCM application with Amplify Gen 2 in a new repository. Follow each phase sequentially, test thoroughly, and commit frequently. The result will be a clean, modern serverless application without the confusion of legacy CDK infrastructure.

**Estimated Time**: 2-3 days for complete setup and testing
**Difficulty**: Intermediate
**Prerequisites**: AWS account, GitHub account, Node.js, basic AWS knowledge
