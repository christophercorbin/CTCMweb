import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowLeft, Upload, X, FileText, CheckCircle2 } from 'lucide-react'
import { Button, Input, Textarea, Card, Select } from '../components'
import { generateClient } from 'aws-amplify/data'
import { uploadData } from 'aws-amplify/storage'
import { fetchUserAttributes } from 'aws-amplify/auth'
import type { Schema } from '../../../../amplify/data/resource'

const client = generateClient<Schema>()

const createShipmentSchema = z.object({
  trackingNumber: z.string().min(3, 'Tracking number is required'),
  type: z.enum(['AIR', 'SEA'], { message: 'Shipping type is required' }),
  description: z.string().min(5, 'Description must be at least 5 characters'),
})

type CreateShipmentData = z.infer<typeof createShipmentSchema>

const shippingTypeOptions = [
  { value: 'AIR', label: 'Air Freight' },
  { value: 'SEA', label: 'Sea Freight' },
]

// Receipts can be PDFs or photos/screenshots
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]
const isAllowedDoc = (f: File) => ALLOWED_DOC_TYPES.includes(f.type)

export const CreateShipment = () => {
  const navigate = useNavigate()
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const submitting = submitStatus === 'submitting'
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerSub, setCustomerSub] = useState<string | null>(null)
  const [customerLoading, setCustomerLoading] = useState(true)
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([])

  useEffect(() => {
    fetchUserAttributes()
      .then(async (attrs) => {
        if (attrs['sub']) setCustomerSub(attrs['sub'])
        // 1. custom:customerId set by post-confirmation Lambda (self-registered users)
        const cid = attrs['custom:customerId']
        if (cid) { setCustomerId(cid); return }

        // 2. Customer.list() — works when allow.owner() or allow.ownerDefinedIn("cognitoSub") match
        // Also now works for admin-created accounts via allow.ownerDefinedIn("email")
        // limit:1000 so auth-filtered records aren't hidden by AppSync's 100-item scan page
        const { data } = await client.models.Customer.list({ limit: 1000 })
        if (data?.[0]) { setCustomerId(data[0].id); return }

        // 3. Explicit email filter — belt-and-suspenders for edge cases
        const email = attrs['email']
        if (email) {
          const { data: byEmail } = await client.models.Customer.list({
            filter: { email: { eq: email } },
          })
          if (byEmail?.[0]) setCustomerId(byEmail[0].id)
        }
      })
      .catch(() => {
        client.models.Customer.list({ limit: 1000 }).then(({ data }) => {
          if (data?.[0]) setCustomerId(data[0].id)
        })
      })
      .finally(() => setCustomerLoading(false))
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateShipmentData>({
    resolver: zodResolver(createShipmentSchema),
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const allowed = files.filter(isAllowedDoc)
    if (allowed.length !== files.length) toast.error('Only PDF and image files are allowed')
    setInvoiceFiles((prev) => [...prev, ...allowed])
  }

  const removeFile = (index: number) => {
    setInvoiceFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: CreateShipmentData) => {
    if (!customerId) {
      toast.error('Customer record not found — please try again')
      return
    }
    setSubmitStatus('submitting')
    try {
      const { data: shipment, errors } = await client.models.Shipment.create({
        trackingNumber: data.trackingNumber,
        type: data.type,
        status: 'PENDING',
        description: data.description,
        customerId,
        shipmentSource: 'CUSTOMER',
      })

      if (errors || !shipment) {
        throw new Error('Failed to create shipment')
      }

      // Upload order receipts — failures are non-fatal (shipment already created)
      if (invoiceFiles.length > 0) {
        const uploadResults = await Promise.allSettled(
          invoiceFiles.map(async (file) => {
            const result = await uploadData({
              path: ({ identityId }) =>
                `documents/${identityId}/shipments/${shipment.id}/${Date.now()}-${file.name}`,
              data: file,
              options: { contentType: file.type },
            }).result
            await client.models.ShipmentDocument.create({
              shipmentId: shipment.id,
              customerId,
              s3Key: result.path,
              fileName: file.name,
              contentType: file.type,
              sizeBytes: file.size,
              docType: 'ORDER_RECEIPT',
              uploadedBy: 'CUSTOMER',
              customerCognitoSub: customerSub ?? undefined,
            })
          })
        )
        const anyFailed = uploadResults.some((r) => r.status === 'rejected')
        if (anyFailed) {
          toast('Pre-alert created — some invoices failed to upload. You can retry from the shipment page.', { icon: '⚠️' })
        } else {
          toast.success('Pre-alert submitted — invoice(s) uploaded successfully')
        }
      } else {
        toast.success('Pre-alert submitted successfully')
      }

      // Show the confirmed state on the button before redirecting so it's clear
      // the submission (and any invoice uploads) succeeded.
      setSubmitStatus('success')
      setTimeout(() => navigate('/dashboard'), 1200)
    } catch {
      toast.error('Failed to submit pre-alert')
      setSubmitStatus('idle')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pre-Alert</h1>
          <p className="text-gray-600 mt-1">Let us know about an incoming shipment</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Tracking Number"
            placeholder="e.g., CL-2026-001"
            error={errors.trackingNumber?.message}
            {...register('trackingNumber')}
          />

          <Select
            label="Shipping Type"
            options={shippingTypeOptions}
            error={errors.type?.message}
            {...register('type')}
          />

          <Textarea
            label="Description"
            placeholder="Describe the shipment contents..."
            rows={4}
            error={errors.description?.message}
            {...register('description')}
          />

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Invoice(s)
              </label>
              <p className="text-xs text-gray-400 mt-0.5">
                Upload your store invoice or receipt (Amazon, Shopify, etc.) for customs processing.
                PDF or photo/screenshot.
              </p>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="invoice-upload"
              />
              <label htmlFor="invoice-upload" className="cursor-pointer flex flex-col items-center">
                <Upload className="w-10 h-10 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click to upload invoice(s) or receipt(s)</span>
                <span className="text-xs text-gray-500 mt-1">PDF or images (JPG, PNG)</span>
              </label>
            </div>

            {invoiceFiles.length > 0 && (
              <div className="space-y-2">
                {invoiceFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting || customerLoading}
              disabled={customerLoading || submitStatus === 'success'}
              icon={submitStatus === 'success' ? CheckCircle2 : undefined}
              className={submitStatus === 'success' ? 'bg-green-600 hover:bg-green-600' : ''}
            >
              {customerLoading
                ? 'Loading…'
                : submitting
                ? 'Submitting…'
                : submitStatus === 'success'
                ? 'Pre-Alert submitted'
                : 'Submit Pre-Alert'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
