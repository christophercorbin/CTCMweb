import type { PostConfirmationTriggerHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { randomUUID } from "crypto";

// Mirror the address templates from CustomerManagement.tsx / sync-customers/handler.ts
const buildAirAddress = (name: string) =>
  `${name}\nCaribconex - CargoLink Barbados\n13155 NW 19th Lane\nDoral\nFL 33182`;

const buildSeaAddress = (name: string) =>
  `${name}\nIntegrity Logistics-CargoLink Barbados\n10301 NW 108TH AVE UNIT 2B MEDLEY, FL 33178`;

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
  // The endpoint is resolved at runtime to avoid a CDK cross-stack circular dependency.
  // Amplify's auto-injected AMPLIFY_DATA_GRAPHQL_ENDPOINT is not available because
  // postConfirmation is in the auth stack (not listed in data allow.resource()).
  let endpoint = process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT;
  if (!endpoint) {
    // Discover the AppSync endpoint by listing APIs and matching by name pattern
    const { AppSyncClient, ListGraphqlApisCommand } = await import("@aws-sdk/client-appsync");
    const appsync = new AppSyncClient({});
    const apis = await appsync.send(new ListGraphqlApisCommand({ maxResults: 25 }));
    const api = apis.graphqlApis?.find((a) => a.name?.includes("amplifyData"));
    if (!api?.uris?.GRAPHQL) throw new Error("Could not discover AppSync endpoint");
    endpoint = api.uris.GRAPHQL;
  }

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
        airSkyboxAddress: buildAirAddress(name ?? email),
        seaSkyboxAddress: buildSeaAddress(name ?? email),
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
