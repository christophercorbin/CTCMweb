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
 * {entity_id} resolves to the caller's Cognito identity (sub) at runtime.
 */
export const storage = defineStorage({
  name: "ctcm-storage",
  isDefault: true,
  versioned: true, // enables recovery of overwritten files
  access: (allow) => ({
    // Receipts: identity owner full access; admin full access
    "receipts/{entity_id}/*": [
      allow.entity("identity").to(["read", "write", "delete"]),
      allow.groups(["customer"]).to(["read", "write", "delete"]),
      allow.groups(["admin"]).to(["read", "write", "delete"]),
    ],
    // Invoices: customers read-only; admin full access
    "invoices/{entity_id}/*": [
      allow.entity("identity").to(["read"]),
      allow.groups(["customer"]).to(["read"]),
      allow.groups(["admin"]).to(["read", "write", "delete"]),
    ],
    // Documents: customers read/write own; admin full access
    "documents/{entity_id}/*": [
      allow.entity("identity").to(["read", "write", "delete"]),
      allow.groups(["customer"]).to(["read", "write", "delete"]),
      allow.groups(["admin"]).to(["read", "write", "delete"]),
    ],
    // Shipment attachments: customers read own; admin full access
    "shipments/{entity_id}/*": [
      allow.entity("identity").to(["read"]),
      allow.groups(["customer"]).to(["read"]),
      allow.groups(["admin"]).to(["read", "write", "delete"]),
    ],
  }),
});
