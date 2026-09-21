# Amplify Hosting Quick Start

## TL;DR - 5 Minute Setup

### 1. Open Amplify Console
```
https://console.aws.amazon.com/amplify/home?region=us-east-1
```
- Account: 404875533723 (CTCM Dev)
- Region: us-east-1

### 2. Create App
- Click: **New app** → **Host web app**
- Source: **GitHub**
- Repository: **christophercorbin/CTCMweb**
- Branch: **main**
- Monorepo folder: **apps/web** ✓

### 3. App Settings
- Name: **ctcm-dev**
- Environment: **dev**
- Build settings: Auto-detected from `amplify.yml` ✓

### 4. Environment Variables
```bash
VITE_API_URL=<YOUR_API_GATEWAY_ENDPOINT>
VITE_COGNITO_USER_POOL_ID=us-east-1_n8pWlYcSS
VITE_COGNITO_CLIENT_ID=7fotk98fhtt003lf9d1728d49g
VITE_COGNITO_REGION=us-east-1
VITE_AWS_REGION=us-east-1
```

### 5. Deploy
- Click: **Save and deploy**
- Wait: 5-10 minutes
- Test: Open the Amplify URL

## Why Stay in Current Repo?

✅ **Migration Strategy**: CDK and Amplify coexist during transition
✅ **Monorepo Benefits**: Shared types, consistent versioning
✅ **No Conflicts**: `amplify/` and `infra/` are isolated
✅ **Easier Comparison**: Reference old CDK code during migration
✅ **Gradual Removal**: Delete CDK stacks as Amplify takes over

## Repository Structure

```
CTCMweb/
├── amplify/              # Amplify Gen 2 (NEW)
│   ├── auth/
│   ├── storage/
│   ├── functions/
│   └── backend.ts
├── infra/                # CDK (OLD - will be removed)
│   └── lib/stacks/
├── apps/
│   ├── web/             # Frontend (deployed by Amplify)
│   └── api/             # Backend logic (used by Amplify Functions)
└── amplify.yml          # Amplify build config
```

## Migration Path

1. ✅ Phase 1-4: Amplify backend setup (auth, storage, functions)
2. 🔄 Phase 5: Amplify Hosting (current)
3. ⏭️ Phase 6: OCR Pipeline
4. ⏭️ Phase 7-10: Testing and validation
5. ⏭️ Phase 11: Remove CDK infrastructure

## Alternative: Separate Repo (Not Recommended)

If you really want a separate repo:

### Pros:
- Clean slate
- No CDK baggage
- Simpler structure

### Cons:
- ❌ Lose git history
- ❌ Duplicate shared code (types, utils)
- ❌ Can't reference old CDK code
- ❌ More complex migration
- ❌ Two repos to maintain during transition

## Recommendation: Stay in Current Repo

The migration spec was designed for in-place migration. Keep everything in `christophercorbin/CTCMweb` and remove CDK infrastructure in Phase 10 after validation.

## Quick Commands

```bash
# Run the interactive setup guide
./scripts/setup-amplify-hosting.sh

# Check Amplify apps
aws amplify list-apps --region us-east-1

# View build logs (after app is created)
aws amplify list-jobs --app-id <APP_ID> --branch-name main --region us-east-1
```

## Next Steps After Setup

1. ✅ Verify build completes successfully
2. ✅ Test deployed application
3. ✅ Configure custom domain (optional)
4. → Proceed to Phase 6: OCR Pipeline Migration

## Support

- Full guide: `docs/deployment/AMPLIFY_HOSTING_SETUP.md`
- AWS Amplify Docs: https://docs.amplify.aws/
- Troubleshooting: See full guide
