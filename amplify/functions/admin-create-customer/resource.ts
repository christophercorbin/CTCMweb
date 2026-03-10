import { defineFunction } from "@aws-amplify/backend";

export const adminCreateCustomer = defineFunction({
  name: "ctcm-admin-create-customer",
  entry: "./handler.ts",
  runtime: 20,
  timeoutSeconds: 30,
  memoryMB: 512,
  resourceGroupName: "data", // custom mutation handler — assign to data stack
});
