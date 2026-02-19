import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { Button, Card, CardSkeleton, Badge, Timeline, Select, Textarea } from '../components'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../../../amplify/data/resource'
import { TrackingItem, ShipmentStatus } from '../types'

const client = generateClient<Schema>()

const statusUpdateSchema = z.object({
  status: z.enum(['PENDING', 'IN_TRANSIT', 'CUSTOMS', 'DELIVERED', 'CANCELLED', 'RETURNED']),
  notes: z.string().optional(),
})

type StatusUpdateData = z.infer<typeof statusUpdateSchema>

const statusOptions = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'CUSTOMS', label: 'Customs' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURNED', label: 'Returned' },
]

export const AdminShipmentDetails = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [shipment, setShipment] = useState<Schema['Shipment']['type'] | null>(null)
  const [events, setEvents] = useState<Schema['ShipmentEvent']['type'][]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<StatusUpdateData>({
    resolver: zodResolver(statusUpdateSchema),
    defaultValues: { status: 'PENDING', notes: '' },
  })

  const fetchData = async () => {
    if (!id) return
    try {
      setLoading(true)
      const { data } = await client.models.Shipment.get({ id })
      setShipment(data)
      if (data) {
        reset({
          status: data.status as StatusUpdateData['status'],
          notes: '',
        })
        const { data: eventList } = await client.models.ShipmentEvent.list({
          filter: { shipmentId: { eq: data.id } },
        })
        setEvents(eventList ?? [])
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

  const onSubmit = async (data: StatusUpdateData) => {
    if (!id) return
    setUpdating(true)
    try {
      await client.models.Shipment.update({ id, status: data.status })

      // Create a ShipmentEvent record for the timeline
      if (shipment) {
        await client.models.ShipmentEvent.create({
          shipmentId: id,
          status: data.status,
          description: data.notes ?? `Status updated to ${data.status}`,
          eventTimestamp: new Date().toISOString(),
        })
      }

      toast.success('Status updated successfully')
      fetchData()
    } catch {
      toast.error('Failed to update shipment status')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <CardSkeleton />

  if (!shipment) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/admin/shipments')}
          className="flex items-center gap-2 text-blue-600"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
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

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/admin/shipments')}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Broker Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{shipment.trackingNumber}</h1>
                <p className="text-gray-600 text-sm mt-1">Customer ID: {shipment.customerId}</p>
              </div>
              <Badge status={shipment.status as ShipmentStatus} />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-600">Origin</p>
                <p className="text-lg font-semibold text-gray-900">{shipment.origin ?? '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Destination</p>
                <p className="text-lg font-semibold text-gray-900">{shipment.destination ?? '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Shipping Type</p>
                <p className="text-lg font-semibold text-gray-900">{shipment.type} Freight</p>
              </div>
              {shipment.estimatedDelivery && (
                <div>
                  <p className="text-sm text-gray-600">Estimated Delivery</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(shipment.estimatedDelivery).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {shipment.description && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Description</p>
                <p className="text-gray-900">{shipment.description}</p>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Tracking History</h2>
            {trackingItems.length > 0 ? (
              <Timeline items={trackingItems} />
            ) : (
              <p className="text-gray-600 text-center py-8">No tracking updates yet</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Update Status</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Select
                label="New Status"
                options={statusOptions}
                error={errors.status?.message}
                {...register('status')}
              />
              <Textarea
                label="Notes (Optional)"
                placeholder="Add any notes about this status update..."
                rows={3}
                {...register('notes')}
              />
              <Button type="submit" loading={updating} className="w-full">
                Update Status
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
