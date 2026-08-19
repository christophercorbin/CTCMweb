import { defineFunction } from "@aws-amplify/backend";

export const unsubscribe = defineFunction({
  name: "ctcm-unsubscribe",
  entry: "./handler.ts",
  runtime: 22,
  timeoutSeconds: 15,
  memoryMB: 256,
  resourceGroupName: "data", // needs AppSync access via allow.resource()
});
