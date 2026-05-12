import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown, X } from 'lucide-react'
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
    control,
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

  // ── Customer combobox state ────────────────────────────────────────
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const comboRef = useRef<HTMLDivElement>(null)

  // Sync display text when preselectedCustomerId resolves after customers load
  useEffect(() => {
    if (preselectedCustomerId && customers.length > 0) {
      const c = customers.find((c) => c.id === preselectedCustomerId)
      if (c) setQuery(`${c.name} — ${c.email}`)
    }
  }, [preselectedCustomerId, customers])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const sortedCustomers = customers.slice().sort((a, b) => a.name.localeCompare(b.name))

  const filteredCustomers = query.trim()
    ? sortedCustomers.filter((c) => {
        const q = query.toLowerCase()
        return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
      })
    : sortedCustomers

  const selectCustomer = useCallback((c: AppCustomer, onChange: (v: string) => void) => {
    onChange(c.id)
    setQuery(`${c.name} — ${c.email}`)
    setOpen(false)
  }, [])

  const clearCustomer = useCallback((onChange: (v: string) => void) => {
    onChange('')
    setQuery('')
    setOpen(false)
  }, [])

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
        shipmentSource: 'ADMIN',
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

  const typeOptions = [
    { value: 'AIR', label: '✈ Air Freight' },
    { value: 'SEA', label: '🚢 Sea Freight' },
  ]

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Shipment for Customer" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* ── Customer combobox ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
          <Controller
            name="customerId"
            control={control}
            render={({ field: { onChange, value } }) => (
              <div ref={comboRef} className="relative">
                <div className={`flex items-center border rounded-lg overflow-hidden transition-shadow ${
                  errors.customerId ? 'border-red-400' : open ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
                }`}>
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 text-sm outline-none bg-white placeholder-gray-400"
                    placeholder={loadingCustomers ? 'Loading customers…' : 'Search by name or email…'}
                    disabled={loadingCustomers}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setOpen(true)
                      if (!e.target.value) onChange('')
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setOpen(false)
                      if (e.key === 'Enter' && filteredCustomers.length > 0) {
                        e.preventDefault()
                        selectCustomer(filteredCustomers[0], onChange)
                      }
                    }}
                  />
                  {value && (
                    <button
                      type="button"
                      onClick={() => clearCustomer(onChange)}
                      className="px-2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <span className="px-2 text-gray-400 pointer-events-none">
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </div>

                {open && !loadingCustomers && (
                  <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {filteredCustomers.length === 0 ? (
                      <li className="px-4 py-3 text-sm text-gray-400">No customers match "{query}"</li>
                    ) : (
                      filteredCustomers.map((c) => (
                        <li
                          key={c.id}
                          onMouseDown={(e) => { e.preventDefault(); selectCustomer(c, onChange) }}
                          className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between group ${
                            c.id === value
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          <span>{c.name}</span>
                          <span className={`text-xs ${c.id === value ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`}>
                            {c.email}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            )}
          />
          {errors.customerId && (
            <p className="mt-1 text-xs text-red-500">{errors.customerId.message}</p>
          )}
        </div>

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
