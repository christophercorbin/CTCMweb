import { defineFunction } from "@aws-amplify/backend";

export const syncCustomers = defineFunction({
  name: "ctcm-sync-customers",
  entry: "./handler.ts",
  runtime: 20,
  timeoutSeconds: 60,
  memoryMB: 512,
  resourceGroupName: "data",
});
