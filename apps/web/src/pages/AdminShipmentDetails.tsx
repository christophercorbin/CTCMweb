import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Mail, MailX, Download, Plus, X, Truck, PauseCircle, Pencil, Trash2, Save } from 'lucide-react'
import { Button, Card, CardSkeleton, Badge, Timeline } from '../components'
import { generateClient } from 'aws-amplify/data'
import { uploadData, getUrl } from 'aws-amplify/storage'
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

const CHARGE_TYPE_OPTIONS = [
  { value: 'FREIGHT',      label: 'Shipping / Freight' },
  { value: 'CUSTOMS_DUTY', label: 'Customs Duty' },
  { value: 'HANDLING',     label: 'Broker / Handling Fee' },
  { value: 'STORAGE',      label: 'Storage' },
  { value: 'INSURANCE',    label: 'Insurance' },
  { value: 'OTHER',        label: 'Other' },
]

const PACKAGE_TYPE_OPTIONS = [
  { value: 'BOX',       label: 'Box' },
  { value: 'ENVELOPE',  label: 'Envelope' },
  { value: 'PALLET',    label: 'Pallet' },
  { value: 'CONTAINER', label: 'Container' },
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
  DELIVERED:        'Your package has been successfully delivered. Thank you for choosing CargoLink Barbados!',
  DELAYED:          'Your package has been delayed. We sincerely apologize for the inconvenience and will keep you updated as soon as possible.',
}

interface ChargeLineItem {
  chargeType: 'FREIGHT' | 'CUSTOMS_DUTY' | 'HANDLING' | 'STORAGE' | 'INSURANCE' | 'OTHER'
  amount: string
  description: string
}

interface PackageFormState {
  packageType: 'BOX' | 'ENVELOPE' | 'PALLET' | 'CONTAINER'
  weight: string
  length: string
  width: string
  height: string
  description: string
  quantity: string
}

const emptyPackageForm = (): PackageFormState => ({
  packageType: 'BOX',
  weight: '', length: '', width: '', height: '',
  description: '', quantity: '1',
})

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

  // Shipment edit state
  const [editingShipment, setEditingShipment] = useState(false)
  const [shipmentEditForm, setShipmentEditForm] = useState({
    trackingNumber: '',
    type: 'AIR' as 'AIR' | 'SEA',
    origin: '',
    destination: '',
    estimatedDelivery: '',
    description: '',
  })
  const [savingShipment, setSavingShipment] = useState(false)

  // Shipment delete state
  const [confirmDeleteShipment, setConfirmDeleteShipment] = useState(false)
  const [deletingShipment, setDeletingShipment] = useState(false)

  // Package state
  const [packages, setPackages] = useState<Schema['Package']['type'][]>([])
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null)
  const [packageEditForm, setPackageEditForm] = useState<PackageFormState>(emptyPackageForm())
  const [savingPackage, setSavingPackage] = useState(false)
  const [confirmDeletePkgId, setConfirmDeletePkgId] = useState<string | null>(null)
  const [deletingPackage, setDeletingPackage] = useState(false)
  const [showAddPackage, setShowAddPackage] = useState(false)
  const [newPackageForm, setNewPackageForm] = useState<PackageFormState>(emptyPackageForm())
  const [addingPackage, setAddingPackage] = useState(false)

  // Invoice state
  const [invoices, setInvoices] = useState<Schema['Invoice']['type'][]>([])
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [invoiceNotes, setInvoiceNotes] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [chargeLines, setChargeLines] = useState<ChargeLineItem[]>([
    { chargeType: 'FREIGHT', amount: '', description: '' }
  ])
  const [markingPaid, setMarkingPaid] = useState<Record<string, boolean>>({})

  // Edit invoice state
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ invoiceNumber: '', dueDate: '', notes: '', status: 'SENT' })
  const [editPdfFile, setEditPdfFile] = useState<File | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete invoice state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingInvoice, setDeletingInvoice] = useState(false)

  const invoiceTotal = chargeLines.reduce((sum, l) => {
    const n = parseFloat(l.amount); return sum + (isNaN(n) ? 0 : n)
  }, 0)

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

        const { data: packageList } = await client.models.Package.list({
          filter: { shipmentId: { eq: s.id } },
        })
        setPackages(packageList ?? [])

        const { data: invoiceList } = await client.models.Invoice.list({
          filter: { shipmentId: { eq: s.id } },
        })
        setInvoices(invoiceList ?? [])
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

  // ── Shipment handlers ──────────────────────────────────────────────

  const startEditShipment = () => {
    if (!shipment) return
    setShipmentEditForm({
      trackingNumber: shipment.trackingNumber ?? '',
      type: (shipment.type as 'AIR' | 'SEA') ?? 'AIR',
      origin: shipment.origin ?? '',
      destination: shipment.destination ?? '',
      estimatedDelivery: shipment.estimatedDelivery
        ? shipment.estimatedDelivery.slice(0, 10)
        : '',
      description: shipment.description ?? '',
    })
    setEditingShipment(true)
  }

  const handleSaveShipmentEdit = async () => {
    if (!shipment || !shipmentEditForm.trackingNumber.trim()) {
      toast.error('Tracking number is required')
      return
    }
    setSavingShipment(true)
    try {
      const { data: updated } = await client.models.Shipment.update({
        id: shipment.id,
        trackingNumber: shipmentEditForm.trackingNumber.trim(),
        type: shipmentEditForm.type,
        origin: shipmentEditForm.origin.trim() || undefined,
        destination: shipmentEditForm.destination.trim() || undefined,
        estimatedDelivery: shipmentEditForm.estimatedDelivery
          ? new Date(shipmentEditForm.estimatedDelivery).toISOString()
          : undefined,
        description: shipmentEditForm.description.trim() || undefined,
      })
      setShipment(updated)
      setEditingShipment(false)
      toast.success('Shipment updated')
    } catch {
      toast.error('Failed to update shipment')
    } finally {
      setSavingShipment(false)
    }
  }

  const handleDeleteShipment = async () => {
    if (!shipment) return
    setDeletingShipment(true)
    try {
      await Promise.all([
        ...packages.map(p => client.models.Package.delete({ id: p.id })),
        ...events.map(e => client.models.ShipmentEvent.delete({ id: e.id })),
        ...invoices.map(i => client.models.Invoice.delete({ id: i.id })),
      ])
      await client.models.Shipment.delete({ id: shipment.id })
      toast.success('Shipment deleted')
      navigate('/admin/dashboard')
    } catch {
      toast.error('Failed to delete shipment')
    } finally {
      setDeletingShipment(false)
    }
  }

  // ── Package handlers ───────────────────────────────────────────────

  const startEditPackage = (pkg: Schema['Package']['type']) => {
    setEditingPackageId(pkg.id)
    setPackageEditForm({
      packageType: (pkg.packageType ?? 'BOX') as 'BOX' | 'ENVELOPE' | 'PALLET' | 'CONTAINER',
      weight: pkg.weight?.toString() ?? '',
      length: pkg.length?.toString() ?? '',
      width: pkg.width?.toString() ?? '',
      height: pkg.height?.toString() ?? '',
      description: pkg.description ?? '',
      quantity: pkg.quantity?.toString() ?? '1',
    })
  }

  const handleSavePackageEdit = async () => {
    if (!editingPackageId) return
    setSavingPackage(true)
    try {
      await client.models.Package.update({
        id: editingPackageId,
        packageType: packageEditForm.packageType,
        weight: packageEditForm.weight ? parseFloat(packageEditForm.weight) : undefined,
        length: packageEditForm.length ? parseFloat(packageEditForm.length) : undefined,
        width: packageEditForm.width ? parseFloat(packageEditForm.width) : undefined,
        height: packageEditForm.height ? parseFloat(packageEditForm.height) : undefined,
        description: packageEditForm.description.trim() || undefined,
        quantity: packageEditForm.quantity ? parseInt(packageEditForm.quantity) : 1,
      })
      toast.success('Package updated')
      setEditingPackageId(null)
      fetchData()
    } catch {
      toast.error('Failed to update package')
    } finally {
      setSavingPackage(false)
    }
  }

  const handleDeletePackage = async (pkgId: string) => {
    setDeletingPackage(true)
    try {
      await client.models.Package.delete({ id: pkgId })
      toast.success('Package removed')
      setConfirmDeletePkgId(null)
      fetchData()
    } catch {
      toast.error('Failed to remove package')
    } finally {
      setDeletingPackage(false)
    }
  }

  const handleAddPackage = async () => {
    if (!shipment) return
    setAddingPackage(true)
    try {
      await client.models.Package.create({
        shipmentId: shipment.id,
        packageType: newPackageForm.packageType,
        weight: newPackageForm.weight ? parseFloat(newPackageForm.weight) : undefined,
        weightUnit: 'lb',
        length: newPackageForm.length ? parseFloat(newPackageForm.length) : undefined,
        width: newPackageForm.width ? parseFloat(newPackageForm.width) : undefined,
        height: newPackageForm.height ? parseFloat(newPackageForm.height) : undefined,
        dimensionUnit: 'in',
        description: newPackageForm.description.trim() || undefined,
        quantity: newPackageForm.quantity ? parseInt(newPackageForm.quantity) : 1,
      })
      toast.success('Package added')
      setShowAddPackage(false)
      setNewPackageForm(emptyPackageForm())
      fetchData()
    } catch {
      toast.error('Failed to add package')
    } finally {
      setAddingPackage(false)
    }
  }

  // ── Status update ──────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !shipment) return
    setUpdating(true)
    try {
      await client.models.Shipment.update({ id, status: selectedStatus })

      const eventNote = useCustomMessage && customMessage.trim()
        ? customMessage.trim()
        : DEFAULT_MESSAGES[selectedStatus] ?? `Status updated to ${selectedStatus}`

      await client.models.ShipmentEvent.create({
        shipmentId: id,
        status: selectedStatus,
        description: eventNote,
        eventTimestamp: new Date().toISOString(),
      })

      if (notifyCustomer && customer?.email) {
        const messageToSend = useCustomMessage && customMessage.trim()
          ? customMessage.trim()
          : undefined

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

  // ── Invoice handlers ───────────────────────────────────────────────

  const handleCreateInvoice = async () => {
    if (!shipment || !customer?.cognitoSub) {
      toast.error('Customer Cognito sub not available — cannot create invoice')
      return
    }
    if (!invoiceNumber.trim()) {
      toast.error('Invoice number is required')
      return
    }
    const validCharges = chargeLines.filter(l => {
      const n = parseFloat(l.amount)
      return !isNaN(n) && n > 0
    })
    if (validCharges.length === 0) {
      toast.error('At least one charge with an amount > 0 is required')
      return
    }

    setCreatingInvoice(true)
    try {
      for (const line of validCharges) {
        await client.models.ShipmentCharge.create({
          shipmentId: shipment.id,
          chargeType: line.chargeType,
          amount: parseFloat(line.amount),
          description: line.description || undefined,
          customerCognitoSub: customer.cognitoSub,
        })
      }

      const { data: newInvoice, errors } = await client.models.Invoice.create({
        customerId: shipment.customerId,
        shipmentId: shipment.id,
        invoiceNumber: invoiceNumber.trim(),
        totalAmount: invoiceTotal,
        status: 'SENT',
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        notes: invoiceNotes.trim() || undefined,
        customerCognitoSub: customer.cognitoSub,
        trackingNumber: shipment.trackingNumber,
      })

      if (errors?.length || !newInvoice) {
        throw new Error(errors?.[0]?.message ?? 'Invoice creation failed')
      }

      if (pdfFile) {
        const s3Key = `invoices/${customer.cognitoSub}/${newInvoice.id}.pdf`
        await uploadData({ path: s3Key, data: pdfFile, options: { contentType: 'application/pdf' } }).result
        await client.models.Invoice.update({ id: newInvoice.id, s3Key })
      }

      toast.success('Invoice created successfully')
      setShowInvoiceForm(false)
      setInvoiceNumber('')
      setDueDate('')
      setInvoiceNotes('')
      setPdfFile(null)
      setChargeLines([{ chargeType: 'FREIGHT', amount: '', description: '' }])
      fetchData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to create invoice')
    } finally {
      setCreatingInvoice(false)
    }
  }

  const handleMarkPaid = async (invoiceId: string) => {
    setMarkingPaid(prev => ({ ...prev, [invoiceId]: true }))
    try {
      await client.models.Invoice.update({ id: invoiceId, status: 'PAID', paidAt: new Date().toISOString() })
      toast.success('Invoice marked as paid')
      fetchData()
    } catch {
      toast.error('Failed to mark invoice as paid')
    } finally {
      setMarkingPaid(prev => ({ ...prev, [invoiceId]: false }))
    }
  }

  const handleDownloadInvoice = async (s3Key: string) => {
    try {
      const { url } = await getUrl({ path: s3Key, options: { expiresIn: 300 } })
      window.open(url.toString(), '_blank')
    } catch {
      toast.error('Failed to download invoice PDF')
    }
  }

  const startEditInvoice = (inv: Schema['Invoice']['type']) => {
    setEditingInvoiceId(inv.id)
    setEditForm({
      invoiceNumber: inv.invoiceNumber ?? '',
      dueDate: inv.dueDate ? inv.dueDate.slice(0, 10) : '',
      notes: inv.notes ?? '',
      status: inv.status ?? 'SENT',
    })
    setEditPdfFile(null)
  }

  const handleSaveEdit = async () => {
    if (!editingInvoiceId || !editForm.invoiceNumber.trim()) {
      toast.error('Invoice number is required')
      return
    }
    setSavingEdit(true)
    try {
      await client.models.Invoice.update({
        id: editingInvoiceId,
        invoiceNumber: editForm.invoiceNumber.trim(),
        dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : undefined,
        notes: editForm.notes.trim() || undefined,
        status: editForm.status as Schema['Invoice']['type']['status'],
      })

      if (editPdfFile && customer?.cognitoSub) {
        const s3Key = `invoices/${customer.cognitoSub}/${editingInvoiceId}.pdf`
        await uploadData({ path: s3Key, data: editPdfFile, options: { contentType: 'application/pdf' } }).result
        await client.models.Invoice.update({ id: editingInvoiceId, s3Key })
      }

      toast.success('Invoice updated')
      setEditingInvoiceId(null)
      fetchData()
    } catch {
      toast.error('Failed to update invoice')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    setDeletingInvoice(true)
    try {
      await client.models.Invoice.delete({ id: invoiceId })
      toast.success('Invoice deleted')
      setConfirmDeleteId(null)
      fetchData()
    } catch {
      toast.error('Failed to delete invoice')
    } finally {
      setDeletingInvoice(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────

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

  // Shared mini field style
  const fieldCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/admin/dashboard')}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: shipment info + packages + tracking + invoices ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── Shipment Info Card ── */}
          <Card>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-mono">
                  {shipment.trackingNumber}
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  {customer ? `${customer.name} · ${customer.email}` : `Customer: ${shipment.customerId}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge status={shipment.status as ShipmentStatus} />
                {!editingShipment && (
                  <>
                    <button
                      onClick={startEditShipment}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 border border-blue-200 rounded hover:bg-blue-50"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => setConfirmDeleteShipment(true)}
                      className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Delete confirmation banner */}
            {confirmDeleteShipment && (
              <div className="mb-4 flex items-center justify-between border border-red-200 rounded-lg px-4 py-3 bg-red-50">
                <p className="text-sm text-red-700 font-medium">
                  Delete <span className="font-mono">{shipment.trackingNumber}</span>? This will also delete all packages, events, and invoices. This cannot be undone.
                </p>
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  <button
                    onClick={handleDeleteShipment}
                    disabled={deletingShipment}
                    className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-1.5 rounded"
                  >
                    {deletingShipment ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteShipment(false)}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 border border-gray-300 rounded bg-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {editingShipment ? (
              /* Edit form */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tracking Number *</label>
                    <input
                      type="text"
                      value={shipmentEditForm.trackingNumber}
                      onChange={e => setShipmentEditForm(f => ({ ...f, trackingNumber: e.target.value }))}
                      className={fieldCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={shipmentEditForm.type}
                      onChange={e => setShipmentEditForm(f => ({ ...f, type: e.target.value as 'AIR' | 'SEA' }))}
                      className={fieldCls}
                    >
                      <option value="AIR">Air Freight</option>
                      <option value="SEA">Sea Freight</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Origin</label>
                    <input
                      type="text"
                      value={shipmentEditForm.origin}
                      onChange={e => setShipmentEditForm(f => ({ ...f, origin: e.target.value }))}
                      className={fieldCls}
                      placeholder="Miami, FL"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Barbados Address</label>
                    <input
                      type="text"
                      value={shipmentEditForm.destination}
                      onChange={e => setShipmentEditForm(f => ({ ...f, destination: e.target.value }))}
                      className={fieldCls}
                      placeholder="Bridgetown, Barbados"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Est. Delivery</label>
                    <input
                      type="date"
                      value={shipmentEditForm.estimatedDelivery}
                      onChange={e => setShipmentEditForm(f => ({ ...f, estimatedDelivery: e.target.value }))}
                      className={fieldCls}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description / Notes</label>
                  <textarea
                    value={shipmentEditForm.description}
                    onChange={e => setShipmentEditForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className={`${fieldCls} resize-none`}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleSaveShipmentEdit} loading={savingShipment} className="flex-1">
                    <Save className="w-3.5 h-3.5 mr-1" /> Save Changes
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditingShipment(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              /* Read-only details */
              <>
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

                {shipment.customerInstruction && (
                  <div className={`flex items-center gap-3 rounded-lg px-4 py-3 mb-4 ${
                    shipment.customerInstruction === 'HOLD'
                      ? 'bg-amber-50 border border-amber-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}>
                    {shipment.customerInstruction === 'HOLD'
                      ? <PauseCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      : <Truck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    }
                    <div>
                      <p className={`text-sm font-semibold ${
                        shipment.customerInstruction === 'HOLD' ? 'text-amber-800' : 'text-blue-800'
                      }`}>
                        Customer instruction: {shipment.customerInstruction === 'HOLD' ? 'Hold at warehouse' : 'Ship to Barbados'}
                      </p>
                      <p className="text-xs text-gray-500">Set by customer</p>
                    </div>
                  </div>
                )}

                {shipment.description && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Description / Notes</p>
                    <p className="text-gray-700 text-sm whitespace-pre-line">{shipment.description}</p>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* ── Packages Card ── */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Packages</h2>
              {!showAddPackage && (
                <button
                  onClick={() => setShowAddPackage(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4" /> Add Package
                </button>
              )}
            </div>

            {packages.length > 0 ? (
              <div className="space-y-2 mb-4">
                {packages.map(pkg => (
                  <div key={pkg.id}>
                    {editingPackageId === pkg.id ? (
                      /* Edit form */
                      <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-blue-900">Edit Package</p>
                          <button onClick={() => setEditingPackageId(null)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                            <select
                              value={packageEditForm.packageType}
                              onChange={e => setPackageEditForm(f => ({ ...f, packageType: e.target.value as PackageFormState['packageType'] }))}
                              className={fieldCls}
                            >
                              {PACKAGE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Qty</label>
                            <input type="number" min="1" value={packageEditForm.quantity}
                              onChange={e => setPackageEditForm(f => ({ ...f, quantity: e.target.value }))}
                              className={fieldCls} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Weight (lb)</label>
                            <input type="number" step="0.01" value={packageEditForm.weight}
                              onChange={e => setPackageEditForm(f => ({ ...f, weight: e.target.value }))}
                              className={fieldCls} placeholder="0.00" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">L (in)</label>
                            <input type="number" step="0.01" value={packageEditForm.length}
                              onChange={e => setPackageEditForm(f => ({ ...f, length: e.target.value }))}
                              className={fieldCls} placeholder="0.00" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">W (in)</label>
                            <input type="number" step="0.01" value={packageEditForm.width}
                              onChange={e => setPackageEditForm(f => ({ ...f, width: e.target.value }))}
                              className={fieldCls} placeholder="0.00" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">H (in)</label>
                            <input type="number" step="0.01" value={packageEditForm.height}
                              onChange={e => setPackageEditForm(f => ({ ...f, height: e.target.value }))}
                              className={fieldCls} placeholder="0.00" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                            <input type="text" value={packageEditForm.description}
                              onChange={e => setPackageEditForm(f => ({ ...f, description: e.target.value }))}
                              className={fieldCls} placeholder="Contents" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSavePackageEdit} loading={savingPackage} className="flex-1">
                            Save
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditingPackageId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : confirmDeletePkgId === pkg.id ? (
                      /* Delete confirmation */
                      <div className="flex items-center justify-between border border-red-200 rounded-lg px-4 py-3 bg-red-50">
                        <p className="text-sm text-red-700 font-medium">Remove this package? Cannot be undone.</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeletePackage(pkg.id)}
                            disabled={deletingPackage}
                            className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-1.5 rounded"
                          >
                            {deletingPackage ? 'Removing…' : 'Yes, remove'}
                          </button>
                          <button
                            onClick={() => setConfirmDeletePkgId(null)}
                            className="text-xs font-medium text-gray-600 px-3 py-1.5 border border-gray-300 rounded bg-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal row */
                      <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 bg-gray-50">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {pkg.packageType ?? 'Package'}
                            {pkg.quantity && pkg.quantity > 1 ? ` × ${pkg.quantity}` : ''}
                          </p>
                          <p className="text-xs text-gray-500">
                            {[
                              pkg.weight ? `${pkg.weight} lb` : null,
                              (pkg.length && pkg.width && pkg.height)
                                ? `${pkg.length}×${pkg.width}×${pkg.height} in`
                                : null,
                              pkg.description,
                            ].filter(Boolean).join(' · ') || 'No details'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEditPackage(pkg)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 border border-blue-200 rounded hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDeletePkgId(pkg.id)}
                            className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              !showAddPackage && (
                <p className="text-sm text-gray-400 text-center py-4">No packages recorded for this shipment</p>
              )
            )}

            {/* Add package form */}
            {showAddPackage && (
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3 mt-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-blue-900">New Package</p>
                  <button onClick={() => setShowAddPackage(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={newPackageForm.packageType}
                      onChange={e => setNewPackageForm(f => ({ ...f, packageType: e.target.value as PackageFormState['packageType'] }))}
                      className={fieldCls}
                    >
                      {PACKAGE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Qty</label>
                    <input type="number" min="1" value={newPackageForm.quantity}
                      onChange={e => setNewPackageForm(f => ({ ...f, quantity: e.target.value }))}
                      className={fieldCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Weight (lb)</label>
                    <input type="number" step="0.01" value={newPackageForm.weight}
                      onChange={e => setNewPackageForm(f => ({ ...f, weight: e.target.value }))}
                      className={fieldCls} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">L (in)</label>
                    <input type="number" step="0.01" value={newPackageForm.length}
                      onChange={e => setNewPackageForm(f => ({ ...f, length: e.target.value }))}
                      className={fieldCls} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">W (in)</label>
                    <input type="number" step="0.01" value={newPackageForm.width}
                      onChange={e => setNewPackageForm(f => ({ ...f, width: e.target.value }))}
                      className={fieldCls} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">H (in)</label>
                    <input type="number" step="0.01" value={newPackageForm.height}
                      onChange={e => setNewPackageForm(f => ({ ...f, height: e.target.value }))}
                      className={fieldCls} placeholder="0.00" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <input type="text" value={newPackageForm.description}
                      onChange={e => setNewPackageForm(f => ({ ...f, description: e.target.value }))}
                      className={fieldCls} placeholder="Contents" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddPackage} loading={addingPackage} className="flex-1">
                    Add Package
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => { setShowAddPackage(false); setNewPackageForm(emptyPackageForm()) }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* ── Tracking History ── */}
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-6">Tracking History</h2>
            {trackingItems.length > 0 ? (
              <Timeline items={trackingItems} />
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">No tracking updates yet</p>
            )}
          </Card>

          {/* ── Invoices card ── */}
          <Card>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Invoices</h2>
              {!showInvoiceForm && (
                <button
                  onClick={() => setShowInvoiceForm(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4" /> New Invoice
                </button>
              )}
            </div>

            {invoices.length > 0 ? (
              <div className="space-y-3 mb-5">
                {invoices.map(inv => (
                  <div key={inv.id}>
                    {editingInvoiceId === inv.id ? (
                      <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-blue-900">Edit Invoice</p>
                          <button onClick={() => setEditingInvoiceId(null)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Number *</label>
                            <input type="text" value={editForm.invoiceNumber}
                              onChange={e => setEditForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                              className={fieldCls} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                            <select value={editForm.status}
                              onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                              className={fieldCls}>
                              {['DRAFT','SENT','PAID','OVERDUE','CANCELLED'].map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
                            <input type="date" value={editForm.dueDate}
                              onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))}
                              className={fieldCls} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Replace PDF</label>
                            <input type="file" accept="application/pdf"
                              onChange={e => setEditPdfFile(e.target.files?.[0] ?? null)}
                              className="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-2 file:rounded file:border file:border-gray-200 file:text-xs file:bg-white file:text-blue-600" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                          <textarea value={editForm.notes}
                            onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                            rows={2} className={`${fieldCls} resize-none`} />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit} loading={savingEdit} className="flex-1">Save Changes</Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditingInvoiceId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : confirmDeleteId === inv.id ? (
                      <div className="flex items-center justify-between border border-red-200 rounded-lg px-4 py-3 bg-red-50">
                        <p className="text-sm text-red-700 font-medium">Delete <span className="font-mono">{inv.invoiceNumber}</span>? Cannot be undone.</p>
                        <div className="flex gap-2">
                          <button onClick={() => handleDeleteInvoice(inv.id)} disabled={deletingInvoice}
                            className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-1.5 rounded">
                            {deletingInvoice ? 'Deleting…' : 'Yes, delete'}
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)}
                            className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 border border-gray-300 rounded bg-white">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 bg-gray-50">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{inv.invoiceNumber}</p>
                          <p className="text-xs text-gray-500">
                            {inv.totalAmount != null ? `$${inv.totalAmount.toFixed(2)}` : '—'}
                            {inv.dueDate ? ` · Due ${new Date(inv.dueDate).toLocaleDateString()}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            inv.status === 'PAID'      ? 'bg-green-100 text-green-700' :
                            inv.status === 'OVERDUE'   ? 'bg-red-100 text-red-700' :
                            inv.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' :
                                                         'bg-amber-100 text-amber-700'
                          }`}>
                            {inv.status}
                          </span>
                          {inv.s3Key && (
                            <button onClick={() => handleDownloadInvoice(inv.s3Key!)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="Download PDF">
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                            <button onClick={() => handleMarkPaid(inv.id)} disabled={markingPaid[inv.id]}
                              className="text-xs font-medium text-green-600 hover:text-green-700 disabled:opacity-50 px-2 py-1 border border-green-200 rounded hover:bg-green-50">
                              {markingPaid[inv.id] ? 'Saving…' : 'Mark Paid'}
                            </button>
                          )}
                          <button onClick={() => startEditInvoice(inv)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 border border-blue-200 rounded hover:bg-blue-50">
                            Edit
                          </button>
                          <button onClick={() => setConfirmDeleteId(inv.id)}
                            className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 rounded hover:bg-red-50">
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              !showInvoiceForm && (
                <p className="text-sm text-gray-400 text-center py-6">No invoices yet for this shipment</p>
              )
            )}

            {showInvoiceForm && (
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-blue-900">New Invoice</h3>
                  <button onClick={() => setShowInvoiceForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Number *</label>
                  <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-2024-001" className={fieldCls} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Charges *</label>
                  <div className="space-y-2">
                    {chargeLines.map((line, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <select
                          value={line.chargeType}
                          onChange={e => {
                            const updated = [...chargeLines]
                            updated[idx] = { ...updated[idx], chargeType: e.target.value as ChargeLineItem['chargeType'] }
                            setChargeLines(updated)
                          }}
                          className="border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          {CHARGE_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                        <input type="number" min="0" step="0.01" value={line.amount}
                          onChange={e => {
                            const updated = [...chargeLines]
                            updated[idx] = { ...updated[idx], amount: e.target.value }
                            setChargeLines(updated)
                          }}
                          placeholder="Amount"
                          className="w-28 border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                        <input type="text" value={line.description}
                          onChange={e => {
                            const updated = [...chargeLines]
                            updated[idx] = { ...updated[idx], description: e.target.value }
                            setChargeLines(updated)
                          }}
                          placeholder="Description (optional)"
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                        {chargeLines.length > 1 && (
                          <button type="button" onClick={() => setChargeLines(chargeLines.filter((_, i) => i !== idx))}
                            className="mt-1 text-gray-400 hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button"
                    onClick={() => setChargeLines([...chargeLines, { chargeType: 'OTHER', amount: '', description: '' }])}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium">
                    + Add charge
                  </button>
                </div>

                <div className="flex justify-between items-center text-sm font-semibold text-gray-900 border-t border-blue-200 pt-2">
                  <span>Total</span>
                  <span>${invoiceTotal.toFixed(2)}</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={fieldCls} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={invoiceNotes} onChange={e => setInvoiceNotes(e.target.value)}
                    rows={2} placeholder="Optional notes for the customer"
                    className={`${fieldCls} resize-none`} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Invoice PDF</label>
                  <input type="file" accept="application/pdf" onChange={e => setPdfFile(e.target.files?.[0] ?? null)}
                    className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-white file:text-blue-600 hover:file:bg-blue-50 file:border file:border-gray-200" />
                  {pdfFile && <p className="text-xs text-green-600 mt-1">{pdfFile.name} selected</p>}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button onClick={handleCreateInvoice} loading={creatingInvoice} size="sm" className="flex-1">
                    Create Invoice
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setShowInvoiceForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ── Right: update status ── */}
        <div>
          <Card>
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
                      {opt.label}{NOTIFY_BY_DEFAULT.has(opt.value) ? ' ✉' : ''}
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
                {notifyCustomer && customer?.email && (
                  <p className="text-xs text-blue-600 mt-1 ml-7">→ {customer.email}</p>
                )}
                {notifyCustomer && !customer?.email && (
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
          </Card>
        </div>
      </div>
    </div>
  )
}
