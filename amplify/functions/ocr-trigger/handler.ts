import type { S3Event } from "aws-lambda";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";

const sfnClient = new SFNClient({});

export const handler = async (event: S3Event): Promise<void> => {
  for (const record of event.Records) {
    const s3Bucket = record.s3.bucket.name;
    const s3Key = decodeURIComponent(
      record.s3.object.key.replace(/\+/g, " ")
    );

    // Extract uploader's cognitoSub from key: receipts/{cognitoSub}/...
    const uploadedBy = s3Key.split("/")[1] ?? "unknown";

    // Idempotency: use s3Key as execution name (sanitized)
    const executionName = s3Key
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 80);

    try {
      await sfnClient.send(
        new StartExecutionCommand({
          stateMachineArn: process.env.STATE_MACHINE_ARN!,
          name: executionName,
          input: JSON.stringify({ s3Bucket, s3Key, uploadedBy }),
        })
      );
      console.log(`OCR state machine started for ${s3Key}`);
    } catch (err: unknown) {
      const error = err as { name?: string };
      if (error.name === "ExecutionAlreadyExists") {
        console.log(
          "Duplicate S3 event ignored — execution already running for",
          s3Key
        );
        continue;
      }
      throw err;
    }
  }
};
