# CTCM — Handoff to Kiro

**Date:** 2026-02-18
**Repo:** `christophercorbin/CTCMweb`
**AWS Account:** 404875533723 · us-east-1
**Monthly budget target:** $15 dev (DynamoDB on-demand + AppSync free tier)

---

## What Was Done

The codebase completed a full Phase 2 → Phase 3 migration. The old architecture
(PostgreSQL RDS + API Gateway + CDK + Supabase) has been torn out and replaced with
**AWS Amplify Gen 2** (AppSync + DynamoDB + Cognito + S3).

### Old architecture (gone)

| What | Where it lived |
|------|---------------|
| CDK stacks (RDS, API Gateway, Lambda) | `infra/` — deleted |
| REST API workspace (handlers/services/repos) | `apps/api/` — deleted |
| Postgres-backed Amplify Lambda functions | `amplify/functions/{customers,shipments,invoices,documents,search}/` — deleted |
| PostgreSQL connection pool | `amplify/functions/shared/db.ts` — deleted |
| Axios REST client layer | `apps/web/src/api/` — deleted |
| Old polling shipments hook | `apps/web/src/hooks/useRealtimeShipments.ts` — deleted |
| Supabase migrations + edge functions | `supabase/` — deleted |
| CDK/Postgres/Supabase shell scripts | `scripts/` — deleted |
| Hardcoded Cognito/API Gateway env vars | `apps/web/.env` — deleted |

### New architecture (in place, not yet deployed)

```
GitHub → Amplify Hosting (CDN)
           │
           ▼
    React + Vite (apps/web)
    Amplify JS SDK v6
           │
    ┌──────┴──────────────────────┐
    │ Cognito    AppSync    S3    │
    │ (auth)   (GraphQL)  (docs) │
    └──────────────┬─────────────┘
                   │
              DynamoDB (6 tables)
                   │
           S3 → Lambda (ocr-trigger)
                   │
           Step Functions (OCR pipeline)
                   │
           Textract → Lambda (ocr-processor)
                   │
           AppSync mutation → DynamoDB
```

---

## Repo Structure (current)

```
CTCMweb/
├── amplify/                          ← Amplify Gen 2 backend
│   ├── backend.ts                    ← Root: wires all resources + CDK OCR pipeline
│   ├── auth/resource.ts              ← Cognito: email login, MFA optional, post-confirm trigger
│   ├── data/resource.ts              ← AppSync schema: 6 models, 5 enums
│   ├── storage/resource.ts           ← S3: owner-isolated paths, versioned
│   ├── package.json                  ← Amplify + AWS SDK deps
│   └── functions/
│       ├── post-confirmation/        ← Adds user to 'customer' group, creates Customer record
│       ├── ocr-trigger/              ← S3 event → starts Step Functions execution
│       └── ocr-processor/           ← START / CHECK / PERSIST via Textract + AppSync
│
├── apps/web/                         ← React + Vite frontend
│   └── src/
│       ├── lib/amplify.ts            ← Amplify.configure(amplify_outputs.json)
│       ├── lib/cognito.ts            ← Auth helpers (native aws-amplify/auth)
│       ├── hooks/useShipments.ts     ← AppSync observeQuery + real-time subscriptions
│       ├── auth/useAuthRedirect.ts   ← Group-based redirect after login
│       ├── contexts/AuthContext.tsx  ← Auth state provider
│       ├── routes/ProtectedRoute.tsx ← Group-based admin guard
│       └── pages/                   ← Core pages migrated to Amplify Data client
│
├── .github/workflows/
│   ├── ci.yml                        ← Node 20, lint + typecheck (PR + push)
│   └── security.yml                  ← CodeQL + Snyk + npm audit (PR + Sunday cron)
│
└── amplify.yml                       ← Amplify Hosting build spec — backend phase
                                        runs `ampx pipeline-deploy`, frontend phase
                                        runs `vite build`. Webhook-driven, no GHA
                                        deploy job (was: deploy-dev.yml/deploy-prod.yml,
                                        removed since they only duplicated CI).
```

---

## Data Models (DynamoDB via AppSync)

| Model | Key fields | Auth |
|-------|-----------|------|
| `Customer` | name, email, cognitoSub | owner + admin |
| `Shipment` | trackingNumber, status, type (AIR/SEA), customerId | owner + admin |
| `Package` | shipmentId, weight, packageType, ocrRawText, ocrConfidence | owner + admin |
| `ShipmentCharge` | shipmentId, chargeType, amount | owner + admin |
| `ShipmentEvent` | shipmentId, status, eventTimestamp, location | owner + admin |
| `Invoice` | customerId, shipmentId, invoiceNumber, totalAmount, s3Key | owner + admin |

**Tenant isolation:** Every record carries Amplify's auto-populated `owner` field (Cognito sub).
AppSync VTL injects `#eq owner :identity` on every customer query — no data escapes to other tenants.
The `admin` Cognito group bypasses this filter entirely.

**Shipment statuses:** `PENDING | IN_TRANSIT | CUSTOMS | DELIVERED | CANCELLED | RETURNED`

**S3 paths:**
```
receipts/{cognitoSub}/      ← OCR intake (admin uploads)
invoices/{cognitoSub}/      ← Invoice PDFs (admin writes, customer reads)
documents/{cognitoSub}/     ← General docs (customer read/write)
shipments/{cognitoSub}/     ← Attachments (admin writes, customer reads)
```

---

## Deployment Checklist

### Prerequisites (one-time)

- [ ] Node 20+ installed (`node --version`)
- [ ] AWS CLI configured for account 404875533723
- [ ] Amplify CLI available (`npx ampx --version`)
- [ ] Access to GitHub repo and AWS Amplify Console

---

### Step 1 — Install dependencies

```bash
cd /Users/christophercorbin/Ctcmweb/CTCMweb
npm install
```

---

### Step 2 — Run the sandbox (provisions all AWS resources)

```bash
npx ampx sandbox --identifier ctcm-dev
```

This is the **most important step**. It creates:
- All DynamoDB tables
- AppSync API + auto-generated resolvers
- Cognito user pool with `admin` and `customer` groups
- Three Lambda functions (post-confirmation, ocr-trigger, ocr-processor)
- Step Functions OCR state machine
- S3 bucket + event notification to ocr-trigger
- **`amplify_outputs.json`** at the project root — the frontend cannot build without this

First run takes ~5–10 minutes. Wait for the `✅ Deployed` message.

> **Do not commit `amplify_outputs.json`** — it is gitignored and is regenerated by
> `ampx pipeline-deploy` on every CI deploy.

---

### Step 3 — Test locally

```bash
npm run dev --workspace=apps/web
```

| Smoke test | Expected result |
|-----------|----------------|
| Register new account | User in Cognito, `customer` group assigned, Customer record in DynamoDB |
| Login as customer | Redirected to `/dashboard`, shipments list loads |
| Login as admin | Redirected to `/admin/dashboard` |
| Admin creates shipment | Record in DynamoDB, customer sees it in real-time via subscription |
| Admin updates status | Customer dashboard updates in <1s (AppSync subscription) |
| Upload file to `receipts/` | Step Functions execution visible in AWS console |
| Customer downloads invoice | Presigned URL works; different customer gets 403 |

---

### Step 4 — Create the first admin user

Admin accounts are provisioned manually — they cannot self-register.

```bash
# Get the User Pool ID from amplify_outputs.json
USER_POOL_ID=$(cat amplify_outputs.json | python3 -c \
  "import sys,json; print(json.load(sys.stdin)['auth']['user_pool_id'])")

# Create the admin user
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username admin@ctcm.com \
  --temporary-password 'Temp#1234' \
  --user-attributes Name=email,Value=admin@ctcm.com Name=email_verified,Value=true \
  --region us-east-1

# Add to the admin group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username admin@ctcm.com \
  --group-name admin \
  --region us-east-1
```

The user will be prompted to set a permanent password on first login.

---

### Step 5 — Add GitHub Secrets (optional)

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Used by | What happens without it |
|--------|---------|-------------------------|
| `SNYK_TOKEN` | `security.yml` Snyk job | Snyk skips silently; CodeQL still runs |

`AMPLIFY_APP_ID` is no longer needed — it was used by the removed
`deploy-dev.yml` / `deploy-prod.yml` workflows. Amplify Hosting's webhook
provides `AWS_APP_ID` automatically inside the `amplify.yml` build environment.

---

### Step 6 — Connect Amplify Hosting (if not already done)

1. Open the [Amplify Console](https://console.aws.amazon.com/amplify/home?region=us-east-1)
2. Select the CTCM app → **Hosting → Connect branch**
3. Connect `develop` (dev) and `main` (prod)
4. Set build spec source to **"use amplify.yml from repository"** (already in repo root)
5. Confirm the backend environment is linked to the branch

---

### Step 7 — Push to `develop`

```bash
git add -A
git commit -m "feat: Amplify Gen 2 — replace Postgres/CDK/Supabase with AppSync/DynamoDB"
git push origin develop
```

Two things run in parallel:

1. **GitHub Actions** runs `ci.yml` (lint + typecheck) and `security.yml`
   (CodeQL on PR — push doesn't trigger CodeQL by default).
2. **Amplify Hosting** detects the push via webhook and runs `amplify.yml`:
   - Backend phase: `npx ampx pipeline-deploy --branch develop --app-id $AWS_APP_ID` — deploys CDK stacks, regenerates `amplify_outputs.json`
   - Frontend phase: `npm run build --workspace=apps/web` — Vite build, deployed to CDN

To make CI failures block the Amplify build, configure
"Wait for status check to succeed" in Amplify Console → Hosting → Branch settings.

---

### Step 8 — Production deploy

When ready, merge `develop` → `main`. Amplify Hosting deploys `main` to the
production environment via the same webhook + `amplify.yml` flow. Add a manual
approval gate in Amplify Console → Hosting → Branch settings if you want one
(there is no GitHub Actions deploy workflow to gate against anymore).

---

## Known Issues / Watch Points

### `amplify_outputs.json` must exist before the frontend builds
Generated by `ampx sandbox` locally or by `ampx pipeline-deploy` in CI.
If the build fails with `Cannot find module 'amplify_outputs.json'`, the backend deploy
step did not complete — check the pipeline logs.

### Admin-created Shipments need an explicit `owner`
When an admin creates a Shipment on behalf of a customer, they must pass the customer's
Cognito sub as `owner` so the customer can read it through the owner auth rule:
```typescript
await client.models.Shipment.create({
  trackingNumber: '...',
  // ... other fields ...
  owner: customerCognitoSub,   // ← required for customer visibility
})
```

### Post-confirmation Lambda — watch CloudWatch Logs
If new users don't appear in the `customer` group or if the Customer DynamoDB record
isn't created, check:
```bash
aws logs tail /aws/lambda/ctcm-post-confirmation --follow --region us-east-1
```
The most likely cause is a misconfigured AppSync endpoint env var — verify
`GRAPHQL_API_ENDPOINT` is set on the Lambda (done automatically by `backend.ts`).

### Textract async latency
Textract jobs take 15–60 seconds. The Step Functions Wait state loops every 15s with a
10-minute overall timeout. Monitor executions in the Step Functions console.

### OCR Package records have no Shipment link on creation
The `ocr-processor` PERSIST step creates a bare `Package` record (no `shipmentId`).
The admin is expected to link it to a shipment via the UI. The `PendingPackages` page
is intended for this workflow but is not yet fully built (see below).

---

## Pages Not Yet Migrated to Amplify Data

These pages still use mock data or stub implementations — next sprint of work:

| Page | File | Needed |
|------|------|--------|
| Customer Management | `components/CustomerManagement.tsx` | `client.models.Customer.list()` |
| Pending Packages | `pages/PendingPackages.tsx` | `client.models.Package.list()` + link to Shipment |
| Invoices | `pages/Invoices.tsx` | `client.models.Invoice.list()` |
| Customer Info | `pages/CustomerInfo.tsx` | `client.models.Customer.get()` |
| Warehouse Receipt Intake | `pages/WarehouseReceiptIntake.tsx` | `uploadData()` to `receipts/` path |

All use the same pattern as the migrated pages — `generateClient<Schema>()` from `aws-amplify/data`.

---

## Environment Variables Reference

### Frontend (`apps/web/`)

**None required.** All config is read from `amplify_outputs.json` at runtime via
`apps/web/src/lib/amplify.ts`. The old `VITE_API_URL`, `VITE_COGNITO_*`, `VITE_STORAGE_BUCKET`
vars have been removed.

### Backend Lambda functions

All env vars are injected automatically by `amplify/backend.ts` at deploy time:

| Function | Env var | Injected from |
|----------|---------|--------------|
| `post-confirmation` | `GRAPHQL_API_ENDPOINT` | `backend.data.resources.graphqlApi.graphqlUrl` |
| `ocr-trigger` | `STATE_MACHINE_ARN` | `ocrStateMachine.stateMachineArn` |
| `ocr-processor` | `GRAPHQL_API_ENDPOINT` | `backend.data.resources.graphqlApi.graphqlUrl` |

No `.env` files need to be created for Lambda functions.

---

## IAM / Security Notes

- **GitHub Actions** authenticates via OIDC — no long-lived AWS keys in secrets
- **Lambda functions** sign AppSync requests with IAM SigV4 (`fromEnv()` reads the Lambda execution role credentials automatically)
- **Customer data isolation** is enforced in AppSync VTL resolvers, not in application code — it cannot be bypassed from the frontend
- **MFA** is `OPTIONAL` in the Cognito config — enforce `REQUIRED` for admin accounts via the Cognito console or update `amplify/auth/resource.ts` to `mode: "REQUIRED"` before production

---

## Useful Commands

```bash
# Start local sandbox (provisions + hot-reloads backend changes)
npx ampx sandbox --identifier ctcm-dev

# Tear down the sandbox when done
npx ampx sandbox delete --identifier ctcm-dev

# Regenerate amplify_outputs.json after a pipeline deploy
npx ampx generate outputs --branch develop --app-id <AMPLIFY_APP_ID>

# Run frontend dev server
npm run dev --workspace=apps/web

# Typecheck everything
npm run typecheck

# Tail Lambda logs
aws logs tail /aws/lambda/ctcm-post-confirmation --follow --region us-east-1
aws logs tail /aws/lambda/ctcm-ocr-trigger --follow --region us-east-1
aws logs tail /aws/lambda/ctcm-ocr-processor --follow --region us-east-1
```

---

## Key File Locations Quick Reference

| What you need | File |
|---------------|------|
| AppSync schema (all models + auth rules) | `amplify/data/resource.ts` |
| Backend wiring + CDK OCR pipeline | `amplify/backend.ts` |
| Cognito config + post-confirm trigger | `amplify/auth/resource.ts` |
| S3 access rules | `amplify/storage/resource.ts` |
| Amplify client init | `apps/web/src/lib/amplify.ts` |
| Shipments hook (real-time) | `apps/web/src/hooks/useShipments.ts` |
| Auth helpers | `apps/web/src/lib/cognito.ts` |
| Auth context | `apps/web/src/contexts/AuthContext.tsx` |
| Admin route guard | `apps/web/src/routes/ProtectedRoute.tsx` |
| CI pipeline (lint + typecheck) | `.github/workflows/ci.yml` |
| Security scans (CodeQL + Snyk) | `.github/workflows/security.yml` |
| Amplify Hosting build spec (where deploys happen) | `amplify.yml` |
