import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  ListUserPoolsCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognito = new CognitoIdentityProviderClient({});

const GRAPHQL_ENDPOINT =
  process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT ??
  process.env.GRAPHQL_API_ENDPOINT!;

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

  const pool =
    UserPools?.find(
      (p) =>
        p.Name?.toLowerCase().includes("ctcm") ||
        p.Name?.toLowerCase().includes("cargolink") ||
        p.Name?.toLowerCase().includes("amplify")
    ) ?? UserPools?.[0];

  if (!pool?.Id) {
    throw new Error(
      "Could not discover USER_POOL_ID. Set it as an environment variable."
    );
  }

  console.log(`Discovered User Pool: ${pool.Name} (${pool.Id})`);
  cachedUserPoolId = pool.Id;
  return cachedUserPoolId;
}

// ── SigV4 AppSync helper ──────────────────────────────────────────────────────
async function makeSigner() {
  const { SignatureV4 } = await import("@smithy/signature-v4");
  const { Sha256 } = await import("@aws-crypto/sha256-js");
  const { fromEnv } = await import("@aws-sdk/credential-providers");
  return new SignatureV4({
    credentials: fromEnv(),
    region: process.env.AWS_REGION ?? "us-east-1",
    service: "appsync",
    sha256: Sha256,
  });
}

async function appsyncRequest(
  signer: Awaited<ReturnType<typeof makeSigner>>,
  body: string
): Promise<{ data?: unknown; errors?: unknown[] }> {
  const url = new URL(GRAPHQL_ENDPOINT);
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
  return res.json() as Promise<{ data?: unknown; errors?: unknown[] }>;
}

// ── Fetch customer by ID from AppSync ─────────────────────────────────────────
interface CustomerRow {
  id: string;
  email: string;
  name: string;
  cognitoSub?: string | null;
}

async function getCustomer(
  signer: Awaited<ReturnType<typeof makeSigner>>,
  id: string
): Promise<CustomerRow | null> {
  const body = JSON.stringify({
    query: /* GraphQL */ `
      query GetCustomer($id: ID!) {
        getCustomer(id: $id) {
          id
          email
          name
          cognitoSub
        }
      }
    `,
    variables: { id },
  });
  const json = await appsyncRequest(signer, body);
  if (json.errors) {
    console.error("getCustomer errors:", json.errors);
    throw new Error("Failed to fetch customer record");
  }
  return ((json.data as any)?.getCustomer as CustomerRow | null) ?? null;
}

// ── Delete Customer record in AppSync ─────────────────────────────────────────
async function deleteCustomerInAppSync(
  signer: Awaited<ReturnType<typeof makeSigner>>,
  id: string
) {
  const body = JSON.stringify({
    query: /* GraphQL */ `
      mutation DeleteCustomer($input: DeleteCustomerInput!) {
        deleteCustomer(input: $input) {
          id
        }
      }
    `,
    variables: { input: { id } },
  });
  const json = await appsyncRequest(signer, body);
  if (json.errors) {
    console.error("deleteCustomer errors:", json.errors);
    throw new Error("Failed to delete customer record");
  }
}

// ── Delete Cognito user ───────────────────────────────────────────────────────
// Username in Cognito = the value used at AdminCreateUser time. For our app we
// create users with Username=email, so email is the canonical handle. If a
// user was created via self-registration, the Username is typically the sub
// (or email depending on pool config) — we try email first, then fall back to
// looking the user up by sub via AdminGetUser to get the canonical Username.
async function deleteCognitoUser(opts: {
  userPoolId: string;
  email: string;
  cognitoSub?: string | null;
}): Promise<{ deleted: boolean; reason?: string }> {
  const { userPoolId, email, cognitoSub } = opts;

  // Attempt 1: delete by email (our AdminCreateUser flow uses email as Username)
  try {
    await cognito.send(
      new AdminDeleteUserCommand({
        UserPoolId: userPoolId,
        Username: email,
      })
    );
    return { deleted: true };
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === "UserNotFoundException") {
      console.warn(`Cognito user not found by email=${email}`);
      // fall through — try by sub below
    } else {
      throw err;
    }
  }

  // Attempt 2: try by sub (some self-registered users may have Username=sub)
  if (cognitoSub) {
    try {
      // Verify user exists before deleting (gives a better error if not)
      await cognito.send(
        new AdminGetUserCommand({
          UserPoolId: userPoolId,
          Username: cognitoSub,
        })
      );
      await cognito.send(
        new AdminDeleteUserCommand({
          UserPoolId: userPoolId,
          Username: cognitoSub,
        })
      );
      return { deleted: true };
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "UserNotFoundException") {
        return {
          deleted: false,
          reason: `No Cognito user found for email=${email} or sub=${cognitoSub}`,
        };
      }
      throw err;
    }
  }

  return {
    deleted: false,
    reason: `No Cognito user found for email=${email} (no sub on record)`,
  };
}

// ── AppSync handler ───────────────────────────────────────────────────────────
interface AppSyncEvent {
  arguments: {
    customerId: string;
  };
}

export const handler = async (
  event: AppSyncEvent
): Promise<{ success: boolean; message: string }> => {
  const { customerId } = event.arguments;

  if (!customerId) {
    return { success: false, message: "customerId is required" };
  }

  try {
    const signer = await makeSigner();

    // 1. Look up the customer record (to find email + cognitoSub for Cognito delete)
    const customer = await getCustomer(signer, customerId);
    if (!customer) {
      return {
        success: false,
        message: `Customer ${customerId} not found in database`,
      };
    }

    const userPoolId = await getUserPoolId();

    // 2. Delete the Cognito user (best-effort — record may have been orphaned)
    let cognitoNote = "";
    try {
      const res = await deleteCognitoUser({
        userPoolId,
        email: customer.email,
        cognitoSub: customer.cognitoSub,
      });
      if (!res.deleted) {
        cognitoNote = ` (note: ${res.reason})`;
        console.warn(res.reason);
      } else {
        console.log(`Deleted Cognito user for ${customer.email}`);
      }
    } catch (cognitoErr) {
      console.error("Cognito delete failed:", cognitoErr);
      const msg =
        cognitoErr instanceof Error ? cognitoErr.message : "Unknown error";
      // Don't abort — still try to delete the DB record so we don't leave a
      // ghost entry after a transient Cognito failure. The admin can retry.
      cognitoNote = ` (warning: Cognito delete failed — ${msg})`;
    }

    // 3. Delete the Customer record in DynamoDB (via AppSync)
    await deleteCustomerInAppSync(signer, customerId);
    console.log(`Deleted Customer record ${customerId} (${customer.email})`);

    return {
      success: true,
      message: `Customer ${customer.email} deleted${cognitoNote}`,
    };
  } catch (err) {
    console.error("adminDeleteCustomer error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: msg };
  }
};
