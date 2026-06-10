import { defineFunction } from "@aws-amplify/backend";

export const broadcastEmail = defineFunction({
  name: "ctcm-broadcast-email",
  entry: "./handler.ts",
  runtime: 20,
  timeoutSeconds: 300, // broadcasts to all customers can take a while
  memoryMB: 256,
  resourceGroupName: "data", // Assign to data stack (custom mutation handler)
});
