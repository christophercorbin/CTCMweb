import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { createHmac } from "crypto";
import { emailWrapper, button, escapeHtml } from "../shared/emailTemplate";

const ses = new SESClient({ region: process.env.AWS_REGION ?? "us-east-1" });
const lambda = new LambdaClient({ region: process.env.AWS_REGION ?? "us-east-1" });

const GRAPHQL_ENDPOINT =
  process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT ??
  process.env.GRAPHQL_API_ENDPOINT!;
const SENDER = process.env.SENDER_EMAIL ?? "info@cargolinkbarbados.com";
const UNSUBSCRIBE_URL = process.env.UNSUBSCRIBE_URL; // public function URL of the unsubscribe Lambda
const UNSUBSCRIBE_SECRET =
  process.env.UNSUBSCRIBE_SECRET ?? "cargolink-unsubscribe-dev-secret";

/** Emails sent per batch; SES default send rate is ~14/sec */
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;

// ── SigV4 AppSync helper (same pattern as sync-customers) ─────────────────────
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

type Signer = Awaited<ReturnType<typeof makeSigner>>;

async function appsyncRequest(
  signer: Signer,
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

// ── Customer listing ──────────────────────────────────────────────────────────
interface Recipient {
  id: string;
  name: string;
  email: string;
  emailOptOut?: boolean | null;
}

async function listAllCustomers(signer: Signer): Promise<Recipient[]> {
  const customers: Recipient[] = [];
  let nextToken: string | null = null;
  do {
    const body = JSON.stringify({
      query: /* GraphQL */ `
        query ListCustomers($limit: Int, $nextToken: String) {
          listCustomers(limit: $limit, nextToken: $nextToken) {
            items { id name email emailOptOut }
            nextToken
          }
        }
      `,
      variables: { limit: 500, nextToken },
    });
    const json = await appsyncRequest(signer, body);
    if (json.errors) {
      console.error("listCustomers errors:", json.errors);
      throw new Error("Failed to list customers from AppSync");
    }
    const page = (json.data as {
      listCustomers?: { items?: Recipient[]; nextToken?: string | null };
    })?.listCustomers;
    customers.push(...(page?.items ?? []));
    nextToken = page?.nextToken ?? null;
  } while (nextToken);
  return customers;
}

/** Resolve final recipient list: optional id filter → drop opt-outs → de-dupe emails */
async function resolveRecipients(
  signer: Signer,
  customerIds: string[]
): Promise<Recipient[]> {
  let recipients = await listAllCustomers(signer);

  if (customerIds.length > 0) {
    const wanted = new Set(customerIds);
    recipients = recipients.filter((c) => wanted.has(c.id));
  }

  recipients = recipients.filter((c) => !c.emailOptOut);

  const seen = new Set<string>();
  return recipients.filter((c) => {
    const email = c.email?.trim().toLowerCase();
    if (!email || seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}

// ── Broadcast history record ──────────────────────────────────────────────────
async function createBroadcastRecord(
  signer: Signer,
  input: {
    subject: string;
    message: string;
    buttonLabel?: string;
    buttonUrl?: string;
    recipientCount: number;
    sentBy?: string;
  }
): Promise<string> {
  const body = JSON.stringify({
    query: /* GraphQL */ `
      mutation CreateBroadcast($input: CreateBroadcastInput!) {
        createBroadcast(input: $input) { id }
      }
    `,
    variables: {
      input: {
        subject: input.subject,
        message: input.message,
        buttonLabel: input.buttonLabel ?? null,
        buttonUrl: input.buttonUrl ?? null,
        recipientCount: input.recipientCount,
        sentCount: 0,
        failedCount: 0,
        status: "SENDING",
        sentBy: input.sentBy ?? null,
      },
    },
  });
  const json = await appsyncRequest(signer, body);
  if (json.errors) {
    console.error("createBroadcast errors:", json.errors);
    throw new Error("Failed to create broadcast history record");
  }
  return (json.data as { createBroadcast: { id: string } }).createBroadcast.id;
}

async function updateBroadcastRecord(
  signer: Signer,
  input: {
    id: string;
    sentCount: number;
    failedCount: number;
    status: string;
  }
) {
  const body = JSON.stringify({
    query: /* GraphQL */ `
      mutation UpdateBroadcast($input: UpdateBroadcastInput!) {
        updateBroadcast(input: $input) { id }
      }
    `,
    variables: {
      input: { ...input, completedAt: new Date().toISOString() },
    },
  });
  const json = await appsyncRequest(signer, body);
  if (json.errors) console.error("updateBroadcast errors:", json.errors);
}

// ── Unsubscribe token: customerId + HMAC signature ───────────────────────────
function unsubscribeToken(customerId: string): string {
  const sig = createHmac("sha256", UNSUBSCRIBE_SECRET)
    .update(customerId)
    .digest("hex");
  return `${customerId}.${sig}`;
}

// ── Email composition (branded — same wrapper as the welcome email) ───────────
interface EmailContent {
  subject: string;
  message: string;
  buttonLabel?: string;
  buttonUrl?: string;
}

function buildBroadcastHtml(
  opts: EmailContent & { firstName?: string; unsubscribeLink?: string }
): string {
  const { firstName, subject, message, buttonLabel, buttonUrl, unsubscribeLink } = opts;

  const paragraphs = message
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 18px;font-size:15px;color:#4b5563;line-height:1.7;">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`
    )
    .join("");

  const greeting = firstName
    ? `<p style="margin:0 0 16px;font-size:15px;color:#111827;font-weight:600;">Hi ${escapeHtml(firstName)},</p>`
    : "";

  const cta = buttonLabel && buttonUrl ? button(buttonLabel, buttonUrl) : "";

  const unsubscribe = unsubscribeLink
    ? `<p style="margin:12px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">
        Don't want these emails?
        <a href="${escapeHtml(unsubscribeLink)}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
        — you'll still receive shipment and account emails.
      </p>`
    : "";

  return emailWrapper(`
    <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Announcement</p>
    <h1 style="margin:0 0 16px;font-size:24px;color:#1B2D78;font-weight:800;">${escapeHtml(subject)}</h1>
    ${greeting}
    ${paragraphs}
    ${cta}
    <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
      Questions? Contact us at
      <a href="mailto:info@cargolinkbarbados.com" style="color:#1B2D78;text-decoration:none;font-weight:600;">info@cargolinkbarbados.com</a>
    </p>
    ${unsubscribe}
  `);
}

function buildBroadcastText(
  opts: EmailContent & { firstName?: string; unsubscribeLink?: string }
): string {
  const { firstName, message, buttonLabel, buttonUrl, unsubscribeLink } = opts;
  return `${firstName ? `Hi ${firstName},\n\n` : ""}${message}
${buttonLabel && buttonUrl ? `\n${buttonLabel}: ${buttonUrl}\n` : ""}
The CargoLink Barbados Team
info@cargolinkbarbados.com${unsubscribeLink ? `\n\nUnsubscribe from announcements: ${unsubscribeLink}` : ""}`;
}

async function sendOne(
  opts: EmailContent & { to: string; firstName?: string; customerId?: string }
) {
  const { to, firstName, customerId, ...content } = opts;
  const unsubscribeLink =
    UNSUBSCRIBE_URL && customerId
      ? `${UNSUBSCRIBE_URL.replace(/\/$/, "")}/?t=${unsubscribeToken(customerId)}`
      : undefined;

  await ses.send(
    new SendEmailCommand({
      Source: SENDER,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: content.subject, Charset: "UTF-8" },
        Body: {
          Html: {
            Data: buildBroadcastHtml({ ...content, firstName, unsubscribeLink }),
            Charset: "UTF-8",
          },
          Text: {
            Data: buildBroadcastText({ ...content, firstName, unsubscribeLink }),
            Charset: "UTF-8",
          },
        },
      },
    })
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Background worker: does the actual sending ───────────────────────────────
interface WorkerEvent {
  action: "SEND";
  broadcastId: string;
  customerIds: string[];
  subject: string;
  message: string;
  buttonLabel?: string;
  buttonUrl?: string;
}

async function runWorker(event: WorkerEvent) {
  const signer = await makeSigner();
  const recipients = await resolveRecipients(signer, event.customerIds);

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((c) =>
        sendOne({
          to: c.email,
          firstName: c.name?.split(" ")[0],
          customerId: c.id,
          subject: event.subject,
          message: event.message,
          buttonLabel: event.buttonLabel,
          buttonUrl: event.buttonUrl,
        })
      )
    );
    for (const r of results) {
      if (r.status === "fulfilled") sent++;
      else {
        failed++;
        console.error("Broadcast send failed:", r.reason);
      }
    }
    if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_DELAY_MS);
  }

  const status =
    sent === 0 && failed > 0 ? "FAILED" : failed > 0 ? "SENT_WITH_ERRORS" : "SENT";
  await updateBroadcastRecord(signer, {
    id: event.broadcastId,
    sentCount: sent,
    failedCount: failed,
    status,
  });
  console.log(`Broadcast ${event.broadcastId} complete: ${sent} sent, ${failed} failed`);
}

// ── AppSync handler (enqueue phase) ──────────────────────────────────────────
interface AppSyncEvent {
  arguments: {
    subject: string;
    message: string;
    buttonLabel?: string | null;
    buttonUrl?: string | null;
    customerIds?: (string | null)[] | null;
    testEmail?: string | null;
    sentBy?: string | null;
  };
}

export const handler = async (event: AppSyncEvent | WorkerEvent) => {
  // Background invocation: do the sending, no AppSync response needed
  if ("action" in event && event.action === "SEND") {
    await runWorker(event);
    return;
  }

  const { subject, message, customerIds, testEmail, sentBy } = (
    event as AppSyncEvent
  ).arguments;
  const buttonLabel = (event as AppSyncEvent).arguments.buttonLabel ?? undefined;
  const buttonUrl = (event as AppSyncEvent).arguments.buttonUrl ?? undefined;

  if (!subject.trim() || !message.trim()) {
    return { success: false, recipientCount: 0, broadcastId: null, message: "Subject and message are required" };
  }
  if (buttonUrl && !/^https?:\/\//i.test(buttonUrl)) {
    return { success: false, recipientCount: 0, broadcastId: null, message: "Button link must start with http:// or https://" };
  }

  try {
    // ── Test send: one synchronous email, no history record ──────────────────
    if (testEmail) {
      await sendOne({
        to: testEmail,
        subject: `[TEST] ${subject}`,
        message,
        buttonLabel,
        buttonUrl,
      });
      return { success: true, recipientCount: 1, broadcastId: null, message: `Test email sent to ${testEmail}` };
    }

    // ── Real broadcast: validate recipients, record history, send async ──────
    const signer = await makeSigner();
    const idFilter = (customerIds ?? []).filter((id): id is string => !!id);
    const recipients = await resolveRecipients(signer, idFilter);

    if (recipients.length === 0) {
      return {
        success: false,
        recipientCount: 0,
        broadcastId: null,
        message: "No matching recipients (customers may have unsubscribed)",
      };
    }

    const broadcastId = await createBroadcastRecord(signer, {
      subject: subject.trim(),
      message: message.trim(),
      buttonLabel,
      buttonUrl,
      recipientCount: recipients.length,
      sentBy: sentBy ?? undefined,
    });

    // Self-invoke asynchronously so the mutation returns immediately.
    const workerPayload: WorkerEvent = {
      action: "SEND",
      broadcastId,
      customerIds: idFilter,
      subject: subject.trim(),
      message: message.trim(),
      buttonLabel,
      buttonUrl,
    };
    await lambda.send(
      new InvokeCommand({
        FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME!,
        InvocationType: "Event",
        Payload: Buffer.from(JSON.stringify(workerPayload)),
      })
    );

    return {
      success: true,
      recipientCount: recipients.length,
      broadcastId,
      message: `Broadcast started — sending to ${recipients.length} customer${recipients.length === 1 ? "" : "s"}`,
    };
  } catch (err) {
    console.error("broadcastEmail error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, recipientCount: 0, broadcastId: null, message: msg };
  }
};
