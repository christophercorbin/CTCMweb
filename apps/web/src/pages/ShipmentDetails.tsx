import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Upload, Loader2 } from 'lucide-react'
import { Card, CardSkeleton, Badge, Timeline, ShipmentProgress } from '../components'
import { generateClient } from 'aws-amplify/data'
import { uploadData } from 'aws-amplify/storage'
import { getCurrentUser } from 'aws-amplify/auth'
import type { Schema } from '../../../../amplify/data/resource'
import { TrackingItem, ShipmentStatus } from '../types'

const client = generateClient<Schema>()

export const ShipmentDetails = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [shipment, setShipment] = useState<Schema['Shipment']['type'] | null>(null)
  const [events, setEvents] = useState<Schema['ShipmentEvent']['type'][]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      try {
        setLoading(true)
        const { data } = await client.models.Shipment.get({ id })
        setShipment(data)

        if (data) {
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

    fetchData()

    // Real-time subscription for status updates
    const sub = client.models.Shipment.onUpdate({
      filter: { id: { eq: id } },
    }).subscribe({
      next: (updated) => {
        setShipment(updated)
        toast.success(`Status updated: ${updated.status}`)
      },
      error: console.error,
    })

    return () => sub.unsubscribe()
  }, [id])

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return

    if (!file.type.includes('pdf')) {
      toast.error('Only PDF files are allowed')
      return
    }

    setUploading(true)
    try {
      const { username } = await getCurrentUser()
      const key = `documents/${username}/invoices/${id}/${file.name}`
      await uploadData({ path: key, data: file, options: { contentType: 'application/pdf' } }).result
      toast.success('Invoice uploaded successfully')
    } catch {
      toast.error('Failed to upload invoice')
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <CardSkeleton />

  if (!shipment) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-blue-600">
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
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Shipments
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{shipment.trackingNumber}</h1>
                <p className="text-gray-600 text-sm mt-1">
                  Created {shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString() : '-'}
                </p>
              </div>
              <Badge status={shipment.status as ShipmentStatus} />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="text-lg font-semibold text-gray-900">{shipment.type} Freight</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-lg font-semibold text-gray-900">{shipment.status}</p>
              </div>
              {shipment.origin && (
                <div>
                  <p className="text-sm text-gray-600">Origin</p>
                  <p className="text-lg font-semibold text-gray-900">{shipment.origin}</p>
                </div>
              )}
              {shipment.destination && (
                <div>
                  <p className="text-sm text-gray-600">Barbados Address</p>
                  <p className="text-lg font-semibold text-gray-900">{shipment.destination}</p>
                </div>
              )}
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
            <h2 className="text-xl font-bold text-gray-900 mb-6">Shipment Progress</h2>
            <ShipmentProgress status={shipment.status as ShipmentStatus} shippingMethod={shipment.type === 'AIR' ? 'air' : 'sea'} />
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

        <div>
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Invoices</h2>
            <div className="mb-6">
              <label className="block">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleInvoiceUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <span
                  className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full cursor-pointer ${
                    uploading ? 'opacity-50 cursor-not-allowed' : ''
                  } bg-gray-200 text-gray-800 hover:bg-gray-300 px-4 py-2 text-base`}
                >
                  {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Invoice PDF
                </span>
              </label>
            </div>
            <div className="text-sm text-gray-600">
              <p className="mb-2 font-medium">Upload your shipment invoice here.</p>
              <p>Only PDF files are accepted.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
