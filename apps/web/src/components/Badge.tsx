import { ShipmentStatus } from '../types';

interface BadgeProps {
  status?: ShipmentStatus;
  variant?: string;
  children?: React.ReactNode;
}

const statusColors: Record<ShipmentStatus, string> = {
  PENDING:          'bg-gray-100 text-gray-700',
  MIAMI_WAREHOUSE:  'bg-slate-100 text-slate-700',
  IN_THE_AIR:       'bg-sky-100 text-sky-700',
  IN_BARBADOS:      'bg-blue-100 text-blue-700',
  CUSTOMS_HOLD:     'bg-orange-100 text-orange-700',
  AT_WAREHOUSE:     'bg-gray-100 text-gray-700',
  ON_THE_WATER:     'bg-cyan-100 text-cyan-700',
  IN_BARBADOS_SEA:  'bg-blue-100 text-blue-700',
  BARBADOS_CUSTOMS: 'bg-orange-100 text-orange-700',
  READY_FOR_PICKUP: 'bg-teal-100 text-teal-700',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-700',
  DELIVERED:        'bg-green-100 text-green-700',
  DELAYED:          'bg-red-100 text-red-700',
  CANCELLED:        'bg-gray-100 text-gray-500',
  RETURNED:         'bg-red-100 text-red-700',
};

const statusLabels: Record<ShipmentStatus, string> = {
  PENDING:          'Pending',
  MIAMI_WAREHOUSE:  'Miami Warehouse',
  IN_THE_AIR:       'In the Air',
  IN_BARBADOS:      'In Barbados',
  CUSTOMS_HOLD:     'Customs Hold',
  AT_WAREHOUSE:     'At Warehouse',
  ON_THE_WATER:     'On the Water',
  IN_BARBADOS_SEA:  'In Barbados (Sea)',
  BARBADOS_CUSTOMS: 'Barbados Customs',
  READY_FOR_PICKUP: 'Ready for Pickup',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED:        'Delivered',
  DELAYED:          'Delayed',
  CANCELLED:        'Cancelled',
  RETURNED:         'Returned',
};

export const Badge = ({ status, variant, children }: BadgeProps) => {
  if (children) {
    const variantClass = variant || 'bg-gray-100 text-gray-800';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClass}`}>
        {children}
      </span>
    );
  }

  if (!status) return null;

  const colorClass = statusColors[status] ?? 'bg-gray-100 text-gray-700';
  const label = statusLabels[status] ?? status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
};
