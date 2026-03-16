import { useState } from 'react'
import type { Schema } from '../../../../amplify/data/resource'
import { CustomerManagement } from '../components/CustomerManagement'
import { AdminCreateShipmentModal } from './admin/AdminCreateShipmentModal'

type AppCustomer = Schema['Customer']['type']

/**
 * Standalone admin Customers page — routed at /admin/customers.
 * Wraps <CustomerManagement> and handles the "Create Shipment for this
 * customer" modal without needing AdminDashboard in the tree.
 */
export const AdminCustomers = () => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForCustomerId, setCreateForCustomerId] = useState<string | null>(null)

  const handleCreateShipment = (customer: AppCustomer) => {
    setCreateForCustomerId(customer.id)
    setShowCreateModal(true)
  }

  const closeModal = () => {
    setShowCreateModal(false)
    setCreateForCustomerId(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-600 mt-1">Manage customer accounts and skybox addresses</p>
      </div>

      <CustomerManagement onCreateShipment={handleCreateShipment} />

      {showCreateModal && (
        <AdminCreateShipmentModal
          preselectedCustomerId={createForCustomerId}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
