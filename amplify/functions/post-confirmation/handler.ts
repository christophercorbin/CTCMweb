import type { PostConfirmationTriggerHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { randomUUID } from "crypto";

const ses = new SESClient({ region: process.env.AWS_REGION ?? "us-east-1" });
const SENDER       = process.env.SENDER_EMAIL       ?? "info@cargolinkbarbados.com";
const ADMIN_EMAIL  = process.env.ADMIN_NOTIFY_EMAIL ?? "info@cargolinkbarbados.com";

// Mirror the address templates from CustomerManagement.tsx / sync-customers/handler.ts
const buildAirAddress = (name: string) =>
  `${name}\nCaribconex - CargoLink Barbados\n13155 NW 19th Lane\nDoral\nFL 33182`;

const buildSeaAddress = (name: string) =>
  `${name}\nIntegrity Logistics - CTCM\n10301 NW 108TH AVE UNIT 2B MEDLEY, FL 33178`;

const cognitoClient = new CognitoIdentityProviderClient({});

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const { userPoolId, userName } = event;
  const {
    email,
    name,
    given_name,
    family_name,
    phone_number,
    sub,
  } = event.request.userAttributes;

  // Prefer given_name + family_name (set by Register form); fall back to the
  // legacy `name` attribute so existing accounts still work.
  const displayName =
    given_name && family_name
      ? `${given_name} ${family_name}`
      : given_name || name || email;

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
        name: displayName,
        email,
        phone: phone_number ?? undefined,
        cognitoSub: sub, // Cognito sub UUID — matches allow.owner() identity claim
        airSkyboxAddress: buildAirAddress(displayName),
        seaSkyboxAddress: buildSeaAddress(displayName),
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

  // ── Notify admin of new sign-up ──────────────────────────────────────────
  try {
    const adminHtml = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
  <div style="background: #1B2D78; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">CargoLink Barbados</h1>
    <p style="color: #F5C518; margin: 4px 0 0; font-size: 13px;">Admin Notification</p>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 28px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-top: 0;">A new customer has registered on CargoLink Barbados.</p>
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 6px; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Name</p>
      <p style="margin: 0 0 14px; font-size: 15px; font-weight: 700; color: #111827;">${displayName}</p>
      <p style="margin: 0 0 6px; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Email</p>
      <p style="margin: 0 0 14px; font-size: 15px; color: #111827;">${email}</p>
      ${phone_number ? `<p style="margin: 0 0 6px; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Phone</p>
      <p style="margin: 0; font-size: 15px; color: #111827;">${phone_number}</p>` : ""}
    </div>
    <p style="font-size: 14px; color: #6b7280;">Log in to the admin dashboard to view and manage this customer.</p>
  </div>
  <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 16px;">CargoLink Barbados &mdash; The Smarter way to ship</p>
</body>
</html>`;

    await ses.send(
      new SendEmailCommand({
        Source: SENDER,
        Destination: { ToAddresses: [ADMIN_EMAIL] },
        Message: {
          Subject: { Data: `New customer registered: ${displayName}`, Charset: "UTF-8" },
          Body: {
            Html: { Data: adminHtml, Charset: "UTF-8" },
            Text: {
              Data: `New customer registered on CargoLink Barbados.\n\nName: ${displayName}\nEmail: ${email}${phone_number ? `\nPhone: ${phone_number}` : ""}\n\nLog in to the admin dashboard to manage this customer.`,
              Charset: "UTF-8",
            },
          },
        },
      })
    );
    console.log(`Admin notification sent to ${ADMIN_EMAIL} for new customer ${email}`);
  } catch (sesErr) {
    console.error("Failed to send admin notification email:", sesErr);
    // Do NOT throw — this is non-critical
  }

  return event;
};
