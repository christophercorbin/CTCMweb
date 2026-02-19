import { defineAuth } from "@aws-amplify/backend";
import { postConfirmation } from "../functions/post-confirmation/resource";

/**
 * Amplify Auth Configuration for CTCM
 *
 * User Groups:
 * - admin: Full access to all resources (provisioned manually via Cognito console)
 * - customer: Self-registered, limited to tenant-specific resources
 *
 * Custom Attributes:
 * - custom:role: User role (admin | customer)
 * - custom:customerId: DynamoDB Customer record ID (set by post-confirmation trigger)
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
    "custom:customerId": {
      dataType: "String",
      mutable: true,
    },
    "custom:role": {
      dataType: "String",
      mutable: true,
    },
  },
  groups: ["admin", "customer"],
  multifactor: {
    mode: "OPTIONAL", // REQUIRED for admin in prod — enforce via Cognito console
    totp: true,
  },
  triggers: {
    postConfirmation,
  },
  passwordPolicy: {
    minLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSymbols: false,
  },
});
