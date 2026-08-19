import { defineFunction } from "@aws-amplify/backend";

export const ocrTrigger = defineFunction({
  name: "ctcm-ocr-trigger",
  entry: "./handler.ts",
  runtime: 22,
  timeoutSeconds: 30,
  memoryMB: 256,
  resourceGroupName: "storage", // Assign to storage stack (S3 trigger)
});
