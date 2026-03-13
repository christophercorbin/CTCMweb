import { defineFunction } from "@aws-amplify/backend";

export const statusNotifier = defineFunction({
  name: "ctcm-status-notifier",
  entry: "./handler.ts",
  runtime: 20,
  timeoutSeconds: 30,
  memoryMB: 256,
  resourceGroupName: "data", // Assign to data stack (custom mutation handler)
});
