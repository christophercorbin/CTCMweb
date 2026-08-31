import { defineStorage } from "@aws-amplify/backend";

/**
 * Amplify Storage Configuration for CTCM Document Management
 *
 * S3 Key Structure:
 *   receipts/{entity_id}/*   — OCR intake (admin uploads warehouse receipts)
 *   invoices/{entity_id}/*   — Invoice PDFs (admin writes, customer reads)
 *   documents/{entity_id}/*  — General customer documents
 *   shipments/{entity_id}/*  — Shipment-related attachments
 *
 * {entity_id} resolves to the caller's Cognito IDENTITY id (not the user pool
 * sub) at runtime, via the ${cognito-identity.amazonaws.com:sub} policy variable.
 *
 * ── IMPORTANT: why there is no allow.groups(["customer"]) here ───────────────
 * The identity pool uses Token-based role mapping, so a signed-in user assumes
 * their GROUP role (cognito:preferred_role), never authenticatedUserIamRole.
 * `allow.groups()` does NOT substitute {entity_id} — it emits a literal
 * wildcard (documents/*), which previously gave every customer read/write/delete
 * over every other customer's files.
 *
 * Amplify cannot express an entity-scoped group rule, so the customer group's
 * S3 access is attached directly to its group role in backend.ts with the
 * ${cognito-identity.amazonaws.com:sub} variable applied. Keep the two in sync.
 *
 * admin legitimately needs cross-tenant access, so its wildcard rule stays here.
 */
export const storage = defineStorage({
  name: "ctcm-storage",
  isDefault: true,
  versioned: true, // enables recovery of overwritten files
  access: (allow) => ({
    // Receipts: identity owner full access; admin full access
    "receipts/{entity_id}/*": [
      allow.entity("identity").to(["read", "write", "delete"]),
      allow.groups(["admin"]).to(["read", "write", "delete"]),
    ],
    // Invoices: customers read-only; admin full access
    "invoices/{entity_id}/*": [
      allow.entity("identity").to(["read"]),
      allow.groups(["admin"]).to(["read", "write", "delete"]),
    ],
    // Documents: customers read/write own; admin full access
    "documents/{entity_id}/*": [
      allow.entity("identity").to(["read", "write", "delete"]),
      allow.groups(["admin"]).to(["read", "write", "delete"]),
    ],
    // Shipment attachments: customers read own; admin full access
    "shipments/{entity_id}/*": [
      allow.entity("identity").to(["read"]),
      allow.groups(["admin"]).to(["read", "write", "delete"]),
    ],
  }),
});
