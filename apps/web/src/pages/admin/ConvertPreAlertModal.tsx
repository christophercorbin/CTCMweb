import { useState } from 'react'
import { X, Package, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../../../../amplify/data/resource'

const client = generateClient<Schema>()

interface Props {
  preAlert: Schema['Shipment']['type']
  customerName: string
  /** Customer's Cognito sub — needed to promote the record to admin-managed */
  customerCognitoSub: string | null
  onClose: () => void
}

export const ConvertPreAlertModal = ({ preAlert, customerName, customerCognitoSub, onClose }: Props) => {
  const [origin, setOrigin] = useState(preAlert.origin ?? '')
  const [destination, setDestination] = useState(preAlert.destination ?? '')
  const [estimatedDelivery, setEstimatedDelivery] = useState(
    preAlert.estimatedDelivery ? preAlert.estimatedDelivery.slice(0, 10) : ''
  )
  const [warehouseReceiptNumber, setWarehouseReceiptNumber] = useState(
    preAlert.warehouseReceiptNumber ?? ''
  )
  const [converting, setConverting] = useState(false)

  const handleConvert = async () => {
    if (!customerCognitoSub) {
      toast.error('Cannot convert — customer has not logged in yet and has no Cognito sub. Ask them to log in once first.')
      return
    }

    setConverting(true)
    try {
      await client.models.Shipment.update({
        id: preAlert.id,
        // Setting customerCognitoSub is what promotes this from a pre-alert
        // to an admin-managed shipment (visible in Active Shipments)
        customerCognitoSub,
        origin: origin.trim() || undefined,
        destination: destination.trim() || undefined,
        estimatedDelivery: estimatedDelivery
          ? new Date(estimatedDelivery).toISOString()
          : undefined,
        warehouseReceiptNumber: warehouseReceiptNumber.trim() || undefined,
      })

      // Log a shipment event
      await client.models.ShipmentEvent.create({
        shipmentId: preAlert.id,
        status: preAlert.status as Schema['ShipmentEvent']['type']['status'],
        description: 'Pre-alert converted to active shipment by admin',
        eventTimestamp: new Date().toISOString(),
        createdBy: 'ADMIN',
        customerCognitoSub,
      })

      toast.success(`${preAlert.trackingNumber} converted to active shipment`)
      onClose()
    } catch {
      toast.error('Failed to convert pre-alert')
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Convert Pre-Alert to Shipment</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pre-alert summary */}
        <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">Customer Pre-Alert</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Tracking #</p>
              <p className="font-semibold text-gray-900 font-mono">{preAlert.trackingNumber}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Customer</p>
              <p className="font-semibold text-gray-900">{customerName}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Type</p>
              <p className="font-semibold text-gray-900">{preAlert.type} Freight</p>
            </div>
            {preAlert.description && (
              <div className="col-span-2">
                <p className="text-gray-500 text-xs">Description</p>
                <p className="text-gray-700">{preAlert.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Admin fields to fill in */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            Fill in any details you have. The shipment will appear in <strong>Active Shipments</strong> immediately after converting.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Origin <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="e.g. Miami, FL"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destination <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Bridgetown, BB"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Est. Delivery <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warehouse Receipt # <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={warehouseReceiptNumber}
                onChange={(e) => setWarehouseReceiptNumber(e.target.value)}
                placeholder="WR-0001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          {!customerCognitoSub && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              <strong>Note:</strong> This customer hasn't logged in yet, so conversion is blocked. Ask them to log in once to activate their account, then try again.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConvert}
            disabled={converting || !customerCognitoSub}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {converting ? 'Converting…' : (
              <>
                Convert to Shipment
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
