import { defineFunction } from "@aws-amplify/backend";

export const sesEvents = defineFunction({
  name: "ctcm-ses-events",
  entry: "./handler.ts",
  runtime: 22,
  timeoutSeconds: 30,
  memoryMB: 256,
  resourceGroupName: "data", // needs AppSync access via allow.resource()
});
