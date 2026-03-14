/**
 * Single source of truth for shipment status metadata.
 *
 * Previously duplicated across:
 *   - Badge.tsx
 *   - CustomerDashboard.tsx (inline STATUS_META)
 *   - AdminShipmentDetails.tsx (DEFAULT_MESSAGES, STATUS_OPTIONS)
 *   - status-notifier Lambda (STATUS_LABELS, DEFAULT_SUBJECTS, DEFAULT_BODIES)
 */

export type ShipmentStatusKey =
  | 'PENDING'
  | 'MIAMI_WAREHOUSE'
  | 'IN_THE_AIR'
  | 'IN_BARBADOS'
  | 'CUSTOMS_HOLD'
  | 'AT_WAREHOUSE'
  | 'ON_THE_WATER'
  | 'IN_BARBADOS_SEA'
  | 'BARBADOS_CUSTOMS'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELAYED'
  | 'CANCELLED'
  | 'RETURNED'

interface StatusMeta {
  /** Human-readable label shown in UI */
  label: string
  /** Tailwind colour classes for the filled badge (bg + text) */
  badge: string
  /** Tailwind colour for the small dot indicator */
  dot: string
  /** Default email notification body for admins (mirrors status-notifier Lambda) */
  defaultMessage: string
}

export const SHIPMENT_STATUS_META: Record<ShipmentStatusKey, StatusMeta> = {
  PENDING: {
    label:          'Pending',
    badge:          'bg-gray-100 text-gray-700',
    dot:            'bg-gray-400',
    defaultMessage: 'Your shipment has been registered and is awaiting processing.',
  },
  MIAMI_WAREHOUSE: {
    label:          'Miami Warehouse',
    badge:          'bg-slate-100 text-slate-700',
    dot:            'bg-slate-400',
    defaultMessage: 'Your package has been received at our Miami warehouse and is being prepared for shipment to Barbados.',
  },
  IN_THE_AIR: {
    label:          'In the Air',
    badge:          'bg-sky-100 text-sky-700',
    dot:            'bg-sky-400',
    defaultMessage: 'Your package has departed from Miami and is currently in transit by air to Barbados.',
  },
  IN_BARBADOS: {
    label:          'In Barbados',
    badge:          'bg-blue-100 text-blue-700',
    dot:            'bg-blue-500',
    defaultMessage: 'Great news! Your air freight package has arrived in Barbados and is being processed.',
  },
  CUSTOMS_HOLD: {
    label:          'Customs Hold',
    badge:          'bg-orange-100 text-orange-700',
    dot:            'bg-orange-400',
    defaultMessage: 'Your package is currently on hold at customs. Please contact our office for more information or to provide any required documentation.',
  },
  AT_WAREHOUSE: {
    label:          'At Warehouse',
    badge:          'bg-gray-100 text-gray-700',
    dot:            'bg-gray-400',
    defaultMessage: 'Your package has cleared customs and is now at our Barbados warehouse, ready for delivery or pickup.',
  },
  ON_THE_WATER: {
    label:          'On the Water',
    badge:          'bg-cyan-100 text-cyan-700',
    dot:            'bg-cyan-400',
    defaultMessage: 'Your sea freight shipment has departed and is currently in transit to Barbados.',
  },
  IN_BARBADOS_SEA: {
    label:          'In Barbados (Sea)',
    badge:          'bg-blue-100 text-blue-700',
    dot:            'bg-blue-500',
    defaultMessage: 'Your sea freight shipment has arrived in Barbados and is being processed.',
  },
  BARBADOS_CUSTOMS: {
    label:          'Barbados Customs',
    badge:          'bg-orange-100 text-orange-700',
    dot:            'bg-orange-400',
    defaultMessage: 'Your package is currently being processed by Barbados customs. We will notify you once it has been cleared.',
  },
  READY_FOR_PICKUP: {
    label:          'Ready for Pickup',
    badge:          'bg-teal-100 text-teal-700',
    dot:            'bg-teal-500',
    defaultMessage: 'Your package is ready for pickup at our warehouse. Please bring a valid photo ID.\n\nOur hours are Monday–Friday, 8:00 AM – 5:00 PM.',
  },
  OUT_FOR_DELIVERY: {
    label:          'Out for Delivery',
    badge:          'bg-indigo-100 text-indigo-700',
    dot:            'bg-indigo-500',
    defaultMessage: 'Your package is out for delivery today. Please ensure someone is available to receive it at your delivery address.',
  },
  DELIVERED: {
    label:          'Delivered',
    badge:          'bg-green-100 text-green-700',
    dot:            'bg-green-500',
    defaultMessage: 'Your package has been successfully delivered. Thank you for choosing CargoLink Barbados!',
  },
  DELAYED: {
    label:          'Delayed',
    badge:          'bg-red-100 text-red-700',
    dot:            'bg-red-400',
    defaultMessage: 'Your package has been delayed. We sincerely apologize for the inconvenience and will keep you updated as soon as possible.',
  },
  CANCELLED: {
    label:          'Cancelled',
    badge:          'bg-gray-100 text-gray-500',
    dot:            'bg-gray-300',
    defaultMessage: 'Your shipment has been cancelled.',
  },
  RETURNED: {
    label:          'Returned',
    badge:          'bg-red-100 text-red-700',
    dot:            'bg-red-400',
    defaultMessage: 'Your shipment has been returned.',
  },
}

/** All status values as a select-friendly option list (used in admin forms) */
export const SHIPMENT_STATUS_OPTIONS = (Object.keys(SHIPMENT_STATUS_META) as ShipmentStatusKey[]).map(
  (value) => ({ value, label: SHIPMENT_STATUS_META[value].label })
)

/** Statuses that default to notifying the customer when set by admin */
export const NOTIFY_BY_DEFAULT_STATUSES = new Set<ShipmentStatusKey>([
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

/** Convenience: get a human-readable label for a status value */
export function statusLabel(status: string): string {
  return (SHIPMENT_STATUS_META as Record<string, StatusMeta>)[status]?.label ?? status
}
