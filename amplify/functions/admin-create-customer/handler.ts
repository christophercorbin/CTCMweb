import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { randomUUID } from "crypto";

const cognito = new CognitoIdentityProviderClient({});
const ses = new SESClient({ region: process.env.AWS_REGION ?? "us-east-1" });

const USER_POOL_ID = process.env.USER_POOL_ID!;
const GRAPHQL_ENDPOINT = process.env.GRAPHQL_API_ENDPOINT!;
const SENDER = process.env.SENDER_EMAIL ?? "info@cargolinkbarbados.com";
const APP_URL = process.env.APP_URL ?? "https://www.cargolink.bb";

// ── Temp password generator ───────────────────────────────────────────────────
function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#";
  const all = upper + lower + digits + special;

  const chars = [
    upper[Math.floor(Math.random() * upper.length)],
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
    all[Math.floor(Math.random() * all.length)],
  ];

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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
      ? addr
          .split("\n")
          .map((l) => `<p style="margin:2px 0;font-family:monospace;font-size:13px;">${l}</p>`)
          .join("")
      : "<p style='color:#9ca3af;font-size:13px;'>Not set</p>";

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:20px;color:#1f2937;">
  <div style="background:#1B2D78;padding:24px;border-radius:8px 8px 0 0;">
    <h1 style="color:white;margin:0;font-size:22px;">CargoLink Barbados</h1>
    <p style="color:#F5C518;margin:4px 0 0;font-size:13px;">The Smarter way to ship</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 8px 8px;">
    <p style="font-size:16px;margin-top:0;">Hi <strong>${name}</strong>, welcome to CargoLink Barbados!</p>
    <p style="font-size:15px;line-height:1.6;">
      Your customer account has been created. You can now log in to the CargoLink portal to track your shipments and manage your account.
    </p>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 4px;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Your Login</p>
      <p style="margin:0;font-size:15px;"><strong>Email:</strong> ${email}</p>
      <p style="margin:6px 0 0;font-size:15px;"><strong>Temporary Password:</strong> <span style="font-family:monospace;background:#dbeafe;padding:2px 6px;border-radius:4px;">${tempPassword}</span></p>
      <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">You will be prompted to set a new password on your first login.</p>
    </div>

    <div style="text-align:center;margin:20px 0;">
      <a href="${APP_URL}/login" style="display:inline-block;background:#1B2D78;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
        Log In to CargoLink →
      </a>
    </div>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

    <p style="font-size:15px;font-weight:700;margin-bottom:12px;">Your Shipping Addresses</p>
    <p style="font-size:14px;color:#4b5563;margin-bottom:16px;">
      Use the addresses below when placing online orders that you'd like forwarded to Barbados.
    </p>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:16px;margin-bottom:12px;">
      <p style="margin:0 0 8px;font-size:12px;color:#1d4ed8;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">✈ Air Freight Address</p>
      ${formatAddress(airSkyboxAddress)}
    </div>

    <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:6px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 8px;font-size:12px;color:#0f766e;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">🚢 Sea Freight Address</p>
      ${formatAddress(seaSkyboxAddress)}
    </div>

    <p style="font-size:13px;color:#6b7280;">
      Air freight is faster (3–5 days). Sea freight takes longer (3–6 weeks) but is more economical for heavier items.
    </p>

    <p style="font-size:14px;margin-bottom:0;">Best regards,<br><strong>The CargoLink Barbados Team</strong></p>
  </div>
  <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:16px;">CargoLink Barbados &mdash; The Smarter way to ship</p>
</body>
</html>`;

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
    airSkyboxAddress?: string;
    seaSkyboxAddress?: string;
  };
}

export const handler = async (event: AppSyncEvent) => {
  const { name, email, phone, airSkyboxAddress, seaSkyboxAddress } = event.arguments;

  const customerId = randomUUID();
  const tempPassword = generateTempPassword();

  try {
    // 1. Create Cognito user (suppress default email; we send our own)
    const createRes = await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
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
        UserPoolId: USER_POOL_ID,
        Username: email,
        GroupName: "customer",
      })
    );

    // 3. Set custom attributes
    await cognito.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: USER_POOL_ID,
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
