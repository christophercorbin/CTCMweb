import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Mail, MailX } from 'lucide-react'
import { Button, Card, CardSkeleton, Badge, Timeline } from '../components'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../../../amplify/data/resource'
import { TrackingItem, ShipmentStatus } from '../types'

const client = generateClient<Schema>()

// Statuses that default to "notify customer"
const NOTIFY_BY_DEFAULT = new Set([
  'MIAMI_WAREHOUSE',
  'IN_BARBADOS',
  'IN_BARBADOS_SEA',
  'CUSTOMS_HOLD',
  'BARBADOS_CUSTOMS',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELAYED',
])

const STATUS_OPTIONS: { value: ShipmentStatus; label: string }[] = [
  { value: 'PENDING',          label: 'Pending' },
  { value: 'MIAMI_WAREHOUSE',  label: 'Miami Warehouse' },
  { value: 'IN_THE_AIR',       label: 'In the Air' },
  { value: 'IN_BARBADOS',      label: 'In Barbados' },
  { value: 'CUSTOMS_HOLD',     label: 'Customs Hold' },
  { value: 'AT_WAREHOUSE',     label: 'At Warehouse' },
  { value: 'ON_THE_WATER',     label: 'On the Water' },
  { value: 'IN_BARBADOS_SEA',  label: 'In Barbados (Sea)' },
  { value: 'BARBADOS_CUSTOMS', label: 'Barbados Customs' },
  { value: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'DELIVERED',        label: 'Delivered' },
  { value: 'DELAYED',          label: 'Delayed' },
  { value: 'CANCELLED',        label: 'Cancelled' },
  { value: 'RETURNED',         label: 'Returned' },
]

const DEFAULT_MESSAGES: Record<string, string> = {
  MIAMI_WAREHOUSE:  'Your package has been received at our Miami warehouse and is being prepared for shipment to Barbados.',
  IN_THE_AIR:       'Your package has departed from Miami and is currently in transit by air to Barbados.',
  IN_BARBADOS:      'Great news! Your air freight package has arrived in Barbados and is being processed.',
  CUSTOMS_HOLD:     'Your package is currently on hold at customs. Please contact our office for more information or to provide any required documentation.',
  AT_WAREHOUSE:     'Your package has cleared customs and is now at our Barbados warehouse, ready for delivery or pickup.',
  ON_THE_WATER:     'Your sea freight shipment has departed and is currently in transit to Barbados.',
  IN_BARBADOS_SEA:  'Your sea freight shipment has arrived in Barbados and is being processed.',
  BARBADOS_CUSTOMS: 'Your package is currently being processed by Barbados customs. We will notify you once it has been cleared.',
  READY_FOR_PICKUP: 'Your package is ready for pickup at our warehouse. Please bring a valid photo ID. Our hours are Monday–Friday, 8:00 AM – 5:00 PM.',
  OUT_FOR_DELIVERY: 'Your package is out for delivery today. Please ensure someone is available to receive it at your delivery address.',
  DELIVERED:        'Your package has been successfully delivered. Thank you for choosing CTCM!',
  DELAYED:          'Your package has been delayed. We sincerely apologize for the inconvenience and will keep you updated as soon as possible.',
}

export const AdminShipmentDetails = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [shipment, setShipment] = useState<Schema['Shipment']['type'] | null>(null)
  const [customer, setCustomer] = useState<Schema['Customer']['type'] | null>(null)
  const [events, setEvents] = useState<Schema['ShipmentEvent']['type'][]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  // Status update form state
  const [selectedStatus, setSelectedStatus] = useState<ShipmentStatus>('PENDING')
  const [notifyCustomer, setNotifyCustomer] = useState(false)
  const [useCustomMessage, setUseCustomMessage] = useState(false)
  const [customMessage, setCustomMessage] = useState('')

  // When status changes, auto-toggle notify and reset message
  const handleStatusChange = (status: ShipmentStatus) => {
    setSelectedStatus(status)
    setNotifyCustomer(NOTIFY_BY_DEFAULT.has(status))
    setUseCustomMessage(false)
    setCustomMessage('')
  }

  const fetchData = async () => {
    if (!id) return
    try {
      setLoading(true)
      const { data: s } = await client.models.Shipment.get({ id })
      setShipment(s)
      if (s) {
        const initialStatus = (s.status as ShipmentStatus) ?? 'PENDING'
        setSelectedStatus(initialStatus)
        setNotifyCustomer(NOTIFY_BY_DEFAULT.has(initialStatus))

        // Fetch customer record
        const { data: c } = await client.models.Customer.get({ id: s.customerId })
        setCustomer(c)

        const { data: eventList } = await client.models.ShipmentEvent.list({
          filter: { shipmentId: { eq: s.id } },
        })
        setEvents(
          [...(eventList ?? [])].sort(
            (a, b) => new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime()
          )
        )
      }
    } catch {
      toast.error('Failed to load shipment details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !shipment) return
    setUpdating(true)
    try {
      // 1. Update shipment status
      await client.models.Shipment.update({ id, status: selectedStatus })

      // 2. Create timeline event
      const eventNote = useCustomMessage && customMessage.trim()
        ? customMessage.trim()
        : DEFAULT_MESSAGES[selectedStatus] ?? `Status updated to ${selectedStatus}`

      await client.models.ShipmentEvent.create({
        shipmentId: id,
        status: selectedStatus,
        description: eventNote,
        eventTimestamp: new Date().toISOString(),
      })

      // 3. Send email notification if requested
      if (notifyCustomer && customer?.email) {
        const messageToSend = useCustomMessage && customMessage.trim()
          ? customMessage.trim()
          : undefined // Lambda will use default message for the status

        const { data: result } = await client.mutations.sendStatusNotification({
          shipmentId: id,
          customerEmail: customer.email,
          customerName: customer.name,
          trackingNumber: shipment.trackingNumber,
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

      fetchData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to update shipment status')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <CardSkeleton />

  if (!shipment) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-blue-600">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <div className="text-center py-12">
          <p className="text-gray-600">Shipment not found</p>
        </div>
      </div>
    )
  }

  const trackingItems: TrackingItem[] = events.map((event) => ({
    status: event.status as ShipmentStatus,
    location: event.location ?? '',
    timestamp: event.eventTimestamp,
    notes: event.description ?? '',
  }))

  const willNotify = notifyCustomer && !!customer?.email
  const defaultMsg = DEFAULT_MESSAGES[selectedStatus] ?? ''

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/admin/dashboard')}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Broker Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: shipment info + timeline ── */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-mono">{shipment.trackingNumber}</h1>
                <p className="text-gray-500 text-sm mt-1">
                  {customer ? `${customer.name} · ${customer.email}` : `Customer: ${shipment.customerId}`}
                </p>
              </div>
              <Badge status={shipment.status as ShipmentStatus} />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-500">Origin</p>
                <p className="text-base font-semibold text-gray-900">{shipment.origin ?? '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Barbados Address</p>
                <p className="text-base font-semibold text-gray-900">{shipment.destination ?? '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Shipping Type</p>
                <p className="text-base font-semibold text-gray-900">{shipment.type} Freight</p>
              </div>
              {shipment.estimatedDelivery && (
                <div>
                  <p className="text-sm text-gray-500">Est. Delivery</p>
                  <p className="text-base font-semibold text-gray-900">
                    {new Date(shipment.estimatedDelivery).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {shipment.description && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Description / Notes</p>
                <p className="text-gray-700 text-sm whitespace-pre-line">{shipment.description}</p>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-6">Tracking History</h2>
            {trackingItems.length > 0 ? (
              <Timeline items={trackingItems} />
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">No tracking updates yet</p>
            )}
          </Card>
        </div>

        {/* ── Right: update status ── */}
        <div>
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-5">Update Status</h2>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Status select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => handleStatusChange(e.target.value as ShipmentStatus)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}{NOTIFY_BY_DEFAULT.has(opt.value) ? ' ✉' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">✉ = sends customer email by default</p>
              </div>

              {/* Notify toggle */}
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
                {notifyCustomer && customer?.email && (
                  <p className="text-xs text-blue-600 mt-1 ml-7">→ {customer.email}</p>
                )}
                {notifyCustomer && !customer?.email && (
                  <p className="text-xs text-red-500 mt-1 ml-7">No customer email on file</p>
                )}
              </div>

              {/* Message options */}
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
          </Card>
        </div>
      </div>
    </div>
  )
}
