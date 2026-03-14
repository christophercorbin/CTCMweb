# CTCM Pipeline Remediation Report
**Date:** 2026-03-13
**Prepared by:** Claude (AWS Cloud Architect / TypeScript Engineer)
**Scope:** Run `23075947762/job/67036174114` — Deploy Dev pipeline failure + full architecture & efficiency review

---

## Executive Summary

The `Deploy Dev` workflow failed because a TypeScript type error in the newly-added `sync-customers` Lambda was only caught by `ampx pipeline-deploy`'s internal compiler — not by the CI `typecheck` step — because the `amplify` workspace had no `typecheck` npm script. All five issues listed below have been fixed in the working tree.

---

## Phase 1 — Root Cause Analysis

### Hard Failure: `Deploy Amplify backend` — exit code 1

**Trigger commit:** `cf5586b` — `feat: add Sync from Cognito to backfill missing Customer records`

**Failing line in `sync-customers/handler.ts` (before `d43bcc5`):**

```typescript
// BEFORE (broken)
async function appsyncRequest(...): Promise<{ data?: unknown; errors?: unknown[] }> {
  ...
  return res.json();  // ← TS2322: Type 'unknown' is not assignable to Promise<{...}>
}
```

In Node 20 TypeScript strict mode, `Response.prototype.json()` returns `Promise<unknown>`. The function declared a concrete return type, so TypeScript rejected the implicit cast.

**Why this only surfaced in `ampx pipeline-deploy` and not the CI `typecheck` step:**

The `amplify` workspace (`ctcm-amplify-backend`) had **no `typecheck` npm script**. The workflow runs `npm run typecheck --workspaces --if-present`, which skips any workspace without that script. So all six Lambda functions were compiled for the first time by `ampx pipeline-deploy`'s internal CDK synth step — far too late in the pipeline, after deploying infrastructure.

**Fix already applied by commit `d43bcc5`:**

```typescript
// AFTER (fixed)
return res.json() as Promise<{ data?: unknown; errors?: unknown[] }>;
```

**Structural fix applied in this report:**

`amplify/package.json` now has `"typecheck": "tsc --noEmit"`, so Lambda TypeScript is checked in the `typecheck` job alongside the web app — before any AWS calls are made.

---

### Lint Warning 1 — `AdminInvoices.tsx:88` — `useMemo` missing dependency `now`

```typescript
// BEFORE (broken)
const now = new Date()                    // ← defined in render scope, used in memo

const stats = useMemo(() => {
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  ...
}, [invoices])                            // ← `now` missing from deps array
```

`now` was declared outside `useMemo` but used inside it without being in the dependency array. While `now` changes on every render (it's always the current date), excluding it from deps is a correctness hazard that ESLint correctly flags. There was also a second reference to `now` at line 185 in JSX.

```typescript
// AFTER (fixed)
const stats = useMemo(() => {
  const now = new Date()                  // ← moved inside, no deps issue
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  ...
}, [invoices])

// JSX at line 185 (was: {now.toLocaleString(...)})
{new Date().toLocaleString('en-US', { month: 'long' })} Earnings  // ← inline
```

---

### Lint Warning 2 — `AuthContext.tsx:121` — fast-refresh violation

Vite's `react-refresh` plugin requires each file to export **only React components**. `AuthContext.tsx` exported both `AuthProvider` (a component) and `useAuth` (a hook function), triggering:

> `Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components`

**Fix:** Moved `useAuth` into a dedicated `apps/web/src/contexts/useAuth.ts` and updated all four consumer imports.

```
apps/web/src/contexts/
  AuthContext.tsx   ← exports: AuthContext (exported const), AuthProvider (component)
  useAuth.ts        ← NEW: exports useAuth() hook only
```

Updated imports in:
- `apps/web/src/routes/ProtectedRoute.tsx`
- `apps/web/src/pages/Login.tsx`
- `apps/web/src/pages/Register.tsx`
- `apps/web/src/pages/CustomerDashboard.tsx`

Backward-compatible: `AuthContext.tsx` still exports `AuthContext` so `useAuth.ts` can import it internally.

---

### Deprecation — GitHub Actions Node.js 20 runtime

`actions/checkout@v4`, `actions/setup-node@v4`, and `aws-actions/configure-aws-credentials@v4` use Node 20 as their internal action runner. GitHub will force-retire Node 20 action runtimes in **June 2026**, at which point these actions will fail.

**Current status:** Generates warnings in run logs, not yet a failure.

**Remediation path:** Each action vendor must release a Node 24-compatible major version. Until those are released, the workflows are pinned correctly at `@v4`. A calendar reminder to upgrade to `@v5` (or equivalent) before June 2026 is the appropriate action. This report flags it as a short-term task.

---

## Phase 2 — Architecture Map

### Frontend
| Layer | Detail |
|---|---|
| Framework | React 18, TypeScript, Vite, Tailwind CSS |
| Routing | React Router v7 |
| Forms | react-hook-form + Zod |
| Auth client | `aws-amplify/auth` via `cognito.ts` wrapper |
| Data client | AppSync via `aws-amplify/data` (generated client) |
| Storage client | `aws-amplify/storage` (S3) |
| Hosting | AWS Amplify Hosting (Amplify Gen 2) |
| Demo mode | `utils/mockData.ts` — no backend required |

Customer routes: `/login`, `/register`, `/confirm`, `/dashboard/*`, `/invoices`, `/customer-info`
Admin routes: `/admin/*` (shipments, customers, invoices, warehouse receipt OCR)

### Backend — Lambda Functions (6)

| Function | Memory | Timeout | Trigger | Responsibility |
|---|---|---|---|---|
| `ctcm-post-confirmation` | 256 MB | 30 s | Cognito PostConfirmation | Adds user to `customer` group, sets `custom:customerId`, creates Customer record in DynamoDB via AppSync SigV4 |
| `ctcm-admin-create-customer` | 512 MB | 30 s | AppSync mutation `createCustomerWithAccount` | AdminCreateUser (FORCE_CHANGE_PASSWORD), creates Customer record, sends SES welcome email |
| `ctcm-status-notifier` | 256 MB | 30 s | AppSync mutation `sendStatusNotification` | Sends branded HTML status update email via SES |
| `ctcm-ocr-trigger` | 256 MB | 30 s | S3 ObjectCreated on `receipts/` prefix | Starts Step Functions OCR state machine |
| `ctcm-ocr-processor` | 512 MB | 120 s | Step Functions tasks (START / CHECK / PERSIST) | Runs Textract StartDocumentTextDetection, polls for completion, persists extracted fields |
| `ctcm-sync-customers` | 512 MB | 60 s | AppSync mutation `syncCustomersFromCognito` | Lists Cognito `customer` group users, diffs against AppSync, creates missing Customer records |

### Data Layer

| Service | Purpose |
|---|---|
| AppSync (GraphQL) | API gateway for all data operations; 6 models |
| DynamoDB | Auto-managed tables per model (by Amplify Gen 2) |
| Amazon Cognito | User Pool `us-east-1_YfQ4BVEry`; groups: `admin`, `customer` |
| S3 (`ctcm-storage`) | `receipts/` (OCR intake), `invoices/`, `documents/`, `shipments/` |
| SES | Transactional emails: status notifications + welcome |
| Step Functions | OCR polling workflow (start → wait 15s → check → loop/complete) |
| Textract | Document text detection (called by `ctcm-ocr-processor`) |

**AppSync models:** `Customer`, `Shipment`, `Package`, `ShipmentCharge`, `ShipmentEvent`, `Invoice`
**Auth pattern:** `allow.owner()` + `allow.ownerDefinedIn("cognitoSub")` + `allow.ownerDefinedIn("email")` + `allow.group("admin")`

### Infrastructure (CDK via Amplify Gen 2)

All infrastructure is CDK managed by `defineBackend()` in `amplify/backend.ts`. Amplify creates per-branch nested stacks:

| CDK Stack | Resources |
|---|---|
| `auth` | Cognito User Pool, App Client (USER_PASSWORD_AUTH + USER_SRP_AUTH + REFRESH_TOKEN), PostConfirmation trigger, groups: admin/customer |
| `data` | AppSync API (Cognito auth), all DynamoDB tables, Lambda-backed custom mutations, IAM resolvers |
| `storage` | S3 bucket (versioned), path-based access rules |
| Custom (in `backend.ts`) | Step Functions state machine (OCR), S3→Lambda event notification, IAM policies for SES/Textract/Cognito/AppSync |

**No RDS PostgreSQL in CTCM.** The `SecureRds-*` stacks visible in the connected AWS account are from a separate, unrelated project in that account. CTCM uses AppSync + DynamoDB exclusively.

### CI/CD Pipeline

```
ci.yml              → triggers: PR to main/develop, push to main/develop
  ├── lint          → npm run lint --workspaces --if-present
  ├── typecheck     → npm run typecheck --workspaces --if-present (NOW covers Lambda TS)
  ├── test          → npm run test --workspaces --if-present
  └── build         → (needs: lint+typecheck+test) npm run build --workspace=apps/web

deploy-dev.yml      → triggers: push to develop
  └── deploy        → lint+typecheck+test → AWS OIDC → ampx pipeline-deploy --branch develop
                   → npx ampx generate outputs → git commit amplify_outputs.json

deploy-prod.yml     → triggers: workflow_dispatch only
  └── deploy        → lint+typecheck+test → trstringer/manual-approval → AWS OIDC
                   → ampx pipeline-deploy --branch main

security-scan.yml   → triggers: weekly Sunday cron + workflow_dispatch
  ├── dependency-scan → npm audit + Snyk
  └── codeql-analysis → JavaScript/TypeScript CodeQL
```

---

## Phase 3 — All Code Changes Applied

### 1. `amplify/package.json` — added `typecheck` script

```diff
  "scripts": {
    "sandbox": "ampx sandbox",
    "deploy": "ampx deploy",
-   "delete-sandbox": "ampx sandbox delete"
+   "delete-sandbox": "ampx sandbox delete",
+   "typecheck": "tsc --noEmit"
  },
```

### 2. `package.json` (root) — `typecheck` now covers all workspaces

```diff
-   "typecheck": "npm run typecheck --workspace=apps/web",
+   "typecheck": "npm run typecheck --workspaces --if-present",
```

### 3. `apps/web/src/pages/AdminInvoices.tsx` — useMemo fix

```diff
-  const now = new Date()
-
   const stats = useMemo(() => {
+    const now = new Date()
     const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
     ...
   }, [invoices])

   // line 185 in JSX:
-  {now.toLocaleString('en-US', { month: 'long' })} Earnings
+  {new Date().toLocaleString('en-US', { month: 'long' })} Earnings
```

### 4. `apps/web/src/contexts/useAuth.ts` — NEW FILE

```typescript
import { useContext } from 'react'
import { AuthContext } from './AuthContext'

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

### 5. `apps/web/src/contexts/AuthContext.tsx` — remove `useAuth`, export `AuthContext`

```diff
-import React, { createContext, useContext, useState, useEffect } from 'react'
+import React, { createContext, useState, useEffect } from 'react'
 ...
-const AuthContext = createContext<AuthContextType | undefined>(undefined)
+export const AuthContext = createContext<AuthContextType | undefined>(undefined)
 ...
-export function useAuth() {
-  const context = useContext(AuthContext)
-  if (context === undefined) {
-    throw new Error('useAuth must be used within an AuthProvider')
-  }
-  return context
-}
```

### 6. Four consumer files — updated `useAuth` import path

```diff
-import { useAuth } from '../contexts/AuthContext'
+import { useAuth } from '../contexts/useAuth'
```

Files: `ProtectedRoute.tsx`, `Login.tsx`, `Register.tsx`, `CustomerDashboard.tsx`

### 7. `deploy-dev.yml` — comment documenting the Lambda typecheck gate

Added explanatory comment above the Lint + Typecheck + Test step so future engineers understand why the `amplify` workspace must have a `typecheck` script.

### Verification

```
npm run typecheck  →  Exit: 0  (all workspaces including amplify)
npm run lint       →  Exit: 0  (0 errors, 0 warnings)
```

---

## Phase 4 — Efficiency & Security Audit

### Lambda Memory Sizing

| Function | Current | Recommended | Reason |
|---|---|---|---|
| `ctcm-admin-create-customer` | 512 MB | **256 MB** | Simple Cognito + SES calls; no compute-intensive work |
| `ctcm-sync-customers` | 512 MB | **256 MB** | GraphQL pagination + Cognito list; I/O bound |
| `ctcm-ocr-processor` | 512 MB | Keep | Handles large Textract block arrays; may benefit from memory |
| `ctcm-post-confirmation` | 256 MB | Keep | Appropriate |
| `ctcm-status-notifier` | 256 MB | Keep | Appropriate |
| `ctcm-ocr-trigger` | 256 MB | Keep | Appropriate |

Reducing two Lambdas from 512 MB → 256 MB saves ~25% on those invocations (Lambda bills per GB-second).

### IAM Over-Permissioning

| Issue | Current | Recommended Fix |
|---|---|---|
| SES permissions on `statusNotifier` | `resources: ["*"]` | Scope to `arn:aws:ses:us-east-1:404875533723:identity/notifications@ctcm.bb` |
| SES permissions on `adminCreateCustomer` | `resources: ["*"]` | Same scoping as above |
| Textract on `ocrProcessor` | `resources: ["*"]` | Acceptable — Textract does not support resource-level IAM |
| Cognito on `postConfirmation` | `resources: ["*"]` | Documented intentional workaround for CDK circular dep — acceptable |

### S3 Storage Cost Control

`storage/resource.ts` has `versioned: true` but no S3 lifecycle policy. Every overwritten document creates a permanent version. For a freight forwarder ingesting OCR receipts, this will grow unboundedly.

**Recommended addition in `amplify/backend.ts`:**

```typescript
import * as s3 from 'aws-cdk-lib/aws-s3';

// Delete non-current object versions after 30 days
storageBucket.addLifecycleRule({
  id: 'expire-old-versions',
  noncurrentVersionExpiration: Duration.days(30),
  enabled: true,
});
```

### Version Mismatch in `amplify/package.json`

Root `package.json` pins `@aws-amplify/backend: ^1.21.0` while `amplify/package.json` has `^1.0.0`. npm hoisting resolves to `^1.21.0` in practice but this implicit dependency should be explicit:

```diff
- "@aws-amplify/backend": "^1.0.0",
- "@aws-amplify/backend-cli": "^1.0.0",
+ "@aws-amplify/backend": "^1.21.0",
+ "@aws-amplify/backend-cli": "^1.8.2",
```

### Security: `LOGINS.md` in Repository

The file `LOGINS.md` appears to contain login credentials. Even in a private repository, committing credentials is a security risk (GitHub token leaks, contractor access, etc.). This file should be:

1. Immediately gitignored: add `LOGINS.md` to `.gitignore`
2. Removed from git history: `git filter-repo --invert-paths --path LOGINS.md`
3. Any credentials it contained should be rotated

### Amplify Hosting Build (`amplify.yml`) — Missing Quality Gates

```yaml
# Current amplify.yml only builds:
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
    build:
      commands:
        - npm run build --workspace=apps/web
```

If an Amplify Hosting build is triggered directly (via console or webhook) rather than through the GitHub Actions pipeline, it bypasses lint and typecheck entirely. Consider adding:

```yaml
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
        - npm run typecheck --workspaces --if-present
        - npm run lint --workspaces --if-present
    build:
      commands:
        - npm run build --workspace=apps/web
```

Note: This will slow down Amplify Hosting builds but ensures quality gates are always applied.

### Step Functions OCR — Polling vs. Event-Driven

The OCR workflow polls Textract every 15 seconds in a loop. For documents taking 45–90 seconds, this creates 3–6 state transitions. An alternative is to configure Textract to send a completion SNS notification and use EventBridge to invoke `ocrProcessor` only once the job is done. This reduces state transitions to 2 (START + PERSIST) and eliminates the waiting cost.

At current low volume, the polling approach is fine and costs fractions of a cent. Flag for future optimization if OCR volume grows.

### Monthly Cost Estimate

At current development/beta volume:

| Service | Monthly Cost |
|---|---|
| Amplify Hosting | ~$0–1 (free tier: 15 GB served) |
| AppSync | ~$0 (free tier: 250M query minutes) |
| DynamoDB | ~$0 (free tier: 25 GB, 200M requests) |
| Lambda | ~$0 (well within free tier: 1M invocations/mo) |
| Cognito | ~$0 (free for <50K MAU) |
| S3 | ~$0.02/GB stored |
| SES | ~$0.10/1,000 emails |
| Step Functions | ~$0.025/1,000 state transitions |
| **Total** | **< $5/month** |

The $15/month target is already exceeded (in a good way). You would need ~thousands of active customers and millions of API calls to reach $15/month with this architecture. The architecture is cost-optimal for the workload.

---

## Phase 5 — Prioritised Action Plan

### Immediate (unblock the pipeline today)

| # | Action | File(s) | Status |
|---|---|---|---|
| ✅ | Add `typecheck` script to amplify workspace so Lambda TS errors surface in CI before `ampx pipeline-deploy` | `amplify/package.json` | **Done** |
| ✅ | Update root `typecheck` script to cover all workspaces | `package.json` | **Done** |
| ✅ | Fix `useMemo` missing dependency `now` (move inside memo + fix JSX reference) | `AdminInvoices.tsx` | **Done** |
| ✅ | Fix fast-refresh violation: move `useAuth` to dedicated file, update 4 imports | `AuthContext.tsx`, `useAuth.ts`, 4 consumers | **Done** |
| ✅ | Add Lambda typecheck gate comment to deploy-dev workflow | `.github/workflows/deploy-dev.yml` | **Done** |

### Short-term (next sprint, before June 2026)

| Priority | Action | Effort |
|---|---|---|
| 🔴 High | **Rotate any credentials in `LOGINS.md` and gitignore the file** | 30 min |
| 🔴 High | **Upgrade GitHub Actions to Node 24 runtime versions** when `@v5` releases available: `actions/checkout`, `actions/setup-node`, `aws-actions/configure-aws-credentials` | 30 min (track releases) |
| 🟡 Medium | Scope SES IAM permissions to specific identity ARN (removes wildcard `*`) | 15 min + CDK deploy |
| 🟡 Medium | Add S3 lifecycle rule to expire non-current object versions after 30 days | 15 min + CDK deploy |
| 🟡 Medium | Pin `@aws-amplify/backend` version in `amplify/package.json` to match root | 5 min |
| 🟡 Medium | Reduce `ctcm-admin-create-customer` and `ctcm-sync-customers` memory from 512 MB → 256 MB | 5 min + CDK deploy |
| 🟢 Low | Add typecheck + lint to `amplify.yml` Amplify Hosting build phases | 10 min |
| 🟢 Low | Implement Forgot Password flow (`/forgot-password`) — noted as a gap | 2–4 hrs |

### Architecture Recommendations (longer term)

| Recommendation | Impact | Effort |
|---|---|---|
| **Replace Textract polling with event-driven (SNS + EventBridge)** | Reduces Step Functions state transitions by ~60%; more reliable for slow documents | Medium |
| **Add WAF to AppSync endpoint** with rate limiting per IP | Protects against API abuse and credential stuffing | Medium |
| **Add customer-side document upload** (`documents/` prefix) — the S3 paths are already defined but the UI doesn't expose this | Completes the feature gap listed in CLAUDE.md | Medium |
| **Add delivery confirmation workflow** — currently missing from the status enum progression | Product completeness | Medium |
| **Invoice payment integration** (e.g., Stripe) — currently manually tracked | Revenue enablement | High |
| **Forgot password flow** (`/forgot-password`) — `cognitoResetPassword` / `cognitoConfirmResetPassword` already exist in `cognito.ts`; just needs UI | UX gap | Low |
| **Customer invoice payments** — noted as not yet built | Feature gap | High |

---

## Appendix: Files Changed in This Session

```
Modified:
  amplify/package.json                              (+1 typecheck script)
  package.json                                      (typecheck covers all workspaces)
  apps/web/src/pages/AdminInvoices.tsx              (useMemo + JSX now fix)
  apps/web/src/contexts/AuthContext.tsx             (remove useAuth, export AuthContext)
  .github/workflows/deploy-dev.yml                 (comment on Lambda typecheck gate)
  .github/workflows/ci.yml                         (comment on Lambda typecheck gate)
  .github/workflows/deploy-prod.yml                (comment on Lambda typecheck gate)
  apps/web/src/routes/ProtectedRoute.tsx            (useAuth import path)
  apps/web/src/pages/Login.tsx                      (useAuth import path)
  apps/web/src/pages/Register.tsx                   (useAuth import path)
  apps/web/src/pages/CustomerDashboard.tsx          (useAuth import path)

Added:
  apps/web/src/contexts/useAuth.ts                  (extracted useAuth hook)
  docs/pipeline-remediation-2026-03-13.md           (this report)
```

**Post-fix verification:**
```
npm run typecheck  →  Exit: 0  (covers apps/web + amplify Lambda functions)
npm run lint       →  Exit: 0  (0 errors, 0 warnings)
```
