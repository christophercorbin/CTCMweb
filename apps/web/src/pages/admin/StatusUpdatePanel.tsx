/**
 * StatusUpdatePanel
 *
 * Self-contained right-sidebar card for updating a shipment's status.
 * Manages its own form state and AppSync mutations; calls onUpdated()
 * so the parent can refresh its data after a successful save.
 */
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Mail, MailX } from 'lucide-react'
import { Button } from '../../components'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../../../../amplify/data/resource'
import { ShipmentStatus } from '../../types'
import {
  SHIPMENT_STATUS_OPTIONS,
  NOTIFY_BY_DEFAULT_STATUSES,
  SHIPMENT_STATUS_META,
} from '../../constants/shipmentStatuses'

const client = generateClient<Schema>()
const STATUS_OPTIONS = SHIPMENT_STATUS_OPTIONS as { value: ShipmentStatus; label: string }[]
const DEFAULT_MESSAGES: Record<string, string> = Object.fromEntries(
  Object.entries(SHIPMENT_STATUS_META).map(([k, v]) => [k, v.defaultMessage])
)

interface StatusUpdatePanelProps {
  shipmentId: string
  trackingNumber: string
  currentStatus: ShipmentStatus
  customerEmail: string | null | undefined
  customerName: string | null | undefined
  onUpdated: () => void
}

export const StatusUpdatePanel = ({
  shipmentId,
  trackingNumber,
  currentStatus,
  customerEmail,
  customerName,
  onUpdated,
}: StatusUpdatePanelProps) => {
  const [selectedStatus, setSelectedStatus] = useState<ShipmentStatus>(currentStatus)
  const [notifyCustomer, setNotifyCustomer] = useState(NOTIFY_BY_DEFAULT_STATUSES.has(currentStatus))
  const [useCustomMessage, setUseCustomMessage] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [updating, setUpdating] = useState(false)

  const handleStatusChange = (status: ShipmentStatus) => {
    setSelectedStatus(status)
    setNotifyCustomer(NOTIFY_BY_DEFAULT_STATUSES.has(status))
    setUseCustomMessage(false)
    setCustomMessage('')
  }

  const willNotify = notifyCustomer && !!customerEmail
  const defaultMsg = DEFAULT_MESSAGES[selectedStatus] ?? ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    try {
      await client.models.Shipment.update({ id: shipmentId, status: selectedStatus })

      const eventNote = useCustomMessage && customMessage.trim()
        ? customMessage.trim()
        : DEFAULT_MESSAGES[selectedStatus] ?? `Status updated to ${selectedStatus}`

      await client.models.ShipmentEvent.create({
        shipmentId,
        status: selectedStatus,
        description: eventNote,
        eventTimestamp: new Date().toISOString(),
      })

      if (notifyCustomer && customerEmail) {
        const messageToSend = useCustomMessage && customMessage.trim()
          ? customMessage.trim()
          : undefined

        const { data: result } = await client.mutations.sendStatusNotification({
          shipmentId,
          customerEmail,
          customerName: customerName ?? '',
          trackingNumber,
          status: selectedStatus,
          customMessage: messageToSend,
        })

        if (result?.success) {
          toast.success('Status updated & customer notified by email')
        } else {
          toast.success('Status updated')
          toast.error('Email notification failed — check SES configuration')
        }
      } else {
        toast.success('Status updated successfully')
      }

      onUpdated()
    } catch (err) {
      console.error(err)
      toast.error('Failed to update shipment status')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-5">Update Status</h2>
      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value as ShipmentStatus)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}{NOTIFY_BY_DEFAULT_STATUSES.has(opt.value) ? ' ✉' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">✉ = sends customer email by default</p>
        </div>

        <div className={`rounded-lg border p-3 ${willNotify ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyCustomer}
              onChange={(e) => setNotifyCustomer(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              {willNotify
                ? <Mail className="w-4 h-4 text-blue-600" />
                : <MailX className="w-4 h-4 text-gray-400" />
              }
              <span className={`text-sm font-medium ${willNotify ? 'text-blue-700' : 'text-gray-600'}`}>
                {willNotify ? 'Email customer' : 'No email notification'}
              </span>
            </div>
          </label>
          {notifyCustomer && customerEmail && (
            <p className="text-xs text-blue-600 mt-1 ml-7">→ {customerEmail}</p>
          )}
          {notifyCustomer && !customerEmail && (
            <p className="text-xs text-red-500 mt-1 ml-7">No customer email on file</p>
          )}
        </div>

        {notifyCustomer && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setUseCustomMessage(false)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  !useCustomMessage
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                }`}
              >
                Default message
              </button>
              <button
                type="button"
                onClick={() => setUseCustomMessage(true)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  useCustomMessage
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                }`}
              >
                Custom message
              </button>
            </div>

            {!useCustomMessage && defaultMsg && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-medium mb-1">Default message preview:</p>
                <p className="text-xs text-gray-700 leading-relaxed">{defaultMsg}</p>
              </div>
            )}

            {useCustomMessage && (
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Write a custom message to the customer..."
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            )}
          </div>
        )}

        <Button type="submit" loading={updating} className="w-full">
          {willNotify ? 'Update & Notify Customer' : 'Update Status'}
        </Button>
      </form>
    </div>
  )
}
