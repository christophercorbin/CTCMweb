import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../../../amplify/data/resource'
import {
  Plus, Search, Eye, Package, Truck, CheckCircle,
  FileText, MapPin, Phone, ChevronRight, ArrowRight, Upload, Warehouse, X, PauseCircle, Copy, Check,
} from 'lucide-react'
import { uploadData } from 'aws-amplify/storage'
import toast from 'react-hot-toast'
import { LoadingSkeleton, EmptyState } from '../components'
import { useShipments } from '../hooks/useShipments'
import { useAuth } from '../contexts/useAuth'
import { SHIPMENT_STATUS_META } from '../constants/shipmentStatuses'

const client = generateClient<Schema>()

type StatusFilter = 'all' | 'PENDING' | 'MIAMI_WAREHOUSE' | 'IN_THE_AIR' | 'IN_BARBADOS' | 'CUSTOMS_HOLD' | 'AT_WAREHOUSE' | 'ON_THE_WATER' | 'IN_BARBADOS_SEA' | 'BARBADOS_CUSTOMS' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'DELAYED' | 'CANCELLED' | 'RETURNED'

function StatusBadge({ status }: { status: string }) {
  const meta = (SHIPMENT_STATUS_META as Record<string, { label: string; dot: string; badge: string }>)[status]
  const label = meta?.label ?? status
  const dot = meta?.dot ?? 'bg-gray-400'
  const badge = meta?.badge ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-xl ${color} flex-shrink-0`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export const CustomerDashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { shipments, loading, error } = useShipments()

  const [shipmentIdsWithInvoices, setShipmentIdsWithInvoices] = useState<Set<string>>(new Set())

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [trackInput, setTrackInput] = useState('')
  const [skybox, setSkybox] = useState<{ air?: string | null; sea?: string | null } | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState<'air' | 'sea' | null>(null)

  const handleCopy = (text: string, type: 'air' | 'sea') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const TERMINAL_STATUSES = new Set(['DELIVERED', 'CANCELLED', 'RETURNED'])

  // Fetch this customer's skybox addresses and invoices
  useEffect(() => {
    client.models.Customer.list().then(({ data }) => {
      if (data.length) setSkybox({ air: data[0].airSkyboxAddress, sea: data[0].seaSkyboxAddress })
    }).catch(() => {})

    client.models.Invoice.list().then(({ data }) => {
      const ids = new Set(data.filter((inv) => inv.shipmentId).map((inv) => inv.shipmentId!))
      setShipmentIdsWithInvoices(ids)
    }).catch(() => {})
  }, [])

  const IN_TRANSIT_STATUSES = new Set(['MIAMI_WAREHOUSE', 'IN_THE_AIR', 'ON_THE_WATER', 'IN_BARBADOS', 'IN_BARBADOS_SEA', 'AT_WAREHOUSE', 'OUT_FOR_DELIVERY'])
  const CUSTOMS_STATUSES = new Set(['CUSTOMS_HOLD', 'BARBADOS_CUSTOMS'])

  const stats = useMemo(() => ({
    total:     shipments.length,
    inTransit: shipments.filter((s) => IN_TRANSIT_STATUSES.has(s.status)).length,
    delivered: shipments.filter((s) => s.status === 'DELIVERED').length,
    customs:   shipments.filter((s) => CUSTOMS_STATUSES.has(s.status)).length,
    onHold:    shipments.filter((s) => s.customerInstruction === 'HOLD').length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [shipments])

  const filtered = useMemo(() => {
    return shipments
      .filter((s) => {
        if (search) {
          const q = search.toLowerCase()
          if (!s.trackingNumber.toLowerCase().includes(q) &&
              !s.origin?.toLowerCase().includes(q) &&
              !s.destination?.toLowerCase().includes(q)) return false
        }
        if (statusFilter !== 'all' && s.status !== statusFilter) return false
        if (dateFrom && new Date(s.createdAt) < new Date(dateFrom)) return false
        if (dateTo && new Date(s.createdAt) > new Date(dateTo + 'T23:59:59')) return false
        return true
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [shipments, search, statusFilter, dateFrom, dateTo])

  const handleUploadInvoice = async () => {
    if (!uploadFile) { toast.error('Please select a file'); return }
    setUploading(true)
    try {
      const timestamp = Date.now()
      const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      await uploadData({
        path: ({ identityId }) => `documents/${identityId}/invoices/${timestamp}-${safeName}`,
        data: uploadFile,
        options: { contentType: uploadFile.type || 'application/pdf' },
      }).result
      toast.success('Order receipt uploaded successfully')
      setShowUploadModal(false)
      setUploadFile(null)
    } catch {
      toast.error('Receipt upload failed — please try again')
    } finally {
      setUploading(false)
    }
  }

  const displayName = user?.email?.split('@')[0] ?? 'there'

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, <span className="text-blue-600">{displayName}</span>
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Here's a live overview of your shipments</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/create-shipment')}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Shipment
        </button>
      </div>

      {/* ── Main layout: content + sidebar ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">

        {/* ── Left column ── */}
        <div className="space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard
              icon={<Package className="w-5 h-5 text-blue-600" />}
              label="Total Shipments"
              value={loading ? '—' : stats.total}
              color="bg-blue-50"
            />
            <StatCard
              icon={<Truck className="w-5 h-5 text-sky-600" />}
              label="In Transit"
              value={loading ? '—' : stats.inTransit}
              color="bg-sky-50"
            />
            <StatCard
              icon={<CheckCircle className="w-5 h-5 text-green-600" />}
              label="Delivered"
              value={loading ? '—' : stats.delivered}
              color="bg-green-50"
            />
            <StatCard
              icon={<FileText className="w-5 h-5 text-orange-500" />}
              label="In Customs"
              value={loading ? '—' : stats.customs}
              color="bg-orange-50"
            />
            <StatCard
              icon={<PauseCircle className="w-5 h-5 text-amber-600" />}
              label="On Hold"
              value={loading ? '—' : stats.onHold}
              sub="Held at warehouse"
              color="bg-amber-50"
            />
          </div>

          {/* Shipments Table */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">My Shipments</h2>
            </div>

            {/* Filters */}
            <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tracking number..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="MIAMI_WAREHOUSE">Miami Warehouse</option>
                <option value="IN_THE_AIR">In the Air</option>
                <option value="IN_BARBADOS">In Barbados</option>
                <option value="CUSTOMS_HOLD">Customs Hold</option>
                <option value="AT_WAREHOUSE">At Warehouse</option>
                <option value="ON_THE_WATER">On the Water</option>
                <option value="IN_BARBADOS_SEA">In Barbados (Sea)</option>
                <option value="BARBADOS_CUSTOMS">Barbados Customs</option>
                <option value="READY_FOR_PICKUP">Ready for Pickup</option>
                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                <option value="DELIVERED">Delivered</option>
                <option value="DELAYED">Delayed</option>
              </select>

              {/* Date from */}
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              />
              {(search || statusFilter !== 'all' || dateFrom || dateTo) && (
                <button
                  onClick={() => { setSearch(''); setStatusFilter('all'); setDateFrom(''); setDateTo('') }}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Table body */}
            {loading ? (
              <div className="p-5"><LoadingSkeleton /></div>
            ) : error ? (
              <div className="p-5"><EmptyState title="Error loading shipments" message={error} /></div>
            ) : filtered.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No shipments found"
                  message={search || statusFilter !== 'all' || dateFrom || dateTo
                    ? 'Try adjusting your filters'
                    : 'Create your first shipment to get started'}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Tracking #</th>
                      <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Origin → Barbados</th>
                      <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                      <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Type</th>
                      <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Est. Delivery</th>
                      <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => navigate(`/dashboard/shipments/${s.id}`)}
                        className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-mono font-medium text-gray-900 text-xs">{s.trackingNumber}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-gray-700">
                            <span className="truncate max-w-[90px]">{s.origin ?? '—'}</span>
                            <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="truncate max-w-[90px]">{s.destination ?? 'Barbados, BB'}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <StatusBadge status={s.status} />
                            {s.customerInstruction === 'HOLD' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200">
                                <PauseCircle className="w-3 h-3" /> Hold
                              </span>
                            )}
                            {!shipmentIdsWithInvoices.has(s.id) && !TERMINAL_STATUSES.has(s.status) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200">
                                <Upload className="w-3 h-3" /> Upload receipt
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            s.type === 'AIR'
                              ? 'bg-sky-50 text-sky-700'
                              : 'bg-teal-50 text-teal-700'
                          }`}>
                            {s.type === 'AIR' ? '✈ Air' : '🚢 Sea'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 text-xs">
                          {s.estimatedDelivery
                            ? new Date(s.estimatedDelivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : <span className="text-gray-300">TBD</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 text-blue-600 font-medium text-xs">
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filtered.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
                Showing {filtered.length} of {shipments.length} shipments
              </div>
            )}
          </div>
        </div>

        {/* ── Right sidebar: Quick Actions ── */}
        <div className="space-y-4">

          {/* Track a package */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-500" />
              Track a Package
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && trackInput.trim()) {
                    setSearch(trackInput.trim())
                    setTrackInput('')
                  }
                }}
                placeholder="Enter tracking #"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => { if (trackInput.trim()) { setSearch(trackInput.trim()); setTrackInput('') } }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            <div className="px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
            </div>
            {[
              {
                icon: <Warehouse className="w-4 h-4 text-blue-500" />,
                label: 'Ship or Hold',
                sub: 'Decide on packages at the warehouse',
                onClick: () => navigate('/dashboard/pending-packages'),
              },
              {
                icon: <Upload className="w-4 h-4 text-blue-500" />,
                label: 'Upload Order Receipt',
                sub: 'Required for customs processing',
                onClick: () => setShowUploadModal(true),
              },
              {
                icon: <Phone className="w-4 h-4 text-blue-500" />,
                label: 'Contact Support',
                sub: 'Get help from our team',
                onClick: () => window.open('mailto:support@ctcm.bb'),
              },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-blue-50/50 transition-colors text-left group"
              >
                <div className="p-1.5 bg-blue-50 rounded-lg">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
              </button>
            ))}
          </div>

          {/* Skybox addresses */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-blue-200" />
              <h3 className="text-sm font-semibold">My Skybox Addresses</h3>
            </div>
            {skybox === null ? (
              <p className="text-blue-200 text-xs">Loading addresses...</p>
            ) : (
              <div className="space-y-3">
                {/* Air */}
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide">✈ Air Freight</p>
                    {skybox.air && (
                      <button
                        onClick={() => handleCopy(skybox.air!, 'air')}
                        className="flex items-center gap-1 text-xs text-blue-200 hover:text-white border border-blue-400/50 rounded px-1.5 py-0.5 transition-colors"
                      >
                        {copied === 'air' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied === 'air' ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  {skybox.air
                    ? <pre className="text-sm text-white font-mono leading-relaxed whitespace-pre-wrap">{skybox.air}</pre>
                    : <p className="text-blue-300 italic text-xs">Not set — contact support</p>
                  }
                </div>
                {/* Sea */}
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide">🚢 Sea Freight</p>
                    {skybox.sea && (
                      <button
                        onClick={() => handleCopy(skybox.sea!, 'sea')}
                        className="flex items-center gap-1 text-xs text-blue-200 hover:text-white border border-blue-400/50 rounded px-1.5 py-0.5 transition-colors"
                      >
                        {copied === 'sea' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied === 'sea' ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  {skybox.sea
                    ? <pre className="text-sm text-white font-mono leading-relaxed whitespace-pre-wrap">{skybox.sea}</pre>
                    : <p className="text-blue-300 italic text-xs">Not set — contact support</p>
                  }
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Upload Invoice Modal ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Upload Order Receipt</h2>
                <p className="text-sm text-gray-500 mt-0.5">Store receipt needed for customs (Amazon, Shopify, etc.)</p>
              </div>
              <button
                onClick={() => { setShowUploadModal(false); setUploadFile(null) }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="block">
              <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                uploadFile ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/40'
              }`}>
                <Upload className={`w-8 h-8 mx-auto mb-2 ${uploadFile ? 'text-blue-500' : 'text-gray-400'}`} />
                {uploadFile ? (
                  <p className="text-sm font-medium text-blue-700">{uploadFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700">Click to select a file</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG — max 10 MB</p>
                  </>
                )}
              </div>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleUploadInvoice}
                disabled={!uploadFile || uploading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
              <button
                onClick={() => { setShowUploadModal(false); setUploadFile(null) }}
                className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
