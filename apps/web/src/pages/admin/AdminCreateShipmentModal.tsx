import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../../../../amplify/data/resource'
import { Button, Input, Select, Modal } from '../../components'

const client = generateClient<Schema>()

type AppCustomer = Schema['Customer']['type']

// ── Validation schema ──────────────────────────────────────────────────────────
const schema = z.object({
  customerId: z.string().min(1, 'Please select a customer'),
  trackingNumber: z.string().min(3, 'Tracking number is required'),
  type: z.enum(['AIR', 'SEA'], { message: 'Shipping type is required' }),
  origin: z.string().optional(),
  destination: z.string().optional(),
  description: z.string().optional(),
  estimatedDelivery: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const FIELD_CLS =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

interface Props {
  /**
   * Customer list to populate the dropdown. If omitted, the modal fetches
   * customers itself — useful when opened from pages that don't already hold
   * the list (e.g. AdminCustomerDetail).
   */
  customers?: AppCustomer[]
  /** Pre-select a customer (e.g. when opened from the Customers tab) */
  preselectedCustomerId?: string | null
  onClose: () => void
}

export const AdminCreateShipmentModal = ({
  customers: customersProp,
  preselectedCustomerId,
  onClose,
}: Props) => {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  // If customers weren't supplied, fetch them internally
  const [internalCustomers, setInternalCustomers] = useState<AppCustomer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(!customersProp)

  useEffect(() => {
    if (customersProp) return // already provided
    const fetch = async () => {
      try {
        const all: AppCustomer[] = []
        let cursor: string | undefined
        do {
          const result = await client.models.Customer.list({ limit: 1000, nextToken: cursor })
          all.push(...result.data)
          cursor = result.nextToken ?? undefined
        } while (cursor)
        setInternalCustomers(all)
      } catch {
        toast.error('Failed to load customers')
      } finally {
        setLoadingCustomers(false)
      }
    }
    fetch()
  }, [customersProp])

  const customers = customersProp ?? internalCustomers

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: preselectedCustomerId ?? '',
      type: 'AIR',
    },
  })

  const selectedCustomerId = watch('customerId')
  const selectedType = watch('type')
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)

  const onSubmit = async (data: FormData) => {
    const customer = customers.find((c) => c.id === data.customerId)
    if (!customer) {
      toast.error('Customer not found')
      return
    }
    setSubmitting(true)
    try {
      const { data: shipment, errors: gqlErrors } = await client.models.Shipment.create({
        trackingNumber: data.trackingNumber,
        type: data.type,
        status: 'PENDING',
        origin: data.origin || undefined,
        destination: data.destination || undefined,
        description: data.description || undefined,
        estimatedDelivery: data.estimatedDelivery
          ? new Date(data.estimatedDelivery).toISOString()
          : undefined,
        customerId: customer.id,
        // Critical: lets the customer see this admin-created shipment via
        // allow.ownerDefinedIn("customerCognitoSub")
        customerCognitoSub: customer.cognitoSub ?? undefined,
      })

      if (gqlErrors?.length || !shipment) {
        throw new Error(gqlErrors?.[0]?.message ?? 'Failed to create shipment')
      }

      toast.success(`Shipment ${data.trackingNumber} created for ${customer.name}`)
      navigate(`/admin/shipments/${shipment.id}`)
    } catch (err) {
      const e = err as { message?: string }
      toast.error(e.message ?? 'Failed to create shipment')
    } finally {
      setSubmitting(false)
    }
  }

  const customerOptions = [
    { value: '', label: loadingCustomers ? 'Loading customers…' : 'Select a customer…' },
    ...customers
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ value: c.id, label: `${c.name} — ${c.email}` })),
  ]

  const typeOptions = [
    { value: 'AIR', label: '✈ Air Freight' },
    { value: 'SEA', label: '🚢 Sea Freight' },
  ]

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Shipment for Customer" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* ── Customer picker ── */}
        <Select
          label="Customer"
          options={customerOptions}
          error={errors.customerId?.message}
          disabled={loadingCustomers}
          {...register('customerId')}
        />

        {/* Show the selected customer's relevant skybox address as a hint */}
        {selectedCustomer && (
          <div className="text-xs text-gray-500 bg-blue-50 rounded-lg px-3 py-2 -mt-2">
            <span className="font-medium text-blue-800">Delivery address: </span>
            {selectedType === 'SEA'
              ? (selectedCustomer.seaSkyboxAddress?.split('\n')[0] ?? '—')
              : (selectedCustomer.airSkyboxAddress?.split('\n')[0] ?? '—')}
            {' — '}
            {selectedCustomer.email}
          </div>
        )}

        {/* ── Tracking number + type ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Tracking Number"
            placeholder="e.g., CL-2026-042"
            error={errors.trackingNumber?.message}
            {...register('trackingNumber')}
          />
          <Select
            label="Shipping Type"
            options={typeOptions}
            error={errors.type?.message}
            {...register('type')}
          />
        </div>

        {/* ── Origin / Destination ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Origin"
            placeholder="e.g., Miami, FL"
            {...register('origin')}
          />
          <Input
            label="Destination"
            placeholder="e.g., Bridgetown, Barbados"
            {...register('destination')}
          />
        </div>

        {/* ── Description ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            {...register('description')}
            rows={2}
            placeholder="Shipment contents…"
            className={`${FIELD_CLS} resize-none`}
          />
        </div>

        {/* ── Estimated delivery ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estimated Delivery <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="date"
            {...register('estimatedDelivery')}
            className={FIELD_CLS}
          />
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={submitting} disabled={loadingCustomers} className="flex-1">
            Create Shipment
          </Button>
        </div>
      </form>
    </Modal>
  )
}
