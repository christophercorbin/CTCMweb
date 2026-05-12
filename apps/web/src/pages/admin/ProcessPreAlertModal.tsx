import { useState } from 'react'
import { X, Package, ArrowRight, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../../../../amplify/data/resource'

const client = generateClient<Schema>()

const FIELD =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none'

interface Props {
  preAlert: Schema['Shipment']['type']
  customerName: string
  customerCognitoSub: string | null
  customerEmail: string
  onClose: () => void
}

export const ProcessPreAlertModal = ({
  preAlert,
  customerName,
  customerCognitoSub,
  customerEmail,
  onClose,
}: Props) => {
  // Pre-fill from pre-alert where possible
  const [trackingNumber, setTrackingNumber] = useState(preAlert.trackingNumber ?? '')
  const [warehouseReceiptNumber, setWarehouseReceiptNumber] = useState(preAlert.warehouseReceiptNumber ?? '')
  const [shipmentType, setShipmentType] = useState<'AIR' | 'SEA'>(preAlert.type as 'AIR' | 'SEA' ?? 'AIR')
  const [origin, setOrigin] = useState(preAlert.origin ?? '')
  const [destination, setDestination] = useState(preAlert.destination ?? '')
  const [estimatedDelivery, setEstimatedDelivery] = useState(
    preAlert.estimatedDelivery ? preAlert.estimatedDelivery.slice(0, 10) : ''
  )
  const [receivedBy, setReceivedBy] = useState('')
  const [warehouseLocation, setWarehouseLocation] = useState('SP')
  const [notes, setNotes] = useState(preAlert.description ?? '')
  const [notifyCustomer, setNotifyCustomer] = useState(true)
  const [processing, setProcessing] = useState(false)

  const handleProcess = async () => {
    if (!trackingNumber.trim()) {
      toast.error('Tracking number is required')
      return
    }
    if (!customerCognitoSub) {
      toast.error('Cannot process — customer has not logged in yet. Ask them to log in once first.')
      return
    }

    setProcessing(true)
    try {
      // Build description from notes + receipt meta
      const descriptionParts = [
        notes.trim(),
        receivedBy && `Received by: ${receivedBy}`,
        warehouseLocation && `Warehouse: ${warehouseLocation}`,
        warehouseReceiptNumber && `WR#: ${warehouseReceiptNumber}`,
      ].filter(Boolean)
      const description = descriptionParts.join('\n') || undefined

      // Promote pre-alert to admin-managed shipment + set to MIAMI_WAREHOUSE
      // shipmentSource='ADMIN' is what moves it out of Pre-Alerts into Active Shipments
      await client.models.Shipment.update({
        id: preAlert.id,
        trackingNumber: trackingNumber.trim(),
        type: shipmentType,
        status: 'MIAMI_WAREHOUSE',
        shipmentSource: 'ADMIN',
        customerCognitoSub,
        origin: origin.trim() || undefined,
        destination: destination.trim() || undefined,
        estimatedDelivery: estimatedDelivery
          ? new Date(estimatedDelivery).toISOString()
          : undefined,
        warehouseReceiptNumber: warehouseReceiptNumber.trim() || undefined,
        description,
      })

      // Log a shipment event
      await client.models.ShipmentEvent.create({
        shipmentId: preAlert.id,
        status: 'MIAMI_WAREHOUSE',
        location: warehouseLocation || 'Miami, FL',
        description: [
          'Warehouse receipt processed — pre-alert converted to active shipment',
          receivedBy && `Received by: ${receivedBy}`,
          warehouseReceiptNumber && `WR# ${warehouseReceiptNumber}`,
        ].filter(Boolean).join(' · '),
        eventTimestamp: new Date().toISOString(),
        createdBy: 'ADMIN',
        customerCognitoSub,
      })

      // Notify customer that their package has arrived at Miami warehouse
      if (notifyCustomer && customerEmail) {
        await client.mutations.sendStatusNotification({
          shipmentId: preAlert.id,
          customerEmail,
          customerName,
          trackingNumber: trackingNumber.trim(),
          status: 'MIAMI_WAREHOUSE',
        })
      }

      toast.success(`${trackingNumber} processed — now in Active Shipments`)
      onClose()
    } catch {
      toast.error('Failed to process receipt')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Process Warehouse Receipt</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pre-alert context banner */}
        <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-100 flex items-start gap-3">
          <Bell className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-indigo-800">Pre-alert from {customerName}</span>
            <span className="text-indigo-600 ml-2 font-mono">{preAlert.trackingNumber}</span>
            {preAlert.description && (
              <span className="text-indigo-500 ml-2">· {preAlert.description}</span>
            )}
          </div>
        </div>

        {/* Form body */}
        <div className="px-6 py-5 space-y-5">

          {/* Tracking + WR number — most important fields, full width */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Tracking Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. 1ZW6535X1325401737"
                className={FIELD}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Warehouse Receipt # <span className="text-gray-400 font-normal">(recommended)</span>
              </label>
              <input
                type="text"
                value={warehouseReceiptNumber}
                onChange={(e) => setWarehouseReceiptNumber(e.target.value)}
                placeholder="e.g. W296434"
                className={FIELD}
              />
            </div>
          </div>

          {/* Shipment type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Type</label>
              <select
                value={shipmentType}
                onChange={(e) => setShipmentType(e.target.value as 'AIR' | 'SEA')}
                className={FIELD}
              >
                <option value="AIR">✈ Air Freight</option>
                <option value="SEA">🚢 Sea Freight</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warehouse Location
              </label>
              <input
                type="text"
                value={warehouseLocation}
                onChange={(e) => setWarehouseLocation(e.target.value)}
                placeholder="SP"
                className={FIELD}
              />
            </div>
          </div>

          {/* Origin / Destination */}
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
                className={FIELD}
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
                placeholder="e.g. Bridgetown, Barbados"
                className={FIELD}
              />
            </div>
          </div>

          {/* Received by + Est. delivery */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Received By <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder="Staff name"
                className={FIELD}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Est. Delivery <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
                className={FIELD}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional notes for this shipment…"
              className={`${FIELD} resize-none`}
            />
          </div>

          {/* Customer notification toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={notifyCustomer}
              onChange={(e) => setNotifyCustomer(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">
              Notify <strong>{customerName}</strong> by email that their package has arrived at the Miami warehouse
            </span>
          </label>

          {!customerCognitoSub && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              <strong>Blocked:</strong> This customer hasn't logged in yet so they have no Cognito sub.
              Ask them to log in once to activate their account, then try again.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-500">
            Status will be set to <span className="font-semibold text-gray-700">Miami Warehouse</span> · shipment moves to Active Shipments
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleProcess}
              disabled={processing || !customerCognitoSub}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {processing ? 'Processing…' : (
                <>
                  Process Receipt
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
