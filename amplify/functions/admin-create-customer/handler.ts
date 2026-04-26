import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  AdminUpdateUserAttributesCommand,
  ListUserPoolsCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { randomUUID, randomBytes } from "crypto";
import { emailWrapper, card, button, escapeHtml } from "../shared/emailTemplate";

const cognito = new CognitoIdentityProviderClient({});
const ses = new SESClient({ region: process.env.AWS_REGION ?? "us-east-1" });

const GRAPHQL_ENDPOINT =
  process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT ??
  process.env.GRAPHQL_API_ENDPOINT!;
const SENDER = process.env.SENDER_EMAIL ?? "info@cargolinkbarbados.com";
const APP_URL = process.env.APP_URL ?? "https://cargolinkbarbados.com";

// ── User Pool ID resolution ──────────────────────────────────────────────────
// USER_POOL_ID cannot be injected via CDK due to a cross-stack cycle
// (data stack → auth stack). It can be set as an Amplify Console env var
// for deployed branches. For sandbox, we auto-discover it at runtime.
let cachedUserPoolId: string | undefined = process.env.USER_POOL_ID;

async function getUserPoolId(): Promise<string> {
  if (cachedUserPoolId) return cachedUserPoolId;

  console.log("USER_POOL_ID not set — discovering via ListUserPools...");
  const { UserPools } = await cognito.send(
    new ListUserPoolsCommand({ MaxResults: 60 })
  );

  // Match the Amplify-managed pool by name pattern (contains "ctcm" or "cargolink")
  const pool = UserPools?.find(
    (p) =>
      p.Name?.toLowerCase().includes("ctcm") ||
      p.Name?.toLowerCase().includes("cargolink") ||
      p.Name?.toLowerCase().includes("amplify")
  );

  if (!pool?.Id) {
    throw new Error(
      "Could not discover USER_POOL_ID — no matching pool found. Set it as an environment variable."
    );
  }

  console.log(`Discovered User Pool: ${pool.Name} (${pool.Id})`);
  cachedUserPoolId = pool.Id;
  return cachedUserPoolId;
}

// ── Temp password generator (cryptographically secure) ───────────────────────
function secureRandomIndex(max: number): number {
  return randomBytes(1)[0] % max;
}

function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#";
  const all = upper + lower + digits + special;

  const chars = [
    upper[secureRandomIndex(upper.length)],
    upper[secureRandomIndex(upper.length)],
    lower[secureRandomIndex(lower.length)],
    lower[secureRandomIndex(lower.length)],
    digits[secureRandomIndex(digits.length)],
    digits[secureRandomIndex(digits.length)],
    special[secureRandomIndex(special.length)],
    all[secureRandomIndex(all.length)],
  ];

  // Fisher-Yates shuffle with secure randomness
  const shuffleBytes = randomBytes(chars.length);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

// ── AppSync mutation via SigV4 ────────────────────────────────────────────────
async function createCustomerInAppSync(input: {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  parish?: string;
  country?: string;
  cognitoSub: string;
  airSkyboxAddress?: string;
  seaSkyboxAddress?: string;
}) {
  const { SignatureV4 } = await import("@smithy/signature-v4");
  const { Sha256 } = await import("@aws-crypto/sha256-js");
  const { fromEnv } = await import("@aws-sdk/credential-providers");

  const signer = new SignatureV4({
    credentials: fromEnv(),
    region: process.env.AWS_REGION ?? "us-east-1",
    service: "appsync",
    sha256: Sha256,
  });

  const url = new URL(GRAPHQL_ENDPOINT);
  const body = JSON.stringify({
    query: /* GraphQL */ `
      mutation CreateCustomer($input: CreateCustomerInput!) {
        createCustomer(input: $input) { id }
      }
    `,
    variables: { input },
  });

  const req = await signer.sign({
    method: "POST",
    hostname: url.hostname,
    path: url.pathname,
    protocol: url.protocol,
    headers: { "Content-Type": "application/json", host: url.hostname },
    body,
  });

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: req.headers as Record<string, string>,
    body,
  });
  const json = (await res.json()) as { errors?: unknown[] };
  if (json.errors) {
    console.error("AppSync createCustomer errors:", json.errors);
    throw new Error("Failed to create customer record");
  }
}

// ── Welcome email ─────────────────────────────────────────────────────────────
async function sendWelcomeEmail(opts: {
  name: string;
  email: string;
  tempPassword: string;
  airSkyboxAddress?: string;
  seaSkyboxAddress?: string;
}) {
  const { name, email, tempPassword, airSkyboxAddress, seaSkyboxAddress } = opts;

  const formatAddress = (addr?: string) =>
    addr
      ? addr.split("\n").map((l) => `<p style="margin:2px 0;font-family:monospace;font-size:13px;color:#374151;">${escapeHtml(l)}</p>`).join("")
      : "<p style='color:#9ca3af;font-size:13px;'>Not set</p>";

  const html = emailWrapper(`
    <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Welcome</p>
    <h1 style="margin:0 0 16px;font-size:24px;color:#1B2D78;font-weight:800;">Your account is ready, ${escapeHtml(name.split(" ")[0])}!</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.7;">
      Welcome to <strong>CargoLink Barbados</strong>. Your account has been set up and you're ready to start shipping.
      Log in below to access your dashboard and track your shipments.
    </p>

    ${card(`
      <p style="margin:0 0 12px;font-size:12px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Your Login Details</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr><td style="padding:6px 0;border-bottom:1px solid #f3f4f6;">
          <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Email</p>
          <p style="margin:3px 0 0;font-size:15px;color:#111827;font-weight:600;">${escapeHtml(email)}</p>
        </td></tr>
        <tr><td style="padding:10px 0 0;">
          <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Temporary Password</p>
          <p style="margin:6px 0 0;display:inline-block;font-family:monospace;font-size:18px;font-weight:800;color:#1B2D78;background:#eff6ff;padding:8px 16px;border-radius:6px;letter-spacing:0.1em;">${escapeHtml(tempPassword)}</p>
          <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">You will be asked to set a new password on your first login.</p>
        </td></tr>
      </table>
    `)}

    ${button("Log In to CargoLink", `${APP_URL}/login`)}

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />

    <p style="margin:0 0 6px;font-size:16px;font-weight:800;color:#1B2D78;">Your Shipping Addresses</p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6;">
      Use these addresses when shopping online in the US — we'll forward your packages to Barbados.
    </p>

    ${card(`
      <p style="margin:0 0 10px;font-size:12px;color:#1B2D78;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;">✈ Air Freight &nbsp;<span style="font-weight:400;color:#9ca3af;">(3–5 days)</span></p>
      ${formatAddress(airSkyboxAddress)}
    `, "#1B2D78")}

    ${card(`
      <p style="margin:0 0 10px;font-size:12px;color:#0f766e;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;">🚢 Sea Freight &nbsp;<span style="font-weight:400;color:#9ca3af;">(3–6 weeks · best for heavy items)</span></p>
      ${formatAddress(seaSkyboxAddress)}
    `, "#0f766e")}

    <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
      Questions? Contact us at
      <a href="mailto:info@cargolinkbarbados.com" style="color:#1B2D78;text-decoration:none;font-weight:600;">info@cargolinkbarbados.com</a>
    </p>
  `);

  const text = `Welcome to CargoLink Barbados, ${name}!

Your account has been created.

Login: ${APP_URL}/login
Email: ${email}
Temporary Password: ${tempPassword}

You will be prompted to set a new password on first login.

AIR FREIGHT ADDRESS:
${airSkyboxAddress ?? "Not set"}

SEA FREIGHT ADDRESS:
${seaSkyboxAddress ?? "Not set"}

The CargoLink Barbados Team`;

  await ses.send(
    new SendEmailCommand({
      Source: SENDER,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: "Welcome to CargoLink Barbados — Your Account is Ready", Charset: "UTF-8" },
        Body: {
          Html: { Data: html, Charset: "UTF-8" },
          Text: { Data: text, Charset: "UTF-8" },
        },
      },
    })
  );
}

// ── AppSync handler ───────────────────────────────────────────────────────────
interface AppSyncEvent {
  arguments: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    address?: string;
    city?: string;
    parish?: string;
    country?: string;
    airSkyboxAddress?: string;
    seaSkyboxAddress?: string;
  };
}

export const handler = async (event: AppSyncEvent) => {
  const { name, email, phone, company, address, city, parish, country, airSkyboxAddress, seaSkyboxAddress } = event.arguments;

  const customerId = randomUUID();
  const tempPassword = generateTempPassword();

  try {
    const userPoolId = await getUserPoolId();

    // 1. Create Cognito user (suppress default email; we send our own)
    const createRes = await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        TemporaryPassword: tempPassword,
        MessageAction: "SUPPRESS",
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
          { Name: "name", Value: name },
        ],
      })
    );

    const cognitoSub = createRes.User?.Attributes?.find(
      (a) => a.Name === "sub"
    )?.Value;

    if (!cognitoSub) {
      throw new Error("Cognito user created but sub not found");
    }

    // 2. Add to customer group
    await cognito.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: email,
        GroupName: "customer",
      })
    );

    // 3. Set custom attributes
    await cognito.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: [
          { Name: "custom:customerId", Value: customerId },
          { Name: "custom:role", Value: "customer" },
        ],
      })
    );

    // 4. Create Customer record in AppSync
    await createCustomerInAppSync({
      id: customerId,
      name,
      email,
      phone,
      company,
      address,
      city,
      parish,
      country,
      cognitoSub,
      airSkyboxAddress,
      seaSkyboxAddress,
    });

    // 5. Send welcome email (non-fatal if it fails)
    try {
      await sendWelcomeEmail({ name, email, tempPassword, airSkyboxAddress, seaSkyboxAddress });
    } catch (emailErr) {
      console.error("Welcome email failed (non-fatal):", emailErr);
    }

    return { success: true, customerId, message: "Customer account created" };
  } catch (err) {
    console.error("adminCreateCustomer error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, customerId: null, message: msg };
  }
};
