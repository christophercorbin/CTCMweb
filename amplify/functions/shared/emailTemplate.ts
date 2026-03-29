/**
 * Shared HTML email template for all CargoLink Barbados transactional emails.
 * Uses table-based layout for maximum email client compatibility.
 *
 * Brand colours: navy #1B2D78 · gold #F5C518
 */

const APP_URL = process.env.APP_URL ?? "https://develop.d1yo6c4008x99n.amplifyapp.com";
const LOGO_URL = `${APP_URL}/logos/logo-color-stacked.png`;

export function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">

          <!-- Header accent stripe -->
          <tr>
            <td style="background:#1B2D78;border-radius:12px 12px 0 0;height:8px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <!-- Header logo -->
          <tr>
            <td style="background:#ffffff;padding:28px 40px 20px;text-align:center;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              <img src="${LOGO_URL}" alt="CargoLink Barbados" height="90"
                style="display:block;margin:0 auto;max-width:220px;height:auto;" />
            </td>
          </tr>
          <!-- Header divider -->
          <tr>
            <td style="background:#F5C518;height:3px;font-size:0;line-height:0;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 36px 28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1B2D78;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
              <p style="margin:0;color:#F5C518;font-size:13px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">CargoLink Barbados</p>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:12px;">The Smarter way to ship</p>
              <p style="margin:12px 0 0;color:rgba(255,255,255,0.45);font-size:11px;">
                &copy; ${new Date().getFullYear()} CargoLink Barbados &nbsp;&middot;&nbsp;
                <a href="mailto:info@cargolinkbarbados.com" style="color:rgba(255,255,255,0.55);text-decoration:none;">info@cargolinkbarbados.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** A labelled info row used inside detail cards */
export function infoRow(label: string, value: string): string {
  return `
  <tr>
    <td style="padding:6px 0;border-bottom:1px solid #f3f4f6;">
      <p style="margin:0;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">${label}</p>
      <p style="margin:3px 0 0;font-size:15px;color:#111827;font-weight:600;">${value}</p>
    </td>
  </tr>`;
}

/** A card with a coloured left border */
export function card(content: string, accentColor = "#1B2D78"): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="border:1px solid #e5e7eb;border-left:4px solid ${accentColor};border-radius:8px;margin:20px 0;background:#fafafa;">
    <tr><td style="padding:18px 20px;">${content}</td></tr>
  </table>`;
}

/** Primary CTA button */
export function button(label: string, url: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
    <tr>
      <td align="center">
        <a href="${url}"
          style="display:inline-block;background:#1B2D78;color:#ffffff;font-size:15px;font-weight:700;
                 text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.02em;">
          ${label} &rarr;
        </a>
      </td>
    </tr>
  </table>`;
}
