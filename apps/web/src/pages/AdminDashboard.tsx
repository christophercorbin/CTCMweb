import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, Package, AlertCircle, Clock, CheckCircle2, Users, PauseCircle, Warehouse, Truck, HelpCircle, Plus } from 'lucide-react'
import { Input, Select, LoadingSkeleton, EmptyState, Badge, Card, Button } from '../components'
import { CustomerManagement } from '../components/CustomerManagement'
import { WarehouseReceiptIntake } from './WarehouseReceiptIntake'
import { AdminCreateShipmentModal } from './admin/AdminCreateShipmentModal'
import { ShipmentStatus } from '../types'
import { SHIPMENT_STATUS_OPTIONS } from '../constants/shipmentStatuses'
import { useShipments } from '../hooks/useShipments'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../../../amplify/data/resource'

const client = generateClient<Schema>()

type DynamoShipment = Schema['Shipment']['type']
type AppCustomer = Schema['Customer']['type']
type AdminTab = 'shipments' | 'customers' | 'receipts'

// Prepend "All Statuses" to the constants-driven option list
const statusOptions = [
  { value: '', label: 'All Statuses' },
  ...SHIPMENT_STATUS_OPTIONS,
]

export const AdminDashboard = () => {
  const navigate = useNavigate()
  const { shipments, loading, error } = useShipments()
  const [activeTab, setActiveTab] = useState<AdminTab>('shipments')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<'' | 'AIR' | 'SEA'>('')
  const [customerMap, setCustomerMap] = useState<Record<string, string>>({})
  const [customerList, setCustomerList] = useState<AppCustomer[]>([])

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForCustomerId, setCreateForCustomerId] = useState<string | null>(null)

  // Fetch all customers once — builds both the name map (for table) and the full list (for create modal)
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const allItems: AppCustomer[] = []
        let cursor: string | undefined
        do {
          const result = await client.models.Customer.list({ limit: 1000, nextToken: cursor })
          allItems.push(...result.data)
          cursor = result.nextToken ?? undefined
        } while (cursor)
        const map: Record<string, string> = {}
        allItems.forEach((c) => { map[c.id] = c.name })
        setCustomerMap(map)
        setCustomerList(allItems)
      } catch { /* non-critical, table degrades gracefully */ }
    }
    loadCustomers()
  }, [])

  const openCreateModal = (customerId?: string) => {
    setCreateForCustomerId(customerId ?? null)
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setCreateForCustomerId(null)
  }

  if (error) {
    toast.error('Failed to load shipments')
  }

  const activeShipments = shipments.filter((s) => s.status !== 'DELIVERED' && s.status !== 'CANCELLED' && s.status !== 'RETURNED')
  const customsShipments = shipments.filter((s) => s.status === 'CUSTOMS_HOLD' || s.status === 'BARBADOS_CUSTOMS')
  const delayedShipments = shipments.filter((s) => s.status === 'RETURNED')
  const heldShipments = shipments.filter((s) => s.customerInstruction === 'HOLD')

  // Total shipment count per customerId — passed to CustomerManagement for card badges
  const shipmentCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    shipments.forEach((s) => {
      counts[s.customerId] = (counts[s.customerId] ?? 0) + 1
    })
    return counts
  }, [shipments])

  const filteredShipments = useMemo(() => {
    const q = search.toLowerCase()
    return shipments
      .filter((s) => statusFilter === '' || s.status === statusFilter)
      .filter((s) => typeFilter === '' || s.type === typeFilter)
      .filter((s) => {
        if (!q) return true
        const customerName = customerMap[s.customerId]?.toLowerCase() ?? ''
        const wrNum = s.warehouseReceiptNumber?.toLowerCase() ?? ''
        return (
          s.trackingNumber.toLowerCase().includes(q) ||
          customerName.includes(q) ||
          wrNum.includes(q)
        )
      })
      .sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return bTime - aTime
      })
  }, [shipments, statusFilter, typeFilter, search, customerMap])

  const MetricCard = ({
    icon: Icon,
    title,
    value,
    subtitle,
    color,
    onClick,
  }: {
    icon: React.ComponentType<{ className?: string }>
    title: string
    value: number
    subtitle: string
    color: string
    onClick?: () => void
  }) => (
    <Card
      className={onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">CargoLink Barbados Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Daily workflow and shipment management</p>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('shipments')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative ${
            activeTab === 'shipments'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="w-5 h-5" />
          Shipments
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative ${
            activeTab === 'customers'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-5 h-5" />
          Customers
        </button>
        <button
          onClick={() => setActiveTab('receipts')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative ${
            activeTab === 'receipts'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Warehouse className="w-5 h-5" />
          Warehouse Receipts
        </button>
      </div>

      {activeTab === 'receipts' ? (
        <WarehouseReceiptIntake onSuccess={() => setActiveTab('shipments')} />
      ) : activeTab === 'customers' ? (
        <CustomerManagement
          onCreateShipment={(c) => openCreateModal(c.id)}
          shipmentCounts={shipmentCounts}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard
              icon={Package}
              title="Active Shipments"
              value={activeShipments.length}
              subtitle="In transit and processing"
              color="bg-blue-600"
            />
            <MetricCard
              icon={AlertCircle}
              title="In Customs"
              value={customsShipments.length}
              subtitle="Requires clearance"
              color="bg-orange-600"
              onClick={() => setStatusFilter('CUSTOMS_HOLD')}
            />
            <MetricCard
              icon={CheckCircle2}
              title="Delivered"
              value={shipments.filter((s) => s.status === 'DELIVERED').length}
              subtitle="Successfully delivered"
              color="bg-green-600"
              onClick={() => setStatusFilter('DELIVERED')}
            />
            <MetricCard
              icon={Clock}
              title="Returned"
              value={delayedShipments.length}
              subtitle="Needs attention"
              color="bg-red-600"
              onClick={() => setStatusFilter('RETURNED')}
            />
            <MetricCard
              icon={PauseCircle}
              title="On Hold"
              value={heldShipments.length}
              subtitle="Customer requested hold"
              color="bg-amber-500"
            />
          </div>

          <Card>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">All Shipments</h2>
                <Button
                  onClick={() => openCreateModal()}
                  variant="primary"
                  icon={<Plus className="w-4 h-4" />}
                  size="sm"
                >
                  New Shipment
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Search by tracking # or customer name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Select
                  options={statusOptions}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                />
                <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm font-medium">
                  {(['', 'AIR', 'SEA'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      className={`flex-1 py-2 transition-colors ${
                        typeFilter === t
                          ? 'bg-brand-navy text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {t === '' ? 'All' : t === 'AIR' ? '✈ Air' : '🚢 Sea'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <LoadingSkeleton />
            ) : filteredShipments.length === 0 ? (
              <EmptyState
                title="No shipments found"
                message={
                  search || statusFilter
                    ? 'Try adjusting your filters'
                    : 'No shipments in the system yet'
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">
                        Tracking #
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">
                        WR#
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">
                        Customer
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">
                        Type
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">
                        Origin → Destination
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">
                        Updated
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredShipments.map((shipment: DynamoShipment) => (
                      <tr key={shipment.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-gray-900 font-medium">
                            {shipment.trackingNumber}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {shipment.warehouseReceiptNumber ? (
                            <span className="text-gray-700 font-mono text-xs">{shipment.warehouseReceiptNumber}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {customerMap[shipment.customerId] ? (
                            <button
                              onClick={() => setSearch(customerMap[shipment.customerId])}
                              className="text-gray-700 hover:text-blue-600 hover:underline text-left"
                              title="Filter by this customer"
                            >
                              {customerMap[shipment.customerId]}
                            </button>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{shipment.type}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {shipment.origin ?? '-'} → {shipment.destination ?? '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge status={shipment.status as ShipmentStatus} />
                            {shipment.customerInstruction === 'HOLD' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200">
                                <PauseCircle className="w-3 h-3" /> Hold
                              </span>
                            )}
                            {shipment.customerInstruction === 'SHIP' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200">
                                <Truck className="w-3 h-3" /> Ship
                              </span>
                            )}
                            {!shipment.customerInstruction &&
                              (shipment.status === 'MIAMI_WAREHOUSE' || shipment.status === 'AT_WAREHOUSE') && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200">
                                <HelpCircle className="w-3 h-3" /> Awaiting
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {shipment.updatedAt
                            ? new Date(shipment.updatedAt).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() =>
                              navigate(`/admin/shipments/${shipment.id}`)
                            }
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                          >
                            <Eye className="w-4 h-4" />
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
      )}

      {showCreateModal && (
        <AdminCreateShipmentModal
          customers={customerList}
          preselectedCustomerId={createForCustomerId}
          onClose={closeCreateModal}
        />
      )}
    </div>
  )
}
