import { useState, useEffect, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import { FileQuestion, ExternalLink, Search } from 'lucide-react'
import { generateClient } from 'aws-amplify/data'
import { list, getUrl } from 'aws-amplify/storage'
import type { Schema } from '../../../../amplify/data/resource'
import { Card } from '../components/Card'
import { useAuth } from '../contexts/useAuth'

const client = generateClient<Schema>()

type Customer = Schema['Customer']['type']
type Shipment = Schema['Shipment']['type']

/**
 * Orphaned upload: `documents/{identityId}/invoices/{file}` with no shipment
 * segment. These came from the old CustomerDashboard "Upload Invoice" action,
 * which wrote the S3 object but never a database row — so nothing linked the
 * file to a shipment and no admin view could surface it.
 */
const ORPHAN_RE = /^documents\/([^/]+)\/invoices\/([^/]+)$/

type Orphan = {
  s3Key: string
  identityId: string
  fileName: string
  size: number
  uploadedAt: Date
}

/** Keys are `{epoch_ms}-{safeName}`; fall back to the S3 timestamp. */
function parseKey(s3Key: string, size: number, lastModified?: Date): Orphan | null {
  const m = ORPHAN_RE.exec(s3Key)
  if (!m) return null
  const [, identityId, raw] = m
  const head = raw.split('-', 1)[0]
  const hasStamp = /^\d{12,}$/.test(head)
  return {
    s3Key,
    identityId,
    fileName: hasStamp ? raw.slice(head.length + 1) || raw : raw,
    size,
    uploadedAt: hasStamp ? new Date(Number(head)) : (lastModified ?? new Date(0)),
  }
}

/** Drain every page — a single list() call caps at 100 records. */
async function listAll<T>(
  fetchPage: (token?: string) => Promise<{ data?: T[] | null; nextToken?: string | null }>
): Promise<T[]> {
  const out: T[] = []
  let cursor: string | undefined
  do {
    const { data, nextToken } = await fetchPage(cursor)
    out.push(...(data ?? []))
    cursor = nextToken ?? undefined
  } while (cursor)
  return out
}

const fmtDate = (d: Date) =>
  d.getTime() ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const fmtSize = (n: number) =>
  n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`

export const AdminUnassignedUploads = () => {
  const { user } = useAuth()

  const [orphans, setOrphans] = useState<Orphan[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [identityMap, setIdentityMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<Record<string, { customerId?: string; shipmentId?: string }>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const [stored, docs, invoices, customerRows, shipmentRows, dismissed] = await Promise.all([
        list({ path: 'documents/', options: { listAll: true } }),
        listAll<Schema['ShipmentDocument']['type']>((t) =>
          client.models.ShipmentDocument.list({ limit: 1000, nextToken: t })
        ),
        listAll<Schema['Invoice']['type']>((t) =>
          client.models.Invoice.list({ limit: 1000, nextToken: t })
        ),
        listAll<Customer>((t) => client.models.Customer.list({ limit: 1000, nextToken: t })),
        listAll<Shipment>((t) => client.models.Shipment.list({ limit: 1000, nextToken: t })),
        listAll<Schema['DismissedUpload']['type']>((t) =>
          client.models.DismissedUpload.list({ limit: 1000, nextToken: t })
        ),
      ])

      // A file leaves the worklist once it is attached to a shipment or a
      // human has judged it not to be a customer invoice.
      const resolved = new Set<string>([
        ...docs.map((d) => d.s3Key).filter(Boolean),
        ...dismissed.map((d) => d.s3Key).filter(Boolean),
      ])

      const found = (stored.items ?? [])
        .map((i) => parseKey(i.path, i.size ?? 0, i.lastModified))
        .filter((o): o is Orphan => !!o && !resolved.has(o.s3Key))
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())

      // Customer.identityId is only backfilled lazily when a customer opens
      // their dashboard, so it is usually empty. The dependable mapping comes
      // from rows that already pair an identityId with a customer: every
      // Invoice / ShipmentDocument s3Key is `documents/{identityId}/...`.
      const byId = new Map(customerRows.map((c) => [c.id, c]))
      const map: Record<string, string> = {}
      for (const c of customerRows) if (c.identityId) map[c.identityId] = c.id
      for (const row of [...invoices, ...docs]) {
        const key = row.s3Key ?? ''
        if (!key.startsWith('documents/')) continue
        const iid = key.split('/')[1]
        if (map[iid]) continue
        if (row.customerId && byId.has(row.customerId)) {
          map[iid] = row.customerId
          continue
        }
        const sub = (row.customerCognitoSub ?? '').split('::')[0]
        const match = sub ? customerRows.find((c) => c.cognitoSub === sub) : undefined
        if (match) map[iid] = match.id
      }

      setOrphans(found)
      setCustomers(customerRows)
      setShipments(shipmentRows)
      setIdentityMap(map)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load unassigned uploads')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const customerName = (id?: string) => customers.find((c) => c.id === id)?.name

  const chosenCustomerId = (o: Orphan) => picked[o.s3Key]?.customerId ?? identityMap[o.identityId]

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orphans
    return orphans.filter(
      (o) =>
        o.fileName.toLowerCase().includes(q) ||
        (customerName(identityMap[o.identityId]) ?? '').toLowerCase().includes(q)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orphans, search, identityMap, customers])

  const handleView = async (s3Key: string) => {
    try {
      const { url } = await getUrl({ path: s3Key, options: { expiresIn: 300 } })
      window.open(url.toString(), '_blank')
    } catch {
      toast.error('Could not open that file')
    }
  }

  const handleAssign = async (o: Orphan) => {
    const customerId = chosenCustomerId(o)
    const shipmentId = picked[o.s3Key]?.shipmentId
    if (!customerId || !shipmentId) return

    const shipment = shipments.find((s) => s.id === shipmentId)
    if (!shipment) { toast.error('That shipment is no longer available'); return }

    setBusy((b) => ({ ...b, [o.s3Key]: true }))
    try {
      // Records the file's EXISTING key — no copy or delete. The object stays
      // inside the customer's own documents/ prefix, so both the customer and
      // admins keep read access.
      const { errors } = await client.models.ShipmentDocument.create({
        shipmentId,
        customerId,
        s3Key: o.s3Key,
        fileName: o.fileName,
        contentType: o.fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        sizeBytes: o.size,
        docType: 'ORDER_RECEIPT',
        uploadedBy: 'CUSTOMER',
        customerCognitoSub: shipment.customerCognitoSub ?? undefined,
      })
      if (errors?.length) throw new Error(errors[0].message)

      setOrphans((prev) => prev.filter((x) => x.s3Key !== o.s3Key))
      toast.success(`Attached to ${shipment.trackingNumber}`)
    } catch {
      toast.error('Failed to attach — the file is still listed')
    } finally {
      setBusy((b) => ({ ...b, [o.s3Key]: false }))
    }
  }

  const handleDismiss = async (o: Orphan) => {
    setBusy((b) => ({ ...b, [o.s3Key]: true }))
    try {
      const { errors } = await client.models.DismissedUpload.create({
        s3Key: o.s3Key,
        reason: 'Not a customer invoice',
        dismissedBy: user?.email ?? 'unknown',
      })
      if (errors?.length) throw new Error(errors[0].message)

      setOrphans((prev) => prev.filter((x) => x.s3Key !== o.s3Key))
      toast.success('Dismissed')
    } catch {
      toast.error('Failed to dismiss — the file is still listed')
    } finally {
      setBusy((b) => ({ ...b, [o.s3Key]: false }))
    }
  }

  const unknownCount = orphans.filter((o) => !identityMap[o.identityId]).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Unassigned Uploads</h1>
        <p className="text-gray-500 text-sm mt-1">
          Customer invoices that reached storage without being attached to a shipment. Attach each
          one so it appears on the shipment, or dismiss it if it isn&apos;t a customer invoice.
        </p>
      </div>

      {!loading && orphans.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">{orphans.length} file{orphans.length === 1 ? '' : 's'}</span>{' '}
          waiting to be attached
          {unknownCount > 0 && (
            <> — <span className="font-semibold">{unknownCount}</span> could not be matched to a
            customer automatically. Use <span className="font-semibold">View</span> to identify them.</>
          )}
        </div>
      )}

      <Card>
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search file name or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileQuestion className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {orphans.length === 0 ? 'Nothing unassigned — all uploads are attached' : 'No files match your search'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const customerId = chosenCustomerId(o)
              const known = !!identityMap[o.identityId]
              const shipmentId = picked[o.s3Key]?.shipmentId ?? ''
              const options = shipments
                .filter((s) => s.customerId === customerId)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              const isBusy = !!busy[o.s3Key]

              return (
                <div
                  key={o.s3Key}
                  data-testid={`row-${o.s3Key}`}
                  className="border border-gray-200 rounded-xl p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{o.fileName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {fmtDate(o.uploadedAt)} · {fmtSize(o.size)} ·{' '}
                        {known ? (
                          <span className="text-gray-700 font-medium">{customerName(identityMap[o.identityId])}</span>
                        ) : (
                          <span className="text-amber-700 font-medium">Unknown customer</span>
                        )}
                      </p>
                    </div>
                    <button
                      data-role="view"
                      onClick={() => handleView(o.s3Key)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <ExternalLink className="w-4 h-4" /> View
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {!known && (
                      <select
                        data-role="customer"
                        aria-label="Customer"
                        value={picked[o.s3Key]?.customerId ?? ''}
                        onChange={(e) =>
                          setPicked((p) => ({
                            ...p,
                            [o.s3Key]: { customerId: e.target.value || undefined, shipmentId: undefined },
                          }))
                        }
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                      >
                        <option value="">Select customer…</option>
                        {[...customers]
                          .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
                          .map((c) => (
                            <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
                          ))}
                      </select>
                    )}

                    <select
                      data-role="shipment"
                      aria-label="Shipment"
                      value={shipmentId}
                      disabled={!customerId}
                      onChange={(e) =>
                        setPicked((p) => ({
                          ...p,
                          [o.s3Key]: { ...p[o.s3Key], shipmentId: e.target.value || undefined },
                        }))
                      }
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-50"
                    >
                      <option value="">
                        {customerId ? 'Select shipment…' : 'Choose a customer first…'}
                      </option>
                      {options.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.trackingNumber} · {fmtDate(new Date(s.createdAt))}
                        </option>
                      ))}
                    </select>

                    <button
                      data-role="assign"
                      onClick={() => handleAssign(o)}
                      disabled={!customerId || !shipmentId || isBusy}
                      className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isBusy ? 'Working…' : 'Attach'}
                    </button>
                    <button
                      data-role="dismiss"
                      onClick={() => handleDismiss(o)}
                      disabled={isBusy}
                      className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
