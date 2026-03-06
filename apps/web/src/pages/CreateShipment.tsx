import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowLeft, Upload, X, FileText } from 'lucide-react'
import { Button, Input, Textarea, Card, Select } from '../components'
import { generateClient } from 'aws-amplify/data'
import { uploadData } from 'aws-amplify/storage'
import { fetchUserAttributes } from 'aws-amplify/auth'
import type { Schema } from '../../../../amplify/data/resource'

const client = generateClient<Schema>()

const createShipmentSchema = z.object({
  trackingNumber: z.string().min(3, 'Tracking number is required'),
  type: z.enum(['AIR', 'SEA'], { message: 'Shipping type is required' }),
  origin: z.string().min(2, 'Origin is required'),
  destination: z.string().min(2, 'Barbados address is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
})

type CreateShipmentData = z.infer<typeof createShipmentSchema>

const shippingTypeOptions = [
  { value: 'AIR', label: 'Air Freight' },
  { value: 'SEA', label: 'Sea Freight' },
]

export const CreateShipment = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerLoading, setCustomerLoading] = useState(true)
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([])

  useEffect(() => {
    // Primary: read custom:customerId set by the post-confirmation Lambda
    // (works for all users regardless of who created the DynamoDB record)
    fetchUserAttributes()
      .then((attrs) => {
        const cid = attrs['custom:customerId']
        if (cid) {
          setCustomerId(cid)
          setCustomerLoading(false)
          return
        }
        // Fallback: query DynamoDB (works for self-registered users)
        return client.models.Customer.list().then(({ data }) => {
          if (data?.[0]) setCustomerId(data[0].id)
          setCustomerLoading(false)
        })
      })
      .catch(() => {
        client.models.Customer.list().then(({ data }) => {
          if (data?.[0]) setCustomerId(data[0].id)
          setCustomerLoading(false)
        })
      })
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
    const pdfFiles = files.filter((f) => f.type === 'application/pdf')
    if (pdfFiles.length !== files.length) toast.error('Only PDF files are allowed')
    setInvoiceFiles((prev) => [...prev, ...pdfFiles])
  }

  const removeFile = (index: number) => {
    setInvoiceFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: CreateShipmentData) => {
    if (!customerId) {
      toast.error('Customer record not found — please try again')
      return
    }
    setLoading(true)
    try {
      const { data: shipment, errors } = await client.models.Shipment.create({
        trackingNumber: data.trackingNumber,
        type: data.type,
        status: 'PENDING',
        origin: data.origin,
        destination: data.destination,
        description: data.description,
        customerId,
      })

      if (errors || !shipment) {
        throw new Error('Failed to create shipment')
      }

      // Upload invoice documents to documents/{identityId}/... (customers have write access)
      if (invoiceFiles.length > 0) {
        await Promise.all(
          invoiceFiles.map((file) =>
            uploadData({
              path: ({ identityId }) =>
                `documents/${identityId}/shipments/${shipment.id}/${file.name}`,
              data: file,
              options: { contentType: 'application/pdf' },
            }).result
          )
        )
      }

      toast.success('Shipment created successfully')
      setTimeout(() => navigate('/dashboard'), 500)
    } catch {
      toast.error('Failed to create shipment')
    } finally {
      setLoading(false)
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
          <h1 className="text-3xl font-bold text-gray-900">Create Shipment</h1>
          <p className="text-gray-600 mt-1">Create a new freight shipment</p>
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

          <Input
            label="Origin"
            placeholder="e.g., Miami, FL"
            error={errors.origin?.message}
            {...register('origin')}
          />

          <Input
            label="Barbados Address"
            placeholder="e.g., Bridgetown, Barbados"
            error={errors.destination?.message}
            {...register('destination')}
          />

          <Textarea
            label="Description"
            placeholder="Describe the shipment contents..."
            rows={4}
            error={errors.description?.message}
            {...register('description')}
          />

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Invoice Documents
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="invoice-upload"
              />
              <label htmlFor="invoice-upload" className="cursor-pointer flex flex-col items-center">
                <Upload className="w-10 h-10 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click to upload invoice PDFs</span>
                <span className="text-xs text-gray-500 mt-1">PDF files only</span>
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
            <Button type="submit" loading={loading || customerLoading} disabled={customerLoading}>
              {customerLoading ? 'Loading…' : 'Create Shipment'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
