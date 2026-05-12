import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, Package, AlertCircle, Clock, CheckCircle2, Users, PauseCircle, Warehouse, Truck, HelpCircle, Bell, Trash2 } from 'lucide-react'
import { Input, Select, LoadingSkeleton, EmptyState, Badge, Card } from '../components'
import { CustomerManagement } from '../components/CustomerManagement'
import { WarehouseReceiptIntake } from './WarehouseReceiptIntake'
import { AdminCreateShipmentModal } from './admin/AdminCreateShipmentModal'
import { ProcessPreAlertModal } from './admin/ProcessPreAlertModal'
import { ShipmentStatus } from '../types'
import { SHIPMENT_STATUS_OPTIONS } from '../constants/shipmentStatuses'
import { useShipments } from '../hooks/useShipments'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../../../amplify/data/resource'

const client = generateClient<Schema>()

// Statuses where admins can set a ship/hold instruction
const INSTRUCTION_ELIGIBLE_STATUSES = new Set(['PENDING', 'MIAMI_WAREHOUSE', 'AT_WAREHOUSE'])

type DynamoShipment = Schema['Shipment']['type']
type AppCustomer = Schema['Customer']['type']
type AdminTab = 'shipments' | 'prealerts' | 'customers' | 'receipts'

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

  // Quick ship/hold action state: tracks which shipment ID is being updated
  const [instructionBusy, setInstructionBusy] = useState<string | null>(null)

  // Pre-alert convert modal state
  const [convertTarget, setConvertTarget] = useState<DynamoShipment | null>(null)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<DynamoShipment | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDeleteShipment = async (shipment: DynamoShipment) => {
    setDeletingId(shipment.id)
    try {
      // Cascade-delete all child records first
      const [pkgs, evts, charges, invs] = await Promise.all([
        client.models.Package.list({ filter: { shipmentId: { eq: shipment.id } } }),
        client.models.ShipmentEvent.list({ filter: { shipmentId: { eq: shipment.id } } }),
        client.models.ShipmentCharge.list({ filter: { shipmentId: { eq: shipment.id } } }),
        client.models.Invoice.list({ filter: { shipmentId: { eq: shipment.id } } }),
      ])
      await Promise.all([
        ...pkgs.data.map(p => client.models.Package.delete({ id: p.id })),
        ...evts.data.map(e => client.models.ShipmentEvent.delete({ id: e.id })),
        ...charges.data.map(c => client.models.ShipmentCharge.delete({ id: c.id })),
        ...invs.data.map(i => client.models.Invoice.delete({ id: i.id })),
      ])
      await client.models.Shipment.delete({ id: shipment.id })
      toast.success(`${shipment.trackingNumber} deleted`)
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete shipment')
    } finally {
      setDeletingId(null)
    }
  }

  const handleQuickInstruction = async (
    shipment: DynamoShipment,
    instruction: 'SHIP' | 'HOLD'
  ) => {
    if (instructionBusy) return
    setInstructionBusy(shipment.id)
    try {
      await client.models.Shipment.update({
        id: shipment.id,
        customerInstruction: instruction,
        instructionSetBy: 'ADMIN',
      })
      await client.models.ShipmentEvent.create({
        shipmentId: shipment.id,
        status: shipment.status as Schema['ShipmentEvent']['type']['status'],
        description:
          instruction === 'SHIP'
            ? 'Admin released shipment for delivery on behalf of customer'
            : 'Admin placed shipment on hold on behalf of customer',
        eventTimestamp: new Date().toISOString(),
        createdBy: 'ADMIN',
        customerCognitoSub: shipment.customerCognitoSub ?? undefined,
      })
      const customer = customerList.find((c) => c.id === shipment.customerId)
      if (customer?.email) {
        await client.mutations.sendStatusNotification({
          shipmentId: shipment.id,
          customerEmail: customer.email,
          customerName: customer.name,
          trackingNumber: shipment.trackingNumber,
          status: shipment.status,
          notificationType: instruction === 'SHIP' ? 'ADMIN_SHIP' : 'ADMIN_HOLD',
        })
      }
      toast.success(
        instruction === 'SHIP'
          ? `${shipment.trackingNumber} released — customer notified`
          : `${shipment.trackingNumber} placed on hold — customer notified`
      )
    } catch {
      toast.error('Failed to set instruction')
    } finally {
      setInstructionBusy(null)
    }
  }

  useEffect(() => {
    if (error) {
      toast.error('Failed to load shipments')
    }
  }, [error])

  // Pre-alerts: customer-submitted shipments, identified by shipmentSource='CUSTOMER'.
  // Amplify auto-populates customerCognitoSub for ALL records regardless of who creates them,
  // so we cannot use that field as a discriminator. shipmentSource is the only reliable signal.
  // When an admin processes a pre-alert via ProcessPreAlertModal, it sets shipmentSource='ADMIN'
  // which moves the record out of pre-alerts and into Active Shipments.
  const preAlerts = useMemo(
    () => shipments.filter((s) => s.shipmentSource === 'CUSTOMER'),
    [shipments]
  )
  // Active shipments: explicitly admin-created/processed (shipmentSource='ADMIN') or legacy records
  // (no shipmentSource — predates the field, treated as admin-managed).
  const adminShipments = useMemo(
    () => shipments.filter((s) => s.shipmentSource !== 'CUSTOMER'),
    [shipments]
  )

  const activeShipments = adminShipments.filter((s) => s.status !== 'DELIVERED' && s.status !== 'CANCELLED' && s.status !== 'RETURNED')
  const customsShipments = adminShipments.filter((s) => s.status === 'CUSTOMS_HOLD' || s.status === 'BARBADOS_CUSTOMS')
  const delayedShipments = adminShipments.filter((s) => s.status === 'RETURNED')
  const heldShipments = adminShipments.filter((s) => s.customerInstruction === 'HOLD')

  // Total shipment count per customerId — passed to CustomerManagement for card badges
  const shipmentCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    adminShipments.forEach((s) => {
      counts[s.customerId] = (counts[s.customerId] ?? 0) + 1
    })
    return counts
  }, [adminShipments])

  const filteredShipments = useMemo(() => {
    const q = search.toLowerCase()
    return adminShipments
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
  }, [adminShipments, statusFilter, typeFilter, search, customerMap])

  const filteredPreAlerts = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return preAlerts
    return preAlerts.filter((s) => {
      const customerName = customerMap[s.customerId]?.toLowerCase() ?? ''
      return s.trackingNumber.toLowerCase().includes(q) || customerName.includes(q)
    })
  }, [preAlerts, search, customerMap])

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
          onClick={() => setActiveTab('prealerts')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative ${
            activeTab === 'prealerts'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Bell className="w-5 h-5" />
          Pre-Alerts
          {preAlerts.length > 0 && (
            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
              {preAlerts.length}
            </span>
          )}
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
      ) : activeTab === 'prealerts' ? (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-500" />
              <h2 className="text-xl font-bold text-gray-900">Customer Pre-Alerts</h2>
              {preAlerts.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                  {preAlerts.length}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">Customers have pre-alerted these shipments — process them once the warehouse receipt arrives</p>
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : filteredPreAlerts.length === 0 ? (
            <EmptyState
              title="No pre-alerts"
              message={search ? 'No pre-alerts match your search' : 'No customers have submitted pre-alerts yet'}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Tracking #</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Customer</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Description</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Submitted</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPreAlerts.map((pa) => (
                    <tr key={pa.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 font-mono">{pa.trackingNumber}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {customerMap[pa.customerId] ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{pa.type}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{pa.description ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {pa.createdAt ? new Date(pa.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setConvertTarget(pa)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                          >
                            <Package className="w-3.5 h-3.5" />
                            Process Receipt
                          </button>
                          <button
                            onClick={() => setDeleteTarget(pa)}
                            title="Delete pre-alert"
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold text-red-500 hover:bg-red-50 border border-red-200 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => navigate(`/admin/shipments/${shipment.id}`)}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                            {INSTRUCTION_ELIGIBLE_STATUSES.has(shipment.status) && (
                              <>
                                <button
                                  onClick={() => handleQuickInstruction(shipment, 'SHIP')}
                                  disabled={instructionBusy === shipment.id || shipment.customerInstruction === 'SHIP'}
                                  title="Release for delivery"
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                                    shipment.customerInstruction === 'SHIP'
                                      ? 'bg-blue-100 text-blue-700 cursor-default'
                                      : 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-40'
                                  }`}
                                >
                                  <Truck className="w-3 h-3" />
                                  {instructionBusy === shipment.id && shipment.customerInstruction !== 'SHIP' ? '…' : 'Ship'}
                                </button>
                                <button
                                  onClick={() => handleQuickInstruction(shipment, 'HOLD')}
                                  disabled={instructionBusy === shipment.id || shipment.customerInstruction === 'HOLD'}
                                  title="Place on hold"
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                                    shipment.customerInstruction === 'HOLD'
                                      ? 'bg-amber-100 text-amber-700 cursor-default'
                                      : 'bg-white border border-amber-200 text-amber-600 hover:bg-amber-50 disabled:opacity-40'
                                  }`}
                                >
                                  <PauseCircle className="w-3 h-3" />
                                  {instructionBusy === shipment.id && shipment.customerInstruction !== 'HOLD' ? '…' : 'Hold'}
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setDeleteTarget(shipment)}
                              title="Delete shipment"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-red-500 hover:bg-red-50 border border-red-200 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
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

      {convertTarget && (
        <ProcessPreAlertModal
          preAlert={convertTarget}
          customerName={customerMap[convertTarget.customerId] ?? 'Unknown Customer'}
          customerCognitoSub={customerList.find((c) => c.id === convertTarget.customerId)?.cognitoSub ?? null}
          customerEmail={customerList.find((c) => c.id === convertTarget.customerId)?.email ?? ''}
          onClose={() => setConvertTarget(null)}
        />
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Delete shipment?</h3>
                <p className="text-sm text-gray-500 font-mono">{deleteTarget.trackingNumber}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              This will permanently delete the shipment and all associated packages, charges, events, and invoices. This cannot be undone.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={!!deletingId}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteShipment(deleteTarget)}
                disabled={!!deletingId}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {deletingId ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
