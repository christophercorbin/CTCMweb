import { useState, useEffect, useMemo } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import toast from 'react-hot-toast';
import { Megaphone, Send, FlaskConical, Users, UserCheck, Search, History, CheckCircle2, AlertTriangle, Loader2, XCircle } from 'lucide-react';
import { Button, Input, Card, Textarea, Modal, LoadingSkeleton } from '../components';
import { useAuth } from '../contexts/AuthContext';

const client = generateClient<Schema>();

type AppCustomer = Schema['Customer']['type'];
type AppBroadcast = Schema['Broadcast']['type'];

const statusBadge = (status: string) => {
  switch (status) {
    case 'SENT':
      return { label: 'Sent', icon: CheckCircle2, classes: 'bg-green-50 text-green-700 border-green-200' };
    case 'SENDING':
      return { label: 'Sending…', icon: Loader2, classes: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'SENT_WITH_ERRORS':
      return { label: 'Sent with errors', icon: AlertTriangle, classes: 'bg-amber-50 text-amber-700 border-amber-200' };
    default:
      return { label: 'Failed', icon: XCircle, classes: 'bg-red-50 text-red-700 border-red-200' };
  }
};

// ── Client-side replica of the branded email (amplify/functions/shared/emailTemplate.ts)
//    Used only for the live preview iframe — the Lambda builds the real email. ──
const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildPreviewHtml = (opts: {
  subject: string;
  message: string;
  buttonLabel?: string;
  buttonUrl?: string;
}): string => {
  const { subject, message, buttonLabel, buttonUrl } = opts;

  const paragraphs = message
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 18px;font-size:15px;color:#4b5563;line-height:1.7;">${escapeHtml(p).replace(/\n/g, '<br />')}</p>`
    )
    .join('');

  const cta =
    buttonLabel && buttonUrl
      ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
          <tr><td align="center">
            <a href="#" style="display:inline-block;background:#1B2D78;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.02em;">${escapeHtml(buttonLabel)} &rarr;</a>
          </td></tr>
        </table>`
      : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">
        <tr><td style="background:#1B2D78;border-radius:12px 12px 0 0;height:8px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="background:#ffffff;padding:28px 40px 20px;text-align:center;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
          <img src="/logos/logo-color-stacked.png" alt="CargoLink Barbados" height="90" style="display:block;margin:0 auto;max-width:220px;height:auto;" />
        </td></tr>
        <tr><td style="background:#F5C518;height:3px;font-size:0;line-height:0;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">&nbsp;</td></tr>
        <tr><td style="background:#ffffff;padding:36px 36px 28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
          <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Announcement</p>
          <h1 style="margin:0 0 16px;font-size:24px;color:#1B2D78;font-weight:800;">${escapeHtml(subject || 'Your subject line')}</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#111827;font-weight:600;">Hi [Customer's first name],</p>
          ${paragraphs || '<p style="margin:0 0 18px;font-size:15px;color:#9ca3af;line-height:1.7;">Your message will appear here…</p>'}
          ${cta}
          <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
            Questions? Contact us at <a href="mailto:info@cargolinkbarbados.com" style="color:#1B2D78;text-decoration:none;font-weight:600;">info@cargolinkbarbados.com</a>
          </p>
        </td></tr>
        <tr><td style="background:#1B2D78;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
          <p style="margin:0;color:#F5C518;font-size:13px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">CargoLink Barbados</p>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:12px;">The Smarter way to ship</p>
          <p style="margin:12px 0 0;color:rgba(255,255,255,0.45);font-size:11px;">&copy; ${new Date().getFullYear()} CargoLink Barbados &nbsp;&middot;&nbsp; info@cargolinkbarbados.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
};

export const AdminBroadcast = () => {
  const { user } = useAuth();

  // Customers
  const [customers, setCustomers] = useState<AppCustomer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Broadcast history
  const [history, setHistory] = useState<AppBroadcast[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Recipients
  const [recipientMode, setRecipientMode] = useState<'all' | 'selected'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  // Composer
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [buttonLabel, setButtonLabel] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');

  // Sending state
  const [sendingTest, setSendingTest] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const allItems: AppCustomer[] = [];
        let cursor: string | undefined;
        do {
          const result = await client.models.Customer.list({ limit: 1000, nextToken: cursor });
          if (result.errors?.length) throw new Error(result.errors[0].message);
          allItems.push(...result.data);
          cursor = result.nextToken ?? undefined;
        } while (cursor);
        allItems.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
        // Opted-out customers are excluded from broadcasts by the backend —
        // hide them here too so the recipient counts match.
        setCustomers(allItems.filter((c) => !c.emailOptOut));
      } catch (err) {
        toast.error('Failed to load customers');
        console.error(err);
      } finally {
        setLoadingCustomers(false);
      }
    };
    fetchCustomers();
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const result = await client.models.Broadcast.list({ limit: 50 });
      if (result.errors?.length) throw new Error(result.errors[0].message);
      const sorted = [...result.data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setHistory(sorted);
    } catch (err) {
      console.error('Failed to load broadcast history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const recipientCount = recipientMode === 'all' ? customers.length : selectedIds.size;

  const formValid =
    subject.trim().length > 0 &&
    message.trim().length > 0 &&
    (!buttonLabel.trim() || /^https?:\/\//i.test(buttonUrl.trim())) &&
    recipientCount > 0;

  const ctaError =
    buttonLabel.trim() && !/^https?:\/\//i.test(buttonUrl.trim())
      ? 'Link must start with http:// or https://'
      : undefined;

  const toggleCustomer = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const previewHtml = useMemo(
    () =>
      buildPreviewHtml({
        subject,
        message,
        buttonLabel: buttonLabel.trim() || undefined,
        buttonUrl: buttonUrl.trim() || undefined,
      }),
    [subject, message, buttonLabel, buttonUrl]
  );

  const mutationArgs = () => ({
    subject: subject.trim(),
    message: message.trim(),
    buttonLabel: buttonLabel.trim() || undefined,
    buttonUrl: buttonUrl.trim() || undefined,
  });

  const handleTestSend = async () => {
    if (!user?.email) {
      toast.error('Could not determine your email address');
      return;
    }
    try {
      setSendingTest(true);
      const { data, errors } = await client.mutations.sendBroadcastEmail({
        ...mutationArgs(),
        testEmail: user.email,
      });
      if (errors?.length) throw new Error(errors[0].message);
      if (!data?.success) throw new Error(data?.message ?? 'Test send failed');
      toast.success(`Test email sent to ${user.email}`);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message ?? 'Test send failed');
    } finally {
      setSendingTest(false);
    }
  };

  const handleBroadcast = async () => {
    try {
      setSending(true);
      const { data, errors } = await client.mutations.sendBroadcastEmail({
        ...mutationArgs(),
        customerIds: recipientMode === 'selected' ? Array.from(selectedIds) : undefined,
        sentBy: user?.email,
      });
      if (errors?.length) throw new Error(errors[0].message);
      if (!data?.success) throw new Error(data?.message ?? 'Broadcast failed');
      toast.success(data.message ?? `Broadcast started — sending to ${data.recipientCount} customers`);
      setConfirmOpen(false);
      fetchHistory();
      // Reset composer after a successful send
      setSubject('');
      setMessage('');
      setButtonLabel('');
      setButtonUrl('');
      setSelectedIds(new Set());
      setRecipientMode('all');
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message ?? 'Broadcast failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <Megaphone className="w-7 h-7 text-brand-navy" />
        <h1 className="text-2xl font-bold text-gray-900">Email Broadcast</h1>
      </div>
      <p className="text-gray-500 mb-8">
        Send a branded announcement email to your customers — same design as the welcome email.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left: composer ─────────────────────────────────────── */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recipients</h2>
            <div className="flex gap-3 mb-4">
              <button
                type="button"
                onClick={() => setRecipientMode('all')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-semibold transition-colors ${
                  recipientMode === 'all'
                    ? 'border-brand-navy bg-blue-50 text-brand-navy'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <Users className="w-4 h-4" />
                All customers ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setRecipientMode('selected')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-semibold transition-colors ${
                  recipientMode === 'selected'
                    ? 'border-brand-navy bg-blue-50 text-brand-navy'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Select customers ({selectedIds.size})
              </button>
            </div>

            {recipientMode === 'selected' && (
              <div>
                <Input
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  icon={<Search className="w-4 h-4 text-gray-400" />}
                />
                {loadingCustomers ? (
                  <div className="mt-3">
                    <LoadingSkeleton />
                  </div>
                ) : (
                  <div className="mt-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {filteredCustomers.length === 0 && (
                      <p className="p-4 text-sm text-gray-400">No customers match your search.</p>
                    )}
                    {filteredCustomers.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleCustomer(c.id)}
                          className="w-4 h-4 rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-gray-900 truncate">{c.name}</span>
                          <span className="block text-xs text-gray-500 truncate">{c.email}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {filteredCustomers.length > 0 && (
                  <div className="flex gap-4 mt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set(filteredCustomers.map((c) => c.id)))}
                      className="text-xs font-semibold text-brand-navy hover:underline"
                    >
                      Select all shown
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="text-xs font-semibold text-gray-500 hover:underline"
                    >
                      Clear selection
                    </button>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Message</h2>
            <div className="space-y-4">
              <Input
                label="Subject"
                placeholder="e.g. Holiday shipping deadlines — order by Dec 10"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={150}
              />
              <Textarea
                label="Message"
                placeholder={'Write your announcement…\n\nLeave a blank line between paragraphs.'}
                rows={8}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Button label (optional)"
                  placeholder="e.g. View Rates"
                  value={buttonLabel}
                  onChange={(e) => setButtonLabel(e.target.value)}
                  maxLength={40}
                />
                <Input
                  label="Button link"
                  placeholder="https://…"
                  value={buttonUrl}
                  onChange={(e) => setButtonUrl(e.target.value)}
                  error={ctaError}
                  disabled={!buttonLabel.trim()}
                />
              </div>
            </div>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="secondary"
              icon={FlaskConical}
              loading={sendingTest}
              disabled={!subject.trim() || !message.trim() || !!ctaError || sendingTest}
              onClick={handleTestSend}
              className="flex-1"
            >
              Send test to me
            </Button>
            <Button
              variant="primary"
              icon={Send}
              disabled={!formValid || sending}
              onClick={() => setConfirmOpen(true)}
              className="flex-1"
            >
              Send to {recipientCount} customer{recipientCount === 1 ? '' : 's'}
            </Button>
          </div>
        </div>

        {/* ── Right: live preview ────────────────────────────────── */}
        <div>
          <div className="sticky top-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Live preview
            </h2>
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-gray-100">
              <iframe
                title="Email preview"
                srcDoc={previewHtml}
                sandbox=""
                className="w-full h-[640px] bg-gray-100"
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Each customer's email is personalised with their first name and includes an
              unsubscribe link. Unsubscribed customers are excluded automatically.
            </p>
          </div>
        </div>
      </div>

      {/* ── Broadcast history ─────────────────────────────────────── */}
      <Card className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-brand-navy" />
          <h2 className="text-lg font-semibold text-gray-900">Past broadcasts</h2>
          <button
            type="button"
            onClick={fetchHistory}
            className="ml-auto text-xs font-semibold text-brand-navy hover:underline"
          >
            Refresh
          </button>
        </div>
        {loadingHistory ? (
          <LoadingSkeleton />
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-400">No broadcasts sent yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.map((b) => {
              const badge = statusBadge(b.status);
              const BadgeIcon = badge.icon;
              return (
                <div key={b.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{b.subject}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(b.createdAt).toLocaleString()} ·{' '}
                      {b.recipientCount ?? 0} recipient{(b.recipientCount ?? 0) === 1 ? '' : 's'}
                      {b.sentBy ? ` · by ${b.sentBy}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {b.status !== 'SENDING' && (
                      <span className="text-xs text-gray-500">
                        {b.sentCount ?? 0} sent
                        {(b.failedCount ?? 0) > 0 ? `, ${b.failedCount} failed` : ''}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${badge.classes}`}
                    >
                      <BadgeIcon className={`w-3.5 h-3.5 ${b.status === 'SENDING' ? 'animate-spin' : ''}`} />
                      {badge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Confirm modal ─────────────────────────────────────────── */}
      <Modal isOpen={confirmOpen} onClose={() => !sending && setConfirmOpen(false)} title="Confirm broadcast" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            You're about to email{' '}
            <span className="font-bold text-gray-900">
              {recipientCount} customer{recipientCount === 1 ? '' : 's'}
            </span>
            {recipientMode === 'all' ? ' (all customers)' : ' (selected customers)'}.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Subject</p>
            <p className="text-sm font-semibold text-gray-900">{subject}</p>
          </div>
          <p className="text-xs text-gray-400">
            This cannot be undone. Sending happens in the background — track progress in
            "Past broadcasts" below. Consider sending a test to yourself first.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button variant="primary" icon={Send} loading={sending} onClick={handleBroadcast}>
              Send broadcast
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
