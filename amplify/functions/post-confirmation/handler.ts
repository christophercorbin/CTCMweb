import type { PostConfirmationTriggerHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { randomUUID } from "crypto";

const cognitoClient = new CognitoIdentityProviderClient({});

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const { userPoolId, userName } = event;
  const { email, name, sub } = event.request.userAttributes;

  // 1. Generate a stable customerId (DynamoDB PK)
  const customerId = randomUUID();

  // 2. Add user to 'customer' group
  await cognitoClient.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: userName,
      GroupName: "customer",
    })
  );

  // 3. Set custom:customerId attribute
  await cognitoClient.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: userName,
      UserAttributes: [
        { Name: "custom:customerId", Value: customerId },
        { Name: "custom:role", Value: "customer" },
      ],
    })
  );

  // 4. Create Customer record in DynamoDB via AppSync (IAM auth via SigV4)
  // The function execution role has grantMutation permission (wired in backend.ts)
  const endpoint = process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT!;

  const { SignatureV4 } = await import("@smithy/signature-v4");
  const { Sha256 } = await import("@aws-crypto/sha256-js");
  const { fromEnv } = await import("@aws-sdk/credential-providers");

  const signer = new SignatureV4({
    credentials: fromEnv(),
    region: process.env.AWS_REGION ?? "us-east-1",
    service: "appsync",
    sha256: Sha256,
  });

  const url = new URL(endpoint);
  const body = JSON.stringify({
    query: /* GraphQL */ `
      mutation CreateCustomer($input: CreateCustomerInput!) {
        createCustomer(input: $input) { id }
      }
    `,
    variables: {
      input: {
        id: customerId,
        name: name ?? email,
        email,
        cognitoSub: sub, // Cognito sub UUID — matches allow.owner() identity claim
      },
    },
  });

  const req = await signer.sign({
    method: "POST",
    hostname: url.hostname,
    path: url.pathname,
    protocol: url.protocol,
    headers: {
      "Content-Type": "application/json",
      host: url.hostname,
    },
    body,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: req.headers as Record<string, string>,
    body,
  });

  const json = (await response.json()) as { errors?: unknown[] };
  if (json.errors) {
    console.error("AppSync createCustomer errors:", json.errors);
    // Do NOT throw — user is already confirmed; log and continue
  }

  return event;
};
