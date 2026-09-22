import {
  CognitoIdentityProviderClient,
  ListUsersInGroupCommand,
  type UserType,
} from "@aws-sdk/client-cognito-identity-provider";
import { randomUUID } from "crypto";

const cognito = new CognitoIdentityProviderClient({});

// ── User Pool ID resolution ──────────────────────────────────────────────────
// USER_POOL_ID is set per branch (Amplify Console env var, read at synth time
// in backend.ts). There is deliberately NO runtime discovery fallback: every
// environment's pool matched the old name-based search, so an admin action in
// one environment could silently target another environment's pool. Fail
// closed instead.
async function getUserPoolId(): Promise<string> {
  const id = process.env.USER_POOL_ID;
  if (!id) {
    throw new Error(
      "USER_POOL_ID is not set — configure it as an Amplify branch environment variable"
    );
  }
  return id;
}
const GRAPHQL_ENDPOINT =
  process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT ??
  process.env.GRAPHQL_API_ENDPOINT!;

// ── Address templates (mirror frontend CustomerManagement.tsx) ────────────────
const buildAirAddress = (name: string) =>
  `${name}\nCaribconex - CargoLink Barbados\n13155 NW 19th Lane Suite B\nDoral\nFL 33182`;

const buildSeaAddress = (name: string) =>
  `${name}\nIntegrity Logistics - CTCM\n10301 NW 108TH AVE UNIT 2B MEDLEY, FL 33178`;

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

// ── Step 1: List all Cognito users in the customer group ─────────────────────
async function listCognitoCustomers(): Promise<UserType[]> {
  const userPoolId = await getUserPoolId();
  const users: UserType[] = [];
  let nextToken: string | undefined;
  do {
    const res = await cognito.send(
      new ListUsersInGroupCommand({
        UserPoolId: userPoolId,
        GroupName: "customer",
        Limit: 60,
        NextToken: nextToken,
      })
    );
    users.push(...(res.Users ?? []));
    nextToken = res.NextToken;
  } while (nextToken);
  return users;
}

// ── Step 2: List all existing Customer records from AppSync ──────────────────
interface ExistingCustomer {
  id: string;
  email: string;
  name: string;
  airSkyboxAddress?: string | null;
  seaSkyboxAddress?: string | null;
  cognitoSub?: string | null;
}

async function listExistingCustomers(
  signer: Awaited<ReturnType<typeof makeSigner>>
): Promise<ExistingCustomer[]> {
  const customers: ExistingCustomer[] = [];
  let nextToken: string | null = null;
  do {
    const body = JSON.stringify({
      query: /* GraphQL */ `
        query ListCustomers($limit: Int, $nextToken: String) {
          listCustomers(limit: $limit, nextToken: $nextToken) {
            items { id email name airSkyboxAddress seaSkyboxAddress cognitoSub }
            nextToken
          }
        }
      `,
      variables: { limit: 500, nextToken },
    });
    const json = await appsyncRequest(signer, body);
    if (json.errors) {
      console.error("listCustomers errors:", json.errors);
      throw new Error("Failed to list existing customers from AppSync");
    }
    const page = (json.data as any)?.listCustomers;
    customers.push(...(page?.items ?? []));
    nextToken = page?.nextToken ?? null;
  } while (nextToken);
  return customers;
}

// ── Step 2b: Update a Customer record's skybox addresses ────────────────────
async function updateCustomerAddresses(
  signer: Awaited<ReturnType<typeof makeSigner>>,
  input: { id: string; airSkyboxAddress: string; seaSkyboxAddress: string }
) {
  const body = JSON.stringify({
    query: /* GraphQL */ `
      mutation UpdateCustomer($input: UpdateCustomerInput!) {
        updateCustomer(input: $input) { id }
      }
    `,
    variables: { input },
  });
  const json = await appsyncRequest(signer, body);
  if (json.errors) {
    console.error("updateCustomer errors:", json.errors);
    throw new Error(`Failed to update customer ${input.id}`);
  }
}

// ── Step 3: Create a single Customer record in AppSync ───────────────────────
async function createCustomer(
  signer: Awaited<ReturnType<typeof makeSigner>>,
  input: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    cognitoSub: string;
    airSkyboxAddress: string;
    seaSkyboxAddress: string;
  }
) {
  const body = JSON.stringify({
    query: /* GraphQL */ `
      mutation CreateCustomer($input: CreateCustomerInput!) {
        createCustomer(input: $input) { id }
      }
    `,
    variables: { input },
  });
  const json = await appsyncRequest(signer, body);
  if (json.errors) {
    console.error("createCustomer errors:", json.errors);
    throw new Error(`Failed to create customer record for ${input.email}`);
  }
}

// ── AppSync mutation handler ──────────────────────────────────────────────────
interface SyncEvent {
  arguments?: { refreshAddresses?: boolean | null };
}

export const handler = async (event: SyncEvent = {}): Promise<{
  synced: number;
  skipped: number;
  errors: number;
  refreshed: number;
}> => {
  let synced = 0;
  let skipped = 0;
  let errors = 0;
  let refreshed = 0;

  const refreshAddresses = event?.arguments?.refreshAddresses === true;

  const signer = await makeSigner();

  // Fetch Cognito users and existing DynamoDB records in parallel
  const [cognitoUsers, existingCustomers] = await Promise.all([
    listCognitoCustomers(),
    listExistingCustomers(signer),
  ]);

  // Build lookup sets for O(1) deduplication
  const existingBySub = new Set(
    existingCustomers.map((c) => c.cognitoSub).filter(Boolean) as string[]
  );
  const existingByEmail = new Set(
    existingCustomers.map((c) => c.email.toLowerCase())
  );

  for (const user of cognitoUsers) {
    const attrs = Object.fromEntries(
      (user.Attributes ?? []).map((a) => [a.Name!, a.Value ?? ""])
    );

    const sub = attrs["sub"];
    const email = attrs["email"];
    const name = attrs["name"] || email; // fallback: use email as display name
    const phone = attrs["phone_number"] || undefined;
    const existingCustomerId = attrs["custom:customerId"] || undefined;

    if (!sub || !email) {
      console.warn("Skipping user missing sub or email:", user.Username);
      skipped++;
      continue;
    }

    // Already has a DynamoDB Customer record — skip
    if (existingBySub.has(sub) || existingByEmail.has(email.toLowerCase())) {
      skipped++;
      continue;
    }

    // Use the customerId Cognito attribute if postConfirmation set it; else generate new
    const customerId = existingCustomerId ?? randomUUID();

    try {
      await createCustomer(signer, {
        id: customerId,
        name,
        email,
        phone,
        cognitoSub: sub,
        airSkyboxAddress: buildAirAddress(name),
        seaSkyboxAddress: buildSeaAddress(name),
      });
      console.log(`Created Customer record for ${email}`);
      synced++;
    } catch (err) {
      console.error(`Error creating customer for ${email}:`, err);
      errors++;
    }
  }

  // ── Optional: refresh stored skybox addresses on all existing records ─────
  if (refreshAddresses) {
    for (const c of existingCustomers) {
      const name = c.name || c.email;
      const nextAir = buildAirAddress(name);
      const nextSea = buildSeaAddress(name);
      if (c.airSkyboxAddress === nextAir && c.seaSkyboxAddress === nextSea) {
        continue;
      }
      try {
        await updateCustomerAddresses(signer, {
          id: c.id,
          airSkyboxAddress: nextAir,
          seaSkyboxAddress: nextSea,
        });
        refreshed++;
      } catch (err) {
        console.error(`Error refreshing addresses for ${c.email}:`, err);
        errors++;
      }
    }
    console.log(`Address refresh complete — refreshed: ${refreshed}`);
  }

  console.log(
    `Sync complete — synced: ${synced}, skipped: ${skipped}, errors: ${errors}, refreshed: ${refreshed}`
  );
  return { synced, skipped, errors, refreshed };
};
