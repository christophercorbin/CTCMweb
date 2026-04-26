import {
  TextractClient,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
  type Block,
} from "@aws-sdk/client-textract";

const textract = new TextractClient({});

interface StartPayload {
  action: "START";
  s3Bucket: string;
  s3Key: string;
}
interface CheckPayload {
  action: "CHECK";
  jobId: string;
  s3Key: string;
}
interface PersistPayload {
  action: "PERSIST";
  blocks: Block[];
  s3Key: string;
  s3Bucket: string;
  uploadedBy: string;
  shipmentId?: string;
}

type Payload = StartPayload | CheckPayload | PersistPayload;

// ─── Field extractor (extend as business logic matures) ──────────────────────
function extractFields(blocks: Block[]): Record<string, string> {
  const lines = blocks
    .filter((b) => b.BlockType === "LINE" && b.Text)
    .map((b) => b.Text!);

  const fields: Record<string, string> = {};

  for (const line of lines) {
    // Pattern: "Weight: 5.2 kg"
    const weightMatch = line.match(/weight[:\s]+([0-9.]+)\s*(kg|lb)/i);
    if (weightMatch) fields.weight = weightMatch[1];

    // Pattern: "Tracking: CTCM-20260218-001"
    const trackingMatch = line.match(/tracking[:\s#]+([A-Z0-9-]+)/i);
    if (trackingMatch) fields.trackingNumber = trackingMatch[1];

    // Pattern: "Customer: John Doe"
    const customerMatch = line.match(/customer[:\s]+(.+)/i);
    if (customerMatch) fields.customerName = customerMatch[1].trim();

    // Pattern: "Pieces: 3"
    const piecesMatch = line.match(/pieces?[:\s]+([0-9]+)/i);
    if (piecesMatch) fields.quantity = piecesMatch[1];
  }

  return fields;
}

// ─── AppSync mutation (IAM auth via SigV4) ───────────────────────────────────
async function persistToAppSync(
  fields: Record<string, string>,
  s3Key: string,
  uploadedBy: string,
  rawBlocks: Block[],
  shipmentId?: string
): Promise<void> {
  const endpoint =
    process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT ??
    process.env.GRAPHQL_API_ENDPOINT!;

  const mutation = /* GraphQL */ `
    mutation CreatePackage($input: CreatePackageInput!) {
      createPackage(input: $input) { id }
    }
  `;

  if (!shipmentId) {
    throw new Error(
      "shipmentId is required to persist OCR results — pass it in the Step Functions input"
    );
  }

  const input = {
    shipmentId,
    packageType: "BOX",
    weight: fields.weight ? parseFloat(fields.weight) : null,
    description: `OCR intake from ${s3Key} (uploaded by ${uploadedBy})`,
    quantity: fields.quantity ? parseInt(fields.quantity) : 1,
    ocrRawText: rawBlocks
      .filter((b) => b.BlockType === "LINE")
      .map((b) => b.Text)
      .join("\n")
      .slice(0, 4000), // DynamoDB item size limit awareness
    ocrConfidence:
      rawBlocks.reduce((sum, b) => sum + (b.Confidence ?? 0), 0) /
      (rawBlocks.length || 1),
  };

  const { SignatureV4 } = await import("@smithy/signature-v4");
  const { Sha256 } = await import("@aws-crypto/sha256-js");
  const { fromEnv } = await import("@aws-sdk/credential-providers");

  const url = new URL(endpoint);
  const body = JSON.stringify({ query: mutation, variables: { input } });

  const signer = new SignatureV4({
    credentials: fromEnv(),
    region: process.env.AWS_REGION ?? "us-east-1",
    service: "appsync",
    sha256: Sha256,
  });

  const req = await signer.sign({
    method: "POST",
    hostname: url.hostname,
    path: url.pathname,
    protocol: url.protocol,
    headers: { "Content-Type": "application/json", host: url.hostname },
    body,
  });

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: req.headers as Record<string, string>,
    body,
  });

  const json = (await resp.json()) as { errors?: unknown[] };
  if (json.errors) {
    console.error("AppSync createPackage errors:", json.errors);
    throw new Error("Failed to persist OCR results");
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export const handler = async (payload: Payload): Promise<unknown> => {
  switch (payload.action) {
    case "START": {
      const cmd = new StartDocumentTextDetectionCommand({
        DocumentLocation: {
          S3Object: { Bucket: payload.s3Bucket, Name: payload.s3Key },
        },
      });
      const result = await textract.send(cmd);
      return { jobId: result.JobId };
    }

    case "CHECK": {
      const cmd = new GetDocumentTextDetectionCommand({ JobId: payload.jobId });
      const result = await textract.send(cmd);
      if (result.JobStatus === "SUCCEEDED") {
        return { status: "SUCCEEDED", blocks: result.Blocks ?? [] };
      }
      if (result.JobStatus === "FAILED") {
        return { status: "FAILED" };
      }
      return { status: "IN_PROGRESS" };
    }

    case "PERSIST": {
      const fields = extractFields(payload.blocks);
      await persistToAppSync(
        fields,
        payload.s3Key,
        payload.uploadedBy,
        payload.blocks,
        payload.shipmentId
      );
      return { status: "PERSISTED", fields };
    }

    default:
      throw new Error(
        `Unknown action: ${(payload as { action: string }).action}`
      );
  }
};
