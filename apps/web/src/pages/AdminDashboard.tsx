import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, Package, AlertCircle, Clock, CheckCircle2, Users } from 'lucide-react'
import { Button, Input, Select, LoadingSkeleton, EmptyState, Badge, Card } from '../components'
import { CustomerManagement } from '../components/CustomerManagement'
import { ShipmentStatus } from '../types'
import { useShipments } from '../hooks/useShipments'
import type { Schema } from '../../../../amplify/data/resource'

type DynamoShipment = Schema['Shipment']['type']
type AdminTab = 'shipments' | 'customers'

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'CUSTOMS', label: 'Customs' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURNED', label: 'Returned' },
]

export const AdminDashboard = () => {
  const navigate = useNavigate()
  const { shipments, loading, error } = useShipments()
  const [activeTab, setActiveTab] = useState<AdminTab>('shipments')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  if (error) {
    toast.error('Failed to load shipments')
  }

  const activeShipments = shipments.filter((s) => s.status !== 'DELIVERED')
  const customsShipments = shipments.filter((s) => s.status === 'CUSTOMS')
  const delayedShipments = shipments.filter((s) => s.status === 'RETURNED')

  const filteredShipments = shipments
    .filter((s) => statusFilter === '' || s.status === statusFilter)
    .filter((s) =>
      s.trackingNumber.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return bTime - aTime
    })

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Broker Dashboard</h1>
          <p className="text-gray-600 mt-1">Daily workflow and shipment management</p>
        </div>
        <Button onClick={() => navigate('/admin/warehouse-receipt')} size="lg">
          <Package className="w-5 h-5 mr-2" />
          New Warehouse Receipt
        </Button>
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
      </div>

      {activeTab === 'customers' ? (
        <CustomerManagement />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              onClick={() => setStatusFilter('CUSTOMS')}
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
          </div>

          <Card>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">All Shipments</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Search by tracking number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Select
                  options={statusOptions}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                />
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
                        <td className="px-4 py-3 text-gray-600">{shipment.type}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {shipment.origin ?? '-'} → {shipment.destination ?? '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge status={shipment.status as ShipmentStatus} />
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
    </div>
  )
}
