import { defineFunction } from "@aws-amplify/backend";

export const adminDeleteCustomer = defineFunction({
  name: "ctcm-admin-delete-customer",
  entry: "./handler.ts",
  runtime: 20,
  timeoutSeconds: 30,
  memoryMB: 512,
  resourceGroupName: "data", // Assign to data stack (custom mutation handler)
});
