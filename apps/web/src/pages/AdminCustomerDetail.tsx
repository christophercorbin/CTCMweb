import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Mail,
  Phone,
  Package,
  Eye,
  Plus,
  Truck,
  PauseCircle,
  HelpCircle,
} from 'lucide-react'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../../../amplify/data/resource'
import { Badge, Card, CardSkeleton, Button } from '../components'
import { AdminCreateShipmentModal } from './admin/AdminCreateShipmentModal'
import { ShipmentStatus } from '../types'
import { statusLabel } from '../constants/shipmentStatuses'

const client = generateClient<Schema>()

type AppCustomer = Schema['Customer']['type']
type AppShipment = Schema['Shipment']['type']

export const AdminCustomerDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [customer, setCustomer] = useState<AppCustomer | null>(null)
  const [shipments, setShipments] = useState<AppShipment[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const fetchData = async () => {
      try {
        const [customerResult, shipmentsResult] = await Promise.all([
          client.models.Customer.get({ id }),
          client.models.Shipment.list({
            filter: { customerId: { eq: id } },
            limit: 500,
          }),
        ])
        if (cancelled) return
        setCustomer(customerResult.data)
        setShipments(
          (shipmentsResult.data ?? []).sort((a, b) => {
            const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
            const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
            return bTime - aTime
          })
        )
      } catch {
        if (!cancelled) toast.error('Failed to load customer')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [id])

  const activeShipments = shipments.filter(
    (s) => s.status !== 'DELIVERED' && s.status !== 'CANCELLED' && s.status !== 'RETURNED'
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <div className="lg:col-span-2">
            <CardSkeleton />
          </div>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <p className="text-gray-500">Customer not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-gray-500 mt-0.5">
              {activeShipments.length} active shipment{activeShipments.length !== 1 ? 's' : ''} ·{' '}
              {shipments.length} total
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
        >
          New Shipment
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: customer profile ── */}
        <div className="space-y-4">
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Contact</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline truncate">
                  {customer.email}
                </a>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700">{customer.phone}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Air address */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-blue-900 uppercase tracking-wide">
                ✈ Air Freight Address
              </h2>
            </div>
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed bg-blue-50 rounded-lg p-3">
              {customer.airSkyboxAddress || '—'}
            </pre>
          </Card>

          {/* Sea address */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-semibold text-teal-900 uppercase tracking-wide">
                🚢 Sea Freight Address
              </h2>
            </div>
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed bg-teal-50 rounded-lg p-3">
              {customer.seaSkyboxAddress || '—'}
            </pre>
          </Card>
        </div>

        {/* ── Right: shipments ── */}
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Shipments ({shipments.length})
            </h2>

            {shipments.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No shipments yet</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-3 text-sm text-blue-600 hover:underline font-medium"
                >
                  + Create first shipment
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-700">Tracking #</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-700">Type</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-700">Status</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-700">Updated</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-700"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {shipments.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-3">
                          <span className="font-medium text-gray-900">{s.trackingNumber}</span>
                        </td>
                        <td className="px-3 py-3 text-gray-500 text-xs">
                          {s.type === 'AIR' ? '✈ Air' : '🚢 Sea'}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge status={s.status as ShipmentStatus} />
                            {s.customerInstruction === 'HOLD' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                <PauseCircle className="w-3 h-3" /> Hold
                              </span>
                            )}
                            {s.customerInstruction === 'SHIP' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                <Truck className="w-3 h-3" /> Ship
                              </span>
                            )}
                            {!s.customerInstruction &&
                              (s.status === 'MIAMI_WAREHOUSE' || s.status === 'AT_WAREHOUSE') && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                  <HelpCircle className="w-3 h-3" /> Awaiting
                                </span>
                              )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{statusLabel(s.status)}</p>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-400">
                          {s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => navigate(`/admin/shipments/${s.id}`)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-xs"
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
          </Card>
        </div>
      </div>

      {/* ── Create shipment modal ── */}
      {showCreateModal && (
        <AdminCreateShipmentModal
          customers={[customer]}
          preselectedCustomerId={customer.id}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}
