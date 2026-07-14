/**
 * Parse a recipient env var into a clean list of email addresses.
 *
 * `ADMIN_NOTIFY_EMAIL` (and similar) may hold a single address or a
 * comma-separated list. We trim each entry and drop blanks so a trailing
 * comma or stray whitespace can't produce an empty recipient (which SES
 * rejects). Falls back to `fallback` when the value is missing or blank.
 */
export const parseRecipients = (
  raw: string | undefined | null,
  fallback = "info@cargolinkbarbados.com"
): string[] => {
  const source = raw && raw.trim() !== "" ? raw : fallback;
  return source
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
};
