import { useEffect, useState, useRef } from 'react'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../../../amplify/data/resource'
import { useShipments } from '../hooks/useShipments'
import {
  Package, Send, Clock, Box, Scale, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { Card, Button, LoadingSkeleton, EmptyState, Modal } from '../components'
import toast from 'react-hot-toast'

const client = generateClient<Schema>()

type ShipmentType = Schema['Shipment']['type']
type PackageType  = Schema['Package']['type']

const INSTRUCTION_META = {
  SHIP: { label: 'Marked for shipping',       color: 'bg-blue-50 text-blue-700 ring-blue-200' },
  HOLD: { label: 'Held at warehouse',          color: 'bg-amber-50 text-amber-700 ring-amber-200' },
}

// ── Weight helper ─────────────────────────────────────────────────────────────
function totalWeight(pkgs: PackageType[]) {
  return pkgs.reduce((sum, p) => sum + (p.weight ?? 0), 0)
}

// ── Package summary row ───────────────────────────────────────────────────────
function PackageSummary({ pkg, idx }: { pkg: PackageType; idx: number }) {
  const dims =
    pkg.length && pkg.width && pkg.height
      ? `${pkg.length}×${pkg.width}×${pkg.height} ${pkg.dimensionUnit ?? 'cm'}`
      : null
  return (
    <div className="text-xs text-gray-600 flex items-center gap-2">
      <span className="font-medium text-gray-700">#{idx + 1}</span>
      {pkg.quantity && pkg.quantity > 1 && <span>{pkg.quantity}×</span>}
      <span className="capitalize">{(pkg.packageType ?? 'package').toLowerCase()}</span>
      {pkg.weight && (
        <span className="flex items-center gap-0.5">
          <Scale className="w-3 h-3" />
          {pkg.weight} {pkg.weightUnit ?? 'kg'}
        </span>
      )}
      {dims && <span className="text-gray-400">{dims}</span>}
      {pkg.description && <span className="text-gray-400 truncate max-w-[180px]">{pkg.description}</span>}
    </div>
  )
}

// ── Shipment card ─────────────────────────────────────────────────────────────
function ShipmentCard({
  shipment,
  pkgs,
  selected,
  onToggle,
  onInstruction,
  updating,
}: {
  shipment: ShipmentType
  pkgs: PackageType[]
  selected: boolean
  onToggle: () => void
  onInstruction: (instruction: 'SHIP' | 'HOLD') => void
  updating: boolean
}) {
  const instruction = shipment.customerInstruction as 'SHIP' | 'HOLD' | null | undefined
  const meta = instruction ? INSTRUCTION_META[instruction] : null
  const kg = totalWeight(pkgs)
  const received = new Date(shipment.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <Card className={`transition-all ${selected ? 'ring-2 ring-blue-500 bg-blue-50/40' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <p className="font-mono font-bold text-gray-900">{shipment.trackingNumber}</p>
              {shipment.description && (
                <p className="text-sm text-gray-600 mt-0.5 truncate">{shipment.description}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-400">Received</p>
              <p className="text-sm font-medium text-gray-700">{received}</p>
            </div>
          </div>

          {/* Stats row */}
          {pkgs.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 mb-3">
              <span className="flex items-center gap-1.5 text-sm text-gray-600">
                <Box className="w-4 h-4 text-gray-400" />
                {pkgs.length} {pkgs.length === 1 ? 'package' : 'packages'}
              </span>
              {kg > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Scale className="w-4 h-4 text-gray-400" />
                  {kg.toFixed(2)} kg
                </span>
              )}
            </div>
          )}

          {/* Package detail list */}
          {pkgs.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-1">
              {pkgs.map((pkg, idx) => (
                <PackageSummary key={pkg.id} pkg={pkg} idx={idx} />
              ))}
            </div>
          )}

          {/* Instruction status banner */}
          {meta && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ring-1 ring-inset text-sm font-medium mb-3 ${meta.color}`}>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {meta.label}
              <span className="ml-auto text-xs font-normal opacity-70">Tap below to change</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => onInstruction('SHIP')}
              variant={instruction === 'SHIP' ? 'primary' : 'secondary'}
              size="sm"
              disabled={updating}
            >
              <Send className="w-4 h-4 mr-1.5" />
              {instruction === 'SHIP' ? 'Shipping ✓' : 'Ship Now'}
            </Button>
            <Button
              onClick={() => onInstruction('HOLD')}
              variant={instruction === 'HOLD' ? 'primary' : 'secondary'}
              size="sm"
              disabled={updating}
            >
              <Clock className="w-4 h-4 mr-1.5" />
              {instruction === 'HOLD' ? 'On Hold ✓' : 'Hold for Consolidation'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export const PendingPackages = () => {
  const { shipments, loading } = useShipments()
  const [pkgMap, setPkgMap]       = useState<Record<string, PackageType[]>>({})
  const [updating, setUpdating]   = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showModal, setShowModal] = useState(false)
  const [consolidating, setConsolidating] = useState(false)
  const fetchedRef = useRef<Set<string>>(new Set())

  // Only MIAMI_WAREHOUSE shipments (no customer instruction yet, or any)
  const pending = shipments.filter((s) => s.status === 'MIAMI_WAREHOUSE')

  // Fetch packages for any pending shipments we haven't loaded yet
  useEffect(() => {
    pending.forEach(async (s) => {
      if (fetchedRef.current.has(s.id)) return
      fetchedRef.current.add(s.id)
      const { data } = await client.models.Package.list({
        filter: { shipmentId: { eq: s.id } },
      })
      if (data?.length) {
        setPkgMap((prev) => ({ ...prev, [s.id]: data }))
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending.map((s) => s.id).join(',')])

  const setInstruction = async (id: string, instruction: 'SHIP' | 'HOLD') => {
    setUpdating(id)
    try {
      await client.models.Shipment.update({ id, customerInstruction: instruction })
      toast.success(
        instruction === 'SHIP'
          ? 'Great! We\'ll ship your package to Barbados.'
          : 'Package held — we\'ll wait for your consolidation.',
      )
    } catch {
      toast.error('Failed to update — please try again')
    } finally {
      setUpdating(null)
    }
  }

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )

  const handleConsolidate = async () => {
    setConsolidating(true)
    try {
      await Promise.all(
        selectedIds.map((id) =>
          client.models.Shipment.update({ id, customerInstruction: 'HOLD' }),
        ),
      )
      toast.success(`${selectedIds.length} packages held for consolidation`)
      setSelectedIds([])
      setShowModal(false)
    } catch {
      toast.error('Failed to consolidate — please try again')
    } finally {
      setConsolidating(false)
    }
  }

  const awaitingDecision = pending.filter((s) => !s.customerInstruction).length

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Packages at Warehouse</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {pending.length === 0
              ? 'No packages waiting at our Miami warehouse.'
              : `${pending.length} shipment${pending.length > 1 ? 's' : ''} at our Miami warehouse — choose to ship or hold each one.`}
          </p>
        </div>
        {selectedIds.length > 1 && (
          <Button onClick={() => setShowModal(true)}>
            <Box className="w-4 h-4 mr-2" />
            Consolidate {selectedIds.length}
          </Button>
        )}
      </div>

      {/* Awaiting decision alert */}
      {awaitingDecision > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>{awaitingDecision} package{awaitingDecision > 1 ? 's' : ''}</strong>{' '}
            {awaitingDecision > 1 ? 'are' : 'is'} waiting for your Ship or Hold decision.
          </p>
        </div>
      )}

      {/* List */}
      {loading ? (
        <LoadingSkeleton />
      ) : pending.length === 0 ? (
        <EmptyState
          icon={<Package className="w-12 h-12" />}
          title="No packages at warehouse"
          message="When packages arrive at our Miami warehouse you'll see them here."
        />
      ) : (
        <div className="space-y-4">
          {pending.map((s) => (
            <ShipmentCard
              key={s.id}
              shipment={s}
              pkgs={pkgMap[s.id] ?? []}
              selected={selectedIds.includes(s.id)}
              onToggle={() => toggleSelect(s.id)}
              onInstruction={(instr) => setInstruction(s.id, instr)}
              updating={updating === s.id}
            />
          ))}
        </div>
      )}

      {/* Consolidate confirmation modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Consolidate Packages"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Hold <strong>{selectedIds.length} packages</strong> at our warehouse for consolidated shipping.
            We'll combine them into a single shipment — saving on freight and customs costs.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-1">Benefits of consolidation</p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Lower per-item shipping costs</li>
              <li>Single tracking number for all packages</li>
              <li>Reduced customs processing time</li>
            </ul>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleConsolidate}
              disabled={consolidating}
              className="flex-1"
            >
              {consolidating ? 'Processing…' : 'Hold for Consolidation'}
            </Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
