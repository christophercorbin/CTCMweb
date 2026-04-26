# Pre-Deployment Checklist

What to verify before pushing changes that should deploy. Deploys run on the
Amplify Hosting webhook — there is no GitHub Actions deploy job. GitHub Actions
runs CI gates (`ci.yml`) and security scans (`security.yml`) only.

## ✅ One-time setup (already done — listed for reference)

1. **Amplify App created** — App ID: `d3fm03a2oiet1x` in account 404875533723
2. **Amplify Hosting connected to GitHub** — `develop` branch, with backend phase enabled in `amplify.yml`
3. **TypeScript / ESLint configured** — strict mode, `--workspaces --if-present` covers `apps/web` (and `amplify/` for typecheck)
4. **CI workflows in place** — `.github/workflows/ci.yml` and `security.yml`

## 🔧 Optional secrets

Add these in **GitHub repo → Settings → Secrets and variables → Actions** if
you want the related feature:

| Secret | Used by | What happens without it |
|--------|---------|-------------------------|
| `SNYK_TOKEN` | `security.yml` Snyk step | Snyk job is skipped (continue-on-error). CodeQL still runs. |

Note: `AMPLIFY_APP_ID` and the GitHub OIDC role (`GitHubActionsDeployRole`)
are no longer used by any workflow. The previous deploy-dev / deploy-prod
workflows that referenced them have been removed in favor of Amplify Hosting's
webhook deploy path. The IAM role can stay in AWS without harm, or you can
clean it up separately.

## 📋 Per-change pre-push checklist

Before pushing to `develop`:

1. **Lint passes:** `npm run lint` (root)
2. **Typecheck passes:** `npm run typecheck` (root)
3. **No `amplify_outputs.json` committed:** it's gitignored; Amplify Hosting regenerates per build
4. **No real secrets committed:** check `git diff` for AWS keys, tokens, customer data
5. **Schema or auth changes** — read the AppSync schema diff carefully; field removal can break the frontend (`apps/web/src/lib/amplify.ts` typing) and incorrect auth rules can leak data across customers

For backend changes that alter Cognito or DynamoDB shape, also:

- Confirm the change does not require a destructive replacement of a stateful
  resource (UserPool, Table). Amplify Gen 2 will surface this in CloudFormation
  events but it's easier to catch before push by running `npx ampx sandbox`
  locally and inspecting the diff.

## 🚀 Deploy flow

### Push to `develop` → automatic deploy

1. `git push origin develop`
2. **GitHub Actions** runs `ci.yml` (lint + typecheck) and `security.yml` (CodeQL on PR — push doesn't trigger CodeQL by default unless the file lists a `push:` trigger)
3. **Amplify Hosting** detects the push via GitHub webhook and starts a build:
   - **Backend phase:** `npx ampx pipeline-deploy --branch develop --app-id $AWS_APP_ID` — synthesizes CDK, updates AWS resources, regenerates `amplify_outputs.json`
   - **Frontend phase:** `npm run build --workspace=apps/web` — Vite production build, deployed to Amplify CDN
4. CDN cache invalidates automatically

GitHub Actions and Amplify Hosting run **in parallel by default**. To make a
red CI block the Amplify build, see "Gating deploys on green CI" in
[WORKFLOW_STRATEGY.md](./WORKFLOW_STRATEGY.md#gating-deploys-on-green-ci).

### Push to `main` → production deploy

Same flow, against the `main` branch (production AWS account, when set up).
There is no manual approval gate — if you want one, configure it in Amplify
Console → Hosting → Branch settings.

## 🔍 Where to look

| Want to see... | Go to |
|---------------|-------|
| CI run results | [GitHub Actions](https://github.com/christophercorbin/CTCMweb/actions) |
| Amplify build status | [Amplify Console](https://us-east-1.console.aws.amazon.com/amplify/home?region=us-east-1#/d3fm03a2oiet1x) |
| CloudFormation stack events (deploy errors) | Amplify Console → Build details → backend phase logs |
| Lambda runtime logs | `aws logs tail /aws/lambda/<function-name> --follow --region us-east-1` |
| Code Scanning alerts (CodeQL + Snyk) | GitHub repo → Security tab → Code scanning |

## 🚨 Troubleshooting

### CI red but I want to deploy anyway
The Amplify Hosting webhook deploys regardless of CI status by default. If
you've enabled "Wait for status check to succeed", you can either fix CI or
disable that setting temporarily. Don't bypass it on production without a
good reason.

### Amplify backend phase fails
Most common causes:
- New IAM permission missing in `backend.ts` for a Lambda
- `allow.resource()` mismatch between schema and Lambda
- Cross-stack circular dependency from referencing `userPool.userPoolId` (use a plain string instead)
- Schema breaking change against an existing branch deploy

Click the failed build → Backend phase log. CloudFormation events at the
bottom show which resource failed and why.

### Amplify frontend phase fails on import error
Usually `amplify_outputs.json` shape changed. Compare the build log's emitted
file with what `apps/web/src/lib/amplify.ts` reads. Schema field removals can
also surface as TS errors in the frontend.

### CodeQL flags an issue
Open the GitHub Security tab → Code scanning → review the alert. False
positives can be dismissed with a reason.

### Snyk SARIF upload skipped
Expected when `SNYK_TOKEN` isn't configured — the upload step has a
`hashFiles('snyk.sarif') != ''` guard so it skips silently rather than failing.

## 📝 First-time admin user creation

Admin accounts can't self-register. Create one via Cognito:

```bash
USER_POOL_ID=us-east-1_YfQ4BVEry  # develop branch pool

aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username admin@ctcm.com \
  --temporary-password 'Temp#1234' \
  --user-attributes Name=email,Value=admin@ctcm.com Name=email_verified,Value=true \
  --region us-east-1

aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username admin@ctcm.com \
  --group-name admin \
  --region us-east-1
```

The user will be prompted to set a permanent password on first login. The
group name is `admin` (singular) — must match the auth rule in
`amplify/data/resource.ts`.

## 📚 Related docs

- [Workflow Strategy](./WORKFLOW_STRATEGY.md) — full architecture + gating CI on deploys
- [Handoff to Kiro](../HANDOFF_TO_KIRO.md) — original Amplify Gen 2 migration handoff
- [CLAUDE.md](../../CLAUDE.md) — single source of truth for current project state
