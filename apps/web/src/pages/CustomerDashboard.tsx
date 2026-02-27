import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../../../amplify/data/resource'
import {
  Plus, Search, Eye, Package, Truck, CheckCircle,
  FileText, MapPin, Phone, ChevronRight, ArrowRight,
} from 'lucide-react'
import { LoadingSkeleton, EmptyState } from '../components'
import { useShipments } from '../hooks/useShipments'
import { useAuth } from '../contexts/AuthContext'

const client = generateClient<Schema>()

type StatusFilter = 'all' | 'IN_TRANSIT' | 'DELIVERED' | 'PENDING' | 'CUSTOMS'

const STATUS_META: Record<string, { label: string; dot: string; badge: string }> = {
  PENDING:    { label: 'Pending',    dot: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700 ring-yellow-200' },
  IN_TRANSIT: { label: 'In Transit', dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
  CUSTOMS:    { label: 'In Customs', dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 ring-orange-200' },
  DELIVERED:  { label: 'Delivered',  dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700 ring-green-200' },
  CANCELLED:  { label: 'Cancelled',  dot: 'bg-gray-400',   badge: 'bg-gray-50 text-gray-600 ring-gray-200' },
  RETURNED:   { label: 'Returned',   dot: 'bg-red-400',    badge: 'bg-red-50 text-red-700 ring-red-200' },
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-600 ring-gray-200' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${meta.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
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

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [trackInput, setTrackInput] = useState('')
  const [skybox, setSkybox] = useState<{ air?: string | null; sea?: string | null } | null>(null)

  // Fetch this customer's skybox addresses
  useEffect(() => {
    client.models.Customer.list().then(({ data }) => {
      if (data.length) setSkybox({ air: data[0].airSkyboxAddress, sea: data[0].seaSkyboxAddress })
    }).catch(() => {})
  }, [])

  const stats = useMemo(() => ({
    total:     shipments.length,
    inTransit: shipments.filter((s) => s.status === 'IN_TRANSIT').length,
    delivered: shipments.filter((s) => s.status === 'DELIVERED').length,
    customs:   shipments.filter((s) => s.status === 'CUSTOMS').length,
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <option value="IN_TRANSIT">In Transit</option>
                <option value="CUSTOMS">In Customs</option>
                <option value="DELIVERED">Delivered</option>
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
                      <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Route</th>
                      <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                      <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Type</th>
                      <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Est. Delivery</th>
                      <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((s) => (
                      <tr key={s.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-5 py-3.5">
                          <span className="font-mono font-medium text-gray-900 text-xs">{s.trackingNumber}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-gray-700">
                            <span className="truncate max-w-[90px]">{s.origin ?? '—'}</span>
                            <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="truncate max-w-[90px]">{s.destination ?? 'Barbados'}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={s.status} />
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
                          <button
                            onClick={() => navigate(`/dashboard/shipments/${s.id}`)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
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
                icon: <FileText className="w-4 h-4 text-blue-500" />,
                label: 'View Invoices',
                sub: 'Billing & payments',
                onClick: () => navigate('/invoices'),
              },
              {
                icon: <Package className="w-4 h-4 text-blue-500" />,
                label: 'Pending Packages',
                sub: 'Awaiting processing',
                onClick: () => navigate('/dashboard/pending-packages'),
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
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-1">✈ Air Freight</p>
                  <p className="text-sm text-white font-mono leading-relaxed">
                    {skybox.air ?? <span className="text-blue-300 italic">Not set — contact support</span>}
                  </p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-1">🚢 Sea Freight</p>
                  <p className="text-sm text-white font-mono leading-relaxed">
                    {skybox.sea ?? <span className="text-blue-300 italic">Not set — contact support</span>}
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
