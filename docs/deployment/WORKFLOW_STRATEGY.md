# CI/CD Workflow Strategy

## Overview

CTCM uses **AWS Amplify Hosting** for deploys and **GitHub Actions** for quality
gates only. There is no separate CI-driven backend deploy — Amplify Hosting's
GitHub webhook handles both backend (`ampx pipeline-deploy`) and frontend
(`vite build`) via `amplify.yml` in the repo root.

## Architecture

```
                                    GitHub push
                                         │
                  ┌──────────────────────┴──────────────────────┐
                  ▼                                             ▼
      GitHub Actions (CI gates)                Amplify Hosting webhook
      ┌─────────────────────┐                  ┌─────────────────────┐
      │ ci.yml              │                  │ amplify.yml         │
      │   • lint            │                  │   backend phase:    │
      │   • typecheck       │                  │     ampx pipeline-  │
      │                     │                  │     deploy          │
      │ security.yml        │                  │   frontend phase:   │
      │   • CodeQL          │                  │     vite build      │
      │   • Snyk            │                  │                     │
      │   • npm audit       │                  │ → DynamoDB / Cognito│
      └─────────────────────┘                  │ → AppSync / S3      │
                                                │ → CDN              │
                                                └─────────────────────┘
```

**Both run in parallel on every push.** GitHub Actions does not gate Amplify
Hosting by default — see "Gating deploys on green CI" below if you want CI
failures to block the deploy.

## Branch strategy

### `develop` — development environment
- **AWS account:** 404875533723 (CTCM Dev)
- **Amplify App:** `d3fm03a2oiet1x` · branch `develop`
- **URL:** `https://develop.d1yo6c4008x99n.amplifyapp.com`
- **Deploys on:** every push to `develop`
- **CI gates:** `ci.yml` (lint + typecheck), `security.yml` (CodeQL + Snyk on PR)

### `main` — production environment
- **Status:** Connected to Amplify Hosting; production AWS account TBD
- **Deploys on:** every push to `main` (Amplify Hosting webhook)
- **CI gates:** same as develop

## Workflows

### `.github/workflows/ci.yml` — quality gates

**Triggers:** PR + push to `main` or `develop`

**Jobs:**
1. **Lint** — `npm run lint --workspaces --if-present` (currently runs ESLint on `apps/web`; the `amplify/` workspace has no lint script and is silently skipped)
2. **Type Check** — `npm run typecheck --workspaces --if-present`. Stubs `amplify_outputs.json` so the static import in `apps/web/src/lib/amplify.ts` resolves. Covers both `apps/web` and `amplify/` (Lambda TS errors surface here instead of in the slow `pipeline-deploy` step.)

### `.github/workflows/security.yml` — security scans

**Triggers:** PR, weekly Sunday cron, manual dispatch

**Jobs:**
1. **CodeQL Analysis** — matrix over `javascript` and `typescript`. Runs on every PR (catches issues in the diff) plus weekly (catches newly disclosed issues in already-merged code).
2. **Dependency Scan** — `npm audit --audit-level=high` (informational) + Snyk with SARIF upload to GitHub Code Scanning. Snyk requires the `SNYK_TOKEN` repo secret; the SARIF upload step skips silently if the file isn't produced (no token, no scan).

### `amplify.yml` — Amplify Hosting build spec

Lives at the repo root. Two phases:

```yaml
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
    build:
      commands:
        - npm run build --workspace=apps/web
  artifacts:
    baseDirectory: apps/web/dist
    files:
      - '**/*'
```

The backend phase deploys via Amplify Gen 2's CDK pipeline. The frontend phase
builds Vite output and serves it from Amplify's CDN.

## Deploys

### Backend changes (Lambdas, schema, auth, storage)

1. Edit files under `amplify/`
2. Push to `develop`
3. Amplify Hosting picks up the push and runs `amplify.yml`'s backend phase
4. `ampx pipeline-deploy` synthesizes CDK and updates AWS resources
5. New `amplify_outputs.json` is generated and used by the frontend phase

### Frontend-only changes (React app)

1. Edit files under `apps/web/`
2. Push to `develop`
3. Amplify Hosting builds and deploys; backend phase is a no-op if no AWS
   resources changed (still runs but completes quickly)

### Full-stack changes

Same flow — Amplify Hosting handles both phases sequentially in one build.

## Gating deploys on green CI

By default a red CI does **not** block the Amplify Hosting build. To gate
deploys on green CI:

1. Open Amplify Console → your app → **Hosting → Build settings → Branch settings**
2. Find the develop (and main) branch
3. Enable **"Wait for status check to succeed before building"**
4. Pick the `Lint` and `Type Check` checks from `ci.yml`

This setting makes Amplify Hosting wait for those status checks to be green
before starting the backend phase.

## Local development

| Task | Command |
|------|---------|
| Provision sandbox AWS resources | `npx ampx sandbox` (in repo root or `npm run sandbox`) |
| Run frontend dev server | `npm run dev --workspace=apps/web` |
| Tear down sandbox | `npx ampx sandbox delete` |
| Lint everything | `npm run lint` |
| Typecheck everything | `npm run typecheck` |

`ampx sandbox` generates `amplify_outputs.json` at the repo root. This file is
gitignored and is regenerated for each deploy by `pipeline-deploy`.

## Troubleshooting

### Amplify Hosting build fails at backend phase
- Open Amplify Console → app → branch → Build details → click the failing build
- Backend phase logs show CloudFormation events. Most failures here are
  permission errors (missing IAM grant in `backend.ts`) or schema/auth conflicts.

### Frontend builds but app errors at runtime
- Check `amplify_outputs.json` was regenerated — Amplify Console build log
  should show `Successfully wrote .../amplify_outputs.json`
- If the frontend imports a field that no longer exists in the schema,
  typecheck would have caught it in CI. If it didn't, the stub
  `{"version":"1"}` may be hiding the issue.

### CI fails on typecheck for a Lambda file
- Run locally: `cd amplify && npm run typecheck`
- The amplify workspace has no lint script, so ESLint won't catch issues there;
  rely on TS strict mode for now.

### Snyk SARIF upload fails
- The upload step is guarded by `hashFiles('snyk.sarif') != ''` — if the
  Snyk scan didn't run (no `SNYK_TOKEN`), the upload skips silently.
- If `SNYK_TOKEN` is set but upload still fails, check the Snyk job's args
  include `--sarif-file-output=snyk.sarif`.

## Cost notes

Amplify Hosting includes hosting, CDN, SSL, build minutes in a single
unified bill. Typical dev usage runs ~$1–2/month.

## Future enhancements

- Add Vitest + a real `test` script to `apps/web/package.json` (currently
  `npm run test` is a no-op everywhere)
- Add an ESLint config for the `amplify/` workspace so Lambda code gets linted
- Add a `cdk diff`-equivalent step on PRs to preview infrastructure changes
  before merging (catches accidental UserPool replacements, table deletions)
- Add Slack/SNS deploy notifications (Amplify Hosting → App settings → Notifications)

## References

- [AWS Amplify Hosting](https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html)
- [Amplify Gen 2 pipeline-deploy](https://docs.amplify.aws/react/deploy-and-host/fullstack-branching/branch-deployments/)
- [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning)
