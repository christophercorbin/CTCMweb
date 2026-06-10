/**
 * SES bounce/complaint handler.
 *
 * SES identity notifications (Bounce + Complaint) → SNS topic → this Lambda.
 * Permanent bounces and complaints flag the matching Customer record with
 * emailOptOut=true so future broadcasts skip the address — protecting the
 * SES sender reputation for transactional email too.
 */

const GRAPHQL_ENDPOINT =
  process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT ??
  process.env.GRAPHQL_API_ENDPOINT!;

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

async function appsyncRequest(body: string): Promise<{ data?: unknown; errors?: unknown[] }> {
  const signer = await makeSigner();
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

// ── Customer lookup + flag ────────────────────────────────────────────────────
async function flagCustomerByEmail(email: string, reason: "BOUNCED" | "COMPLAINT") {
  // Find customer(s) by email
  const listBody = JSON.stringify({
    query: /* GraphQL */ `
      query ListCustomers($filter: ModelCustomerFilterInput, $limit: Int) {
        listCustomers(filter: $filter, limit: $limit) {
          items { id email emailOptOut }
        }
      }
    `,
    variables: { filter: { email: { eq: email } }, limit: 10 },
  });
  const listJson = await appsyncRequest(listBody);
  if (listJson.errors) {
    console.error("listCustomers errors:", listJson.errors);
    return;
  }
  const items =
    (listJson.data as { listCustomers?: { items?: { id: string; emailOptOut?: boolean | null }[] } })
      ?.listCustomers?.items ?? [];

  if (items.length === 0) {
    console.log(`No Customer record found for ${email} — nothing to flag`);
    return;
  }

  for (const item of items) {
    if (item.emailOptOut) continue; // already flagged
    const updateBody = JSON.stringify({
      query: /* GraphQL */ `
        mutation UpdateCustomer($input: UpdateCustomerInput!) {
          updateCustomer(input: $input) { id }
        }
      `,
      variables: {
        input: { id: item.id, emailOptOut: true, emailOptOutReason: reason },
      },
    });
    const updateJson = await appsyncRequest(updateBody);
    if (updateJson.errors) {
      console.error(`Failed to flag customer ${item.id}:`, updateJson.errors);
    } else {
      console.log(`Flagged customer ${item.id} (${email}) as ${reason}`);
    }
  }
}

// ── SNS event handler ─────────────────────────────────────────────────────────
interface SesNotification {
  notificationType?: "Bounce" | "Complaint" | "Delivery";
  bounce?: {
    bounceType?: "Permanent" | "Transient" | "Undetermined";
    bouncedRecipients?: { emailAddress?: string }[];
  };
  complaint?: {
    complainedRecipients?: { emailAddress?: string }[];
  };
}

interface SnsEvent {
  Records?: { Sns?: { Message?: string } }[];
}

export const handler = async (event: SnsEvent) => {
  for (const record of event.Records ?? []) {
    const raw = record.Sns?.Message;
    if (!raw) continue;

    let notification: SesNotification;
    try {
      notification = JSON.parse(raw) as SesNotification;
    } catch {
      console.error("Could not parse SNS message:", raw.slice(0, 500));
      continue;
    }

    if (notification.notificationType === "Bounce") {
      // Only act on permanent bounces — transient ones (full mailbox, etc.) recover
      if (notification.bounce?.bounceType !== "Permanent") {
        console.log(`Ignoring ${notification.bounce?.bounceType} bounce`);
        continue;
      }
      for (const r of notification.bounce?.bouncedRecipients ?? []) {
        if (r.emailAddress) await flagCustomerByEmail(r.emailAddress, "BOUNCED");
      }
    } else if (notification.notificationType === "Complaint") {
      for (const r of notification.complaint?.complainedRecipients ?? []) {
        if (r.emailAddress) await flagCustomerByEmail(r.emailAddress, "COMPLAINT");
      }
    }
    // Delivery notifications are ignored
  }
};
