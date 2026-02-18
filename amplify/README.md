# CTCM Amplify Gen 2 Backend

This directory contains the AWS Amplify Gen 2 backend configuration for the CTCM freight forwarding application.

## Directory Structure

```
amplify/
├── auth/           # Authentication resources (Cognito User Pool)
├── data/           # Data resources (database connection or AppSync schema)
├── storage/        # Storage resources (S3 bucket configuration)
├── functions/      # Lambda function definitions
├── backend.ts      # Main backend definition
├── package.json    # Amplify dependencies
└── tsconfig.json   # TypeScript configuration
```

## Migration Phases

The backend resources will be added incrementally during the migration:

- **Phase 1** (Current): Project initialization ✓
- **Phase 2**: Authentication migration (auth/)
- **Phase 3**: Storage migration (storage/)
- **Phase 4**: API migration (functions/)
- **Phase 5**: Frontend hosting migration
- **Phase 6**: OCR pipeline migration

## Development

### Local Development with Sandbox

```bash
cd amplify
npm install
npm run sandbox
```

The sandbox creates a personal cloud environment for testing changes before deployment.

### Deployment

```bash
cd amplify
npm run deploy
```

Deploys the backend to the configured AWS environment.

## Environment Configuration

The backend is configured for the CTCM Dev account:
- **Account ID**: 404875533723
- **Region**: us-east-1
- **Environment**: dev

## Resources

- [Amplify Gen 2 Documentation](https://docs.amplify.aws/)
- [Migration Design Document](../.kiro/specs/amplify-gen2-migration/design.md)
- [Migration Requirements](../.kiro/specs/amplify-gen2-migration/requirements.md)
