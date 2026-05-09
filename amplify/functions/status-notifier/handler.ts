import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { emailWrapper, card, button, escapeHtml } from "../shared/emailTemplate";

const ses = new SESClient({ region: process.env.AWS_REGION ?? "us-east-1" });
const SENDER = process.env.SENDER_EMAIL ?? "info@cargolinkbarbados.com";

// Statuses that trigger a customer notification by default
export const NOTIFY_STATUSES = new Set([
  "MIAMI_WAREHOUSE",
  "IN_BARBADOS",
  "IN_BARBADOS_SEA",
  "CUSTOMS_HOLD",
  "BARBADOS_CUSTOMS",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DELAYED",
]);

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  MIAMI_WAREHOUSE: "Miami Warehouse",
  IN_THE_AIR: "In the Air",
  IN_BARBADOS: "In Barbados",
  CUSTOMS_HOLD: "Customs Hold",
  AT_WAREHOUSE: "At Warehouse",
  ON_THE_WATER: "On the Water",
  IN_BARBADOS_SEA: "In Barbados (Sea)",
  BARBADOS_CUSTOMS: "Barbados Customs",
  READY_FOR_PICKUP: "Ready for Pickup",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  DELAYED: "Delayed",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

const DEFAULT_SUBJECTS: Record<string, string> = {
  MIAMI_WAREHOUSE: "Your package has arrived at our Miami warehouse",
  IN_THE_AIR: "Your package is on its way to Barbados ✈",
  IN_BARBADOS: "Your package has arrived in Barbados!",
  CUSTOMS_HOLD: "Action required: Your package is on hold at customs",
  AT_WAREHOUSE: "Your package is at our Barbados warehouse",
  ON_THE_WATER: "Your sea freight shipment is on its way 🚢",
  IN_BARBADOS_SEA: "Your sea freight has arrived in Barbados!",
  BARBADOS_CUSTOMS: "Your package is going through Barbados customs",
  READY_FOR_PICKUP: "📦 Your package is ready for pickup!",
  OUT_FOR_DELIVERY: "🚚 Your package is out for delivery today!",
  DELIVERED: "✅ Your package has been delivered!",
  DELAYED: "Update on your shipment",
};

const DEFAULT_BODIES: Record<string, string> = {
  MIAMI_WAREHOUSE:
    "Your package has been received at our Miami warehouse and is being prepared for shipment to Barbados.",
  IN_THE_AIR:
    "Your package has departed from Miami and is currently in transit by air to Barbados.",
  IN_BARBADOS:
    "Great news! Your air freight package has arrived in Barbados and is being processed.",
  CUSTOMS_HOLD:
    "Your package is currently on hold at customs. Please contact our office for more information or to provide any required documentation.",
  AT_WAREHOUSE:
    "Your package has cleared customs and is now at our Barbados warehouse, ready for delivery or pickup.",
  ON_THE_WATER:
    "Your sea freight shipment has departed and is currently in transit to Barbados.",
  IN_BARBADOS_SEA:
    "Your sea freight shipment has arrived in Barbados and is being processed.",
  BARBADOS_CUSTOMS:
    "Your package is currently being processed by Barbados customs. We will notify you once it has been cleared.",
  READY_FOR_PICKUP:
    "Your package is ready for pickup at our warehouse. Please bring a valid photo ID.\n\nOur hours are Monday–Friday, 8:00 AM – 5:00 PM.",
  OUT_FOR_DELIVERY:
    "Your package is out for delivery today. Please ensure someone is available to receive it at your delivery address.",
  DELIVERED:
    "Your package has been successfully delivered. Thank you for choosing CargoLink Barbados!",
  DELAYED:
    "Your package has been delayed. We sincerely apologize for the inconvenience and will keep you updated as soon as possible.",
};

// Admin instruction email templates
const ADMIN_INSTRUCTION_SUBJECTS: Record<string, string> = {
  ADMIN_SHIP: "Your shipment has been released for delivery",
  ADMIN_HOLD: "Your shipment has been placed on hold",
};

const ADMIN_INSTRUCTION_BODIES: Record<string, string> = {
  ADMIN_SHIP:
    "Our team has released your shipment for delivery on your behalf. Your cargo is now cleared and will be processed for the next available shipment to Barbados.",
  ADMIN_HOLD:
    "Our team has placed your shipment on hold at the warehouse on your behalf. Your cargo will remain securely stored until further notice. Please contact us if you have any questions.",
};

const ADMIN_INSTRUCTION_HEADINGS: Record<string, string> = {
  ADMIN_SHIP: "Shipment Released",
  ADMIN_HOLD: "Shipment On Hold",
};

interface AppSyncEvent {
  arguments: {
    shipmentId: string;
    customerEmail: string;
    customerName?: string;
    trackingNumber: string;
    status: string;
    customMessage?: string;
    notificationType?: string;
  };
}

export const handler = async (event: AppSyncEvent) => {
  const { customerEmail, customerName, trackingNumber, status, customMessage, notificationType } =
    event.arguments;

  const name = customerName ?? "Valued Customer";
  const isAdminInstruction = notificationType === "ADMIN_SHIP" || notificationType === "ADMIN_HOLD";

  let subject: string;
  let body: string;
  let heading: string;

  if (isAdminInstruction && notificationType) {
    subject = customMessage?.trim()
      ? `${ADMIN_INSTRUCTION_SUBJECTS[notificationType]}: ${customMessage.trim().slice(0, 60)}`
      : ADMIN_INSTRUCTION_SUBJECTS[notificationType];
    body = customMessage?.trim() || ADMIN_INSTRUCTION_BODIES[notificationType];
    heading = ADMIN_INSTRUCTION_HEADINGS[notificationType];
  } else {
    const statusLabel = STATUS_LABELS[status] ?? status;
    subject = DEFAULT_SUBJECTS[status] ?? `Shipment update: ${statusLabel}`;
    const defaultBody = DEFAULT_BODIES[status] ?? `Your shipment status has been updated to: ${statusLabel}.`;
    body = customMessage?.trim() || defaultBody;
    heading = "Shipment Update";
  }

  const statusLabel = STATUS_LABELS[status] ?? status;
  const APP_URL = process.env.APP_URL ?? "https://cargolinkbarbados.com";

  const html = emailWrapper(`
    <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(heading)}</p>
    <h1 style="margin:0 0 20px;font-size:22px;color:#1B2D78;font-weight:800;">${escapeHtml(subject)}</h1>
    <p style="margin:0 0 16px;font-size:16px;color:#374151;">Hi <strong>${escapeHtml(name)}</strong>,</p>
    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.7;">${escapeHtml(body).replace(/\n/g, "<br>")}</p>

    ${card(`
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="padding:0 0 14px;">
            <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Tracking Number</p>
            <p style="margin:4px 0 0;font-family:monospace;font-size:18px;font-weight:800;color:#1B2D78;letter-spacing:0.04em;">${escapeHtml(trackingNumber)}</p>
          </td>
        </tr>
        <tr>
          <td>
            <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Current Status</p>
            <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#111827;">
              <span style="display:inline-block;background:#F5C518;color:#1B2D78;padding:3px 12px;border-radius:20px;font-size:13px;font-weight:800;">${escapeHtml(statusLabel)}</span>
            </p>
          </td>
        </tr>
      </table>
    `)}

    ${button("View Shipment Details", `${APP_URL}/dashboard`)}

    <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
      Questions? Reply to this email or contact us at
      <a href="mailto:info@cargolinkbarbados.com" style="color:#1B2D78;text-decoration:none;font-weight:600;">info@cargolinkbarbados.com</a>
    </p>
  `);

  try {
    await ses.send(
      new SendEmailCommand({
        Source: SENDER,
        Destination: { ToAddresses: [customerEmail] },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: html, Charset: "UTF-8" },
            Text: {
              Data: `${subject}\n\nHi ${name},\n\n${body}\n\nTracking Number: ${trackingNumber}\nStatus: ${statusLabel}\n\nThe CargoLink Barbados Team`,
              Charset: "UTF-8",
            },
          },
        },
      })
    );

    console.log(`Notification sent to ${customerEmail} for status ${status}`);
    return { success: true };
  } catch (err) {
    console.error("SES send error:", err);
    return { success: false };
  }
};
