import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  FileText, CheckCircle, Clock, TrendingUp,
  Download, ExternalLink, Search,
} from 'lucide-react'
import { Card } from '../components/Card'
import { generateClient } from 'aws-amplify/data'
import { getUrl } from 'aws-amplify/storage'
import type { Schema } from '../../../../amplify/data/resource'

const client = generateClient<Schema>()

type AppSyncInvoice = Schema['Invoice']['type']

const STATUS_COLORS: Record<string, string> = {
  PAID:      'bg-green-100 text-green-700',
  OVERDUE:   'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  SENT:      'bg-amber-100 text-amber-700',
  DRAFT:     'bg-blue-100 text-blue-700',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export const AdminInvoices = () => {
  const navigate = useNavigate()

  const [invoices, setInvoices] = useState<AppSyncInvoice[]>([])
  const [legacyReceipts, setLegacyReceipts] = useState<AppSyncInvoice[]>([])
  const [migrating, setMigrating] = useState(false)
  const [customerMap, setCustomerMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [markingPaid, setMarkingPaid] = useState<Record<string, boolean>>({})
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingInvoice, setDeletingInvoice] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: invList, errors } = await client.models.Invoice.list()
      if (errors?.length) throw new Error(errors[0].message)

      const sorted = [...(invList ?? [])].sort(
        (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      )
      // Legacy customer order receipts were stored as $0 DRAFT Invoice records.
      // Keep them out of the invoice list/stats; offer one-click migration below.
      const allInvoices = sorted.filter(i => i.notes !== 'Order receipt')
      setLegacyReceipts(sorted.filter(i => i.notes === 'Order receipt'))
      setInvoices(allInvoices)

      // Fetch customer names
      const uniqueIds = [...new Set(allInvoices.map(i => i.customerId).filter((id): id is string => !!id))]
      const results = await Promise.all(uniqueIds.map(id => client.models.Customer.get({ id })))
      const map: Record<string, string> = {}
      results.forEach(({ data: c }) => { if (c) map[c.id] = c.name })
      setCustomerMap(map)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const unpaid  = invoices.filter(i => i.status === 'SENT' || i.status === 'OVERDUE' || i.status === 'DRAFT')
    const paid    = invoices.filter(i => i.status === 'PAID')
    const monthly = invoices.filter(i =>
      i.status === 'PAID' && i.paidAt && new Date(i.paidAt) >= thisMonthStart
    )
    return {
      unpaidCount:    unpaid.length,
      unpaidAmount:   unpaid.reduce((s, i) => s + (i.totalAmount ?? 0), 0),
      paidCount:      paid.length,
      paidAmount:     paid.reduce((s, i) => s + (i.totalAmount ?? 0), 0),
      monthlyEarnings: monthly.reduce((s, i) => s + (i.totalAmount ?? 0), 0),
      monthlyCount:   monthly.length,
    }
  }, [invoices])

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return invoices.filter(inv => {
      const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter
      const matchSearch = !q
        || inv.invoiceNumber?.toLowerCase().includes(q)
        || inv.trackingNumber?.toLowerCase().includes(q)
        || customerMap[inv.customerId]?.toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [invoices, statusFilter, search, customerMap])

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleMarkPaid = async (id: string) => {
    setMarkingPaid(p => ({ ...p, [id]: true }))
    try {
      await client.models.Invoice.update({ id, status: 'PAID', paidAt: new Date().toISOString() })
      toast.success('Invoice marked as paid')
      fetchData()
    } catch {
      toast.error('Failed to update invoice')
    } finally {
      setMarkingPaid(p => ({ ...p, [id]: false }))
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingInvoice(true)
    try {
      await client.models.Invoice.delete({ id })
      toast.success('Invoice deleted')
      setConfirmDeleteId(null)
      fetchData()
    } catch {
      toast.error('Failed to delete invoice')
    } finally {
      setDeletingInvoice(false)
    }
  }

  const handleDownload = async (s3Key: string) => {
    try {
      const { url } = await getUrl({ path: s3Key, options: { expiresIn: 300 } })
      window.open(url.toString(), '_blank')
    } catch {
      toast.error('Failed to download PDF')
    }
  }

  /**
   * One-time migration: move legacy "Order receipt" Invoice records into the
   * dedicated ShipmentDocument model, then delete the Invoice record.
   * Receipts without a shipmentId can't be migrated and are skipped.
   */
  const handleMigrateReceipts = async () => {
    setMigrating(true)
    let migrated = 0
    let skipped = 0
    let failed = 0
    for (const rcpt of legacyReceipts) {
      if (!rcpt.shipmentId || !rcpt.s3Key) { skipped++; continue }
      try {
        const { errors } = await client.models.ShipmentDocument.create({
          shipmentId: rcpt.shipmentId,
          customerId: rcpt.customerId,
          s3Key: rcpt.s3Key,
          fileName: rcpt.s3Key.split('/').pop() ?? 'receipt.pdf',
          contentType: 'application/pdf',
          docType: 'ORDER_RECEIPT',
          uploadedBy: 'CUSTOMER',
          customerCognitoSub: rcpt.customerCognitoSub ?? undefined,
        })
        if (errors?.length) throw new Error(errors[0].message)
        await client.models.Invoice.delete({ id: rcpt.id })
        migrated++
      } catch (err) {
        console.error('Failed to migrate receipt', rcpt.id, err)
        failed++
      }
    }
    setMigrating(false)
    if (failed > 0) {
      toast.error(`Migrated ${migrated}, failed ${failed}${skipped ? `, skipped ${skipped}` : ''}`)
    } else {
      toast.success(`Migrated ${migrated} receipt${migrated === 1 ? '' : 's'}${skipped ? ` (${skipped} skipped — no shipment)` : ''}`)
    }
    fetchData()
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoice Management</h1>
        <p className="text-gray-500 text-sm mt-1">All customer invoices across every shipment</p>
      </div>

      {/* ── Legacy receipt migration banner ── */}
      {legacyReceipts.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 border border-amber-200 bg-amber-50 rounded-lg px-4 py-3">
          <p className="text-sm text-amber-800 flex-1">
            <span className="font-semibold">{legacyReceipts.length} customer receipt{legacyReceipts.length === 1 ? '' : 's'}</span>{' '}
            {legacyReceipts.length === 1 ? 'is' : 'are'} stored as legacy invoice records. They've been
            hidden from this list — migrate them to the new documents system so they appear on their shipments.
          </p>
          <button
            onClick={handleMigrateReceipts}
            disabled={migrating}
            className="shrink-0 px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {migrating ? 'Migrating…' : 'Migrate now'}
          </button>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Unpaid */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Unpaid Invoices</p>
              <p className="text-3xl font-bold text-gray-900 leading-tight">{stats.unpaidCount}</p>
              <p className="text-sm text-amber-600 font-semibold mt-0.5">{fmt(stats.unpaidAmount)} outstanding</p>
            </div>
          </div>
        </Card>

        {/* Paid */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Paid Invoices</p>
              <p className="text-3xl font-bold text-gray-900 leading-tight">{stats.paidCount}</p>
              <p className="text-sm text-green-600 font-semibold mt-0.5">{fmt(stats.paidAmount)} collected</p>
            </div>
          </div>
        </Card>

        {/* Monthly earnings */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-brand-navy">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">
                {new Date().toLocaleString('en-US', { month: 'long' })} Earnings
              </p>
              <p className="text-3xl font-bold text-gray-900 leading-tight">{fmt(stats.monthlyEarnings)}</p>
              <p className="text-sm text-gray-400 mt-0.5">{stats.monthlyCount} invoice{stats.monthlyCount !== 1 ? 's' : ''} paid this month</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Table card ── */}
      <Card>
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customer, invoice #, tracking #…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All statuses</option>
            <option value="SENT">Sent (unpaid)</option>
            <option value="OVERDUE">Overdue</option>
            <option value="DRAFT">Draft</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {invoices.length === 0 ? 'No invoices yet' : 'No invoices match your filters'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Customer</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Invoice #</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Tracking #</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Due</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(inv => (
                  confirmDeleteId === inv.id ? (
                    <tr key={inv.id} className="bg-red-50">
                      <td colSpan={7} className="py-3 px-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-red-700 font-medium">
                            Delete <span className="font-mono">{inv.invoiceNumber}</span>? This cannot be undone.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDelete(inv.id)}
                              disabled={deletingInvoice}
                              className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-1.5 rounded"
                            >
                              {deletingInvoice ? 'Deleting…' : 'Yes, delete'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 border border-gray-300 rounded bg-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-gray-900">
                        {customerMap[inv.customerId] ?? <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="font-mono text-gray-800">{inv.invoiceNumber}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {inv.shipmentId ? (
                          <button
                            onClick={() => navigate(`/admin/shipments/${inv.shipmentId}`)}
                            className="flex items-center gap-1 font-mono text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            {inv.trackingNumber ?? inv.shipmentId.slice(0, 8)}
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-900">
                        {fmt(inv.totalAmount ?? 0)}
                      </td>
                      <td className="py-3 px-3 text-gray-600">{fmtDate(inv.dueDate)}</td>
                      <td className="py-3 px-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          {inv.s3Key && (
                            <button
                              onClick={() => handleDownload(inv.s3Key!)}
                              title="Download PDF"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleMarkPaid(inv.id)}
                              disabled={markingPaid[inv.id]}
                              className="text-xs font-medium text-green-600 hover:text-green-700 disabled:opacity-50 px-2 py-1 border border-green-200 rounded hover:bg-green-50 whitespace-nowrap"
                            >
                              {markingPaid[inv.id] ? 'Saving…' : 'Mark Paid'}
                            </button>
                          )}
                          {inv.shipmentId && (
                            <button
                              onClick={() => navigate(`/admin/shipments/${inv.shipmentId}`)}
                              title="Go to shipment"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDeleteId(inv.id)}
                            className="text-xs font-medium text-red-400 hover:text-red-600 px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-4 text-right">
              Showing {filtered.length} of {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
              {' · '}Total shown: <span className="font-semibold text-gray-600">{fmt(filtered.reduce((s, i) => s + (i.totalAmount ?? 0), 0))}</span>
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
