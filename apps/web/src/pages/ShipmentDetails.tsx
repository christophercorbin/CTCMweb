import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Upload, Loader2, Truck, PauseCircle, CheckCircle2, FileText, Download, Trash2 } from 'lucide-react'
import { Card, CardSkeleton, Badge, Timeline, ShipmentProgress } from '../components'
import { generateClient } from 'aws-amplify/data'
import { uploadData, getUrl, remove } from 'aws-amplify/storage'
import type { Schema } from '../../../../amplify/data/resource'
import { TrackingItem, ShipmentStatus } from '../types'
import { statusLabel } from '../constants/shipmentStatuses'

const client = generateClient<Schema>()

// Receipts can be PDFs or photos/screenshots
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]

export const ShipmentDetails = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [shipment, setShipment] = useState<Schema['Shipment']['type'] | null>(null)
  const [events, setEvents] = useState<Schema['ShipmentEvent']['type'][]>([])
  const [invoices, setInvoices] = useState<Schema['Invoice']['type'][]>([])
  const [documents, setDocuments] = useState<Schema['ShipmentDocument']['type'][]>([])
  const [loading, setLoading] = useState(true)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle')
  const uploading = uploadStatus === 'uploading'
  const [settingInstruction, setSettingInstruction] = useState(false)
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      try {
        setLoading(true)
        const { data } = await client.models.Shipment.get({ id })
        setShipment(data)

        if (data) {
          const [{ data: eventList }, { data: invoiceList }, { data: docList }] = await Promise.all([
            client.models.ShipmentEvent.list({ filter: { shipmentId: { eq: data.id } } }),
            client.models.Invoice.list({ filter: { shipmentId: { eq: data.id } } }),
            client.models.ShipmentDocument.list({ filter: { shipmentId: { eq: data.id } } }),
          ])
          setEvents(eventList ?? [])
          setInvoices(invoiceList ?? [])
          setDocuments(docList ?? [])
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
        toast.success(`Status updated: ${statusLabel(updated.status)}`)
      },
      error: console.error,
    })

    return () => sub.unsubscribe()
  }, [id])

  // Statuses where the customer can still set a shipping instruction
  const INSTRUCTION_ELIGIBLE = new Set(['PENDING', 'MIAMI_WAREHOUSE', 'AT_WAREHOUSE'])

  const handleSetInstruction = async (instruction: 'SHIP' | 'HOLD') => {
    if (!shipment) return
    setSettingInstruction(true)
    try {
      const { data: updated } = await client.models.Shipment.update({
        id: shipment.id,
        customerInstruction: instruction,
      })
      setShipment(updated)
      toast.success(
        instruction === 'SHIP'
          ? 'Got it — your package will be shipped to Barbados.'
          : 'Got it — your package will be held at the warehouse.'
      )
    } catch {
      toast.error('Failed to save your preference. Please try again.')
    } finally {
      setSettingInstruction(false)
    }
  }

  const handleDownload = async (s3Key: string) => {
    try {
      const { url } = await getUrl({ path: s3Key, options: { expiresIn: 300 } })
      window.open(url.toString(), '_blank')
    } catch {
      toast.error('Failed to open document')
    }
  }

  const handleDeleteInvoice = async (inv: Schema['Invoice']['type']) => {
    setDeletingInvoiceId(inv.id)
    try {
      // Remove from S3 if we have a key
      if (inv.s3Key) {
        await remove({ path: inv.s3Key }).catch(() => {
          // S3 delete failure is non-fatal — record still gets removed
        })
      }
      await client.models.Invoice.delete({ id: inv.id })
      setInvoices((prev) => prev.filter((i) => i.id !== inv.id))
      toast.success('Invoice removed')
    } catch {
      toast.error('Failed to remove invoice')
    } finally {
      setDeletingInvoiceId(null)
    }
  }

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id || !shipment) return

    if (!ALLOWED_DOC_TYPES.includes(file.type)) {
      toast.error('Only PDF and image files are allowed')
      return
    }

    setUploadStatus('uploading')
    try {
      const result = await uploadData({
        path: ({ identityId }) => `documents/${identityId}/shipments/${id}/${Date.now()}-${file.name}`,
        data: file,
        options: { contentType: file.type },
      }).result

      const { data: newDoc } = await client.models.ShipmentDocument.create({
        shipmentId: shipment.id,
        customerId: shipment.customerId,
        s3Key: result.path,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        docType: 'ORDER_RECEIPT',
        uploadedBy: 'CUSTOMER',
        customerCognitoSub: shipment.customerCognitoSub ?? undefined,
      })
      if (newDoc) setDocuments((prev) => [...prev, newDoc])

      toast.success('Receipt uploaded successfully')
      setUploadStatus('success')
      // Keep the confirmed state visible, then reset so another file can be added.
      window.setTimeout(() => setUploadStatus('idle'), 4000)
    } catch {
      toast.error('Failed to upload receipt')
      setUploadStatus('idle')
    } finally {
      e.target.value = ''
    }
  }

  const handleDeleteDocument = async (doc: Schema['ShipmentDocument']['type']) => {
    setDeletingDocId(doc.id)
    try {
      await remove({ path: doc.s3Key }).catch(() => {
        // S3 delete failure is non-fatal — record still gets removed
      })
      await client.models.ShipmentDocument.delete({ id: doc.id })
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      toast.success('Receipt removed')
    } catch {
      toast.error('Failed to remove receipt')
    } finally {
      setDeletingDocId(null)
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
                <p className="text-lg font-semibold text-gray-900">{statusLabel(shipment.status)}</p>
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

        <div className="space-y-6">
          {/* ── Ship / Hold instruction card ── */}
          {INSTRUCTION_ELIGIBLE.has(shipment.status) && (
            <Card>
              <h2 className="text-base font-bold text-gray-900 mb-1">Shipping Preference</h2>
              <p className="text-xs text-gray-500 mb-4">
                Your package has arrived at the warehouse. Let us know how you'd like to proceed.
              </p>

              {shipment.customerInstruction ? (
                /* Instruction already set — show current + change option */
                <div>
                  <div className={`flex items-center gap-3 rounded-xl p-4 mb-3 ${
                    shipment.customerInstruction === 'SHIP'
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-amber-50 border border-amber-200'
                  }`}>
                    {shipment.customerInstruction === 'SHIP'
                      ? <Truck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      : <PauseCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    }
                    <div>
                      <p className={`text-sm font-semibold ${
                        shipment.customerInstruction === 'SHIP' ? 'text-blue-800' : 'text-amber-800'
                      }`}>
                        {shipment.customerInstruction === 'SHIP' ? 'Ship to Barbados' : 'Hold at Warehouse'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Your current preference</p>
                    </div>
                    <CheckCircle2 className={`w-4 h-4 ml-auto ${
                      shipment.customerInstruction === 'SHIP' ? 'text-blue-500' : 'text-amber-500'
                    }`} />
                  </div>
                  <p className="text-xs text-gray-400 text-center mb-2">Need to change your mind?</p>
                  <div className="flex gap-2">
                    {shipment.customerInstruction !== 'SHIP' && (
                      <button
                        onClick={() => handleSetInstruction('SHIP')}
                        disabled={settingInstruction}
                        className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
                      >
                        <Truck className="w-3.5 h-3.5" /> Ship it
                      </button>
                    )}
                    {shipment.customerInstruction !== 'HOLD' && (
                      <button
                        onClick={() => handleSetInstruction('HOLD')}
                        disabled={settingInstruction}
                        className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold text-amber-600 border border-amber-300 rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-colors"
                      >
                        <PauseCircle className="w-3.5 h-3.5" /> Hold it
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* No instruction yet — prominent action buttons */
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSetInstruction('SHIP')}
                    disabled={settingInstruction}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50 transition-colors group"
                  >
                    <Truck className="w-7 h-7 text-blue-500 group-hover:text-blue-700" />
                    <span className="text-sm font-bold text-blue-700">Ship it</span>
                    <span className="text-xs text-gray-400 text-center leading-tight">Send to Barbados</span>
                  </button>
                  <button
                    onClick={() => handleSetInstruction('HOLD')}
                    disabled={settingInstruction}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-amber-200 hover:border-amber-500 hover:bg-amber-50 disabled:opacity-50 transition-colors group"
                  >
                    <PauseCircle className="w-7 h-7 text-amber-500 group-hover:text-amber-700" />
                    <span className="text-sm font-bold text-amber-700">Hold it</span>
                    <span className="text-xs text-gray-400 text-center leading-tight">Keep at warehouse</span>
                  </button>
                </div>
              )}
            </Card>
          )}

          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Receipts & Documents</h2>
            <p className="text-xs text-gray-500 mb-4">
              Upload the store receipt for this shipment (e.g. Amazon, Shopify order confirmation) — PDF or a photo/screenshot. This is required for customs processing.
            </p>

            <label className="block mb-4">
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
                onChange={handleDocumentUpload}
                disabled={uploading}
                className="hidden"
              />
              <span
                className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors w-full px-4 py-2 text-base ${
                  uploadStatus === 'uploading'
                    ? 'opacity-50 cursor-not-allowed bg-gray-200 text-gray-800'
                    : uploadStatus === 'success'
                    ? 'cursor-pointer bg-green-100 text-green-800 hover:bg-green-200'
                    : 'cursor-pointer bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {uploadStatus === 'uploading' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading…
                  </>
                ) : uploadStatus === 'success' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Uploaded successfully — add another?
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Receipt (PDF or image)
                  </>
                )}
              </span>
            </label>

            {documents.length > 0 || invoices.some((inv) => inv.notes === 'Order receipt') ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {doc.contentType?.startsWith('image/') ? 'Image' : 'PDF'} ·{' '}
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <button
                        onClick={() => handleDownload(doc.s3Key)}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        <Download className="w-3.5 h-3.5" />
                        View
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc)}
                        disabled={deletingDocId === doc.id}
                        title="Remove this receipt"
                        className="inline-flex items-center gap-1 text-red-400 hover:text-red-600 text-xs font-medium disabled:opacity-40"
                      >
                        {deletingDocId === doc.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  </div>
                ))}
                {/* Legacy receipts stored as Invoice records (pre-migration) */}
                {invoices.filter((inv) => inv.notes === 'Order receipt').map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">Receipt</p>
                        <p className="text-xs text-gray-500">
                          PDF · {new Date(inv.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {inv.s3Key && (
                        <button
                          onClick={() => handleDownload(inv.s3Key!)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          <Download className="w-3.5 h-3.5" />
                          View
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteInvoice(inv)}
                        disabled={deletingInvoiceId === inv.id}
                        title="Remove this receipt"
                        className="inline-flex items-center gap-1 text-red-400 hover:text-red-600 text-xs font-medium disabled:opacity-40"
                      >
                        {deletingInvoiceId === inv.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No receipts uploaded yet.</p>
            )}
          </Card>

          {invoices.some((inv) => inv.notes !== 'Order receipt') && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Invoices</h2>
              <div className="space-y-2">
                {invoices.filter((inv) => inv.notes !== 'Order receipt').map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{inv.invoiceNumber}</p>
                        <p className="text-xs text-gray-500">
                          {inv.totalAmount ? `$${inv.totalAmount.toFixed(2)}` : 'Document'} ·{' '}
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {inv.s3Key && (
                      <button
                        onClick={() => handleDownload(inv.s3Key!)}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium flex-shrink-0 ml-2"
                      >
                        <Download className="w-3.5 h-3.5" />
                        View
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>  {/* end right column */}
      </div>
    </div>
  )
}
