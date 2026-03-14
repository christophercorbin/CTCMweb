import { defineFunction } from "@aws-amplify/backend";

export const postConfirmation = defineFunction({
  name: "ctcm-post-confirmation",
  entry: "./handler.ts",
  runtime: 20, // Node.js 20
  timeoutSeconds: 30,
  memoryMB: 256,
  resourceGroupName: "auth", // Must be in auth stack — it's a Cognito trigger
});
