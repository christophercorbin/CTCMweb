# Dev Environment — Test Logins

> **Environment:** AWS Amplify Gen2 · User Pool: `us-east-1_YfQ4BVEry`
> **URL:** http://localhost:5173 (local) or the Amplify hosted dev branch

---

## Admin Users

| Email | Password | Group | Status |
|---|---|---|---|
| admin@ctcm.test | `AdminPass123!` | admin | Confirmed |
| frank.admin@ctcm.test | `Frank123!` | admin | Confirmed |

Admins land on `/admin/dashboard` after login.

---

## Customer Users

| Email | Password | Group | Status |
|---|---|---|---|
| customer@ctcm.test | `TestPass123!` | customer | Confirmed |
| frank.customer@ctcm.test | `Frank123!` | customer | Confirmed |

Customers land on `/dashboard` after login.

---

## Notes on Admin-Created Accounts

Admin-created users (all four above) **do not trigger the `post-confirmation` Lambda**, so:
- `frank.customer@ctcm.test` will have an **empty dashboard** (no DynamoDB Customer record) — fine for dev testing
- To create a Customer record for frank.customer, log in as admin and create a shipment for them, or register a fresh account through the normal `/register` flow instead

---

## Incomplete / Unusable Accounts

These accounts exist in Cognito but cannot be used (email unverified / no group assigned):

| Email | Name | Status | Notes |
|---|---|---|---|
| johnb@hotmshil.com | John Brown | Unconfirmed | Typo email (hotmshil vs hotmail) |
| test@ctcm.com | test | Unconfirmed | No group assigned |

---

## Resetting a Password

```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_YfQ4BVEry \
  --username <email> \
  --password <NewPassword123!> \
  --permanent \
  --region us-east-1
```
