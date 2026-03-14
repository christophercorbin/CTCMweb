import { SHIPMENT_STATUS_META } from '../constants/shipmentStatuses';
import { ShipmentStatus } from '../types';

interface BadgeProps {
  status?: ShipmentStatus;
  variant?: string;
  children?: React.ReactNode;
}

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

  const meta = (SHIPMENT_STATUS_META as Record<string, { badge: string; label: string }>)[status];
  const colorClass = meta?.badge ?? 'bg-gray-100 text-gray-700';
  const label = meta?.label ?? status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
};
