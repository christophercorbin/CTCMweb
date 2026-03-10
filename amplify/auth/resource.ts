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
    mode: "OFF",
  },
  triggers: {
    postConfirmation,
  },
  // NOTE: do NOT use allow.resource(postConfirmation).to([...]) here.
  // Amplify generates a userpoolAccess IAM resource referencing UserPool.Arn,
  // while the UserPool itself references the Lambda for the trigger —
  // creating a resource-level cycle within the auth stack.
  // Cognito admin permissions are granted manually in backend.ts with resources: ["*"].
});
