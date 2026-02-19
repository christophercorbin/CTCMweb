import { defineFunction } from "@aws-amplify/backend";

export const ocrProcessor = defineFunction({
  name: "ctcm-ocr-processor",
  entry: "./handler.ts",
  runtime: 20,
  timeoutSeconds: 120, // Textract can be slow
  memoryMB: 512,
  resourceGroupName: "data", // Assign to data stack (calls data API)
});
