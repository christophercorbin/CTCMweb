import { ShipmentStatus } from '../types';

interface BadgeProps {
  status: ShipmentStatus;
}

const statusColors: Record<ShipmentStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  received: 'bg-blue-100 text-blue-800',
  miami_warehouse: 'bg-gray-100 text-gray-800',
  in_the_air: 'bg-sky-100 text-sky-800',
  in_transit: 'bg-sky-100 text-sky-800',
  departed: 'bg-blue-100 text-blue-800',
  arrived: 'bg-blue-100 text-blue-800',
  in_barbados: 'bg-blue-100 text-blue-800',
  customs_hold: 'bg-orange-100 text-orange-800',
  customs_clearance: 'bg-orange-100 text-orange-800',
  customs_cleared: 'bg-teal-100 text-teal-800',
  at_warehouse: 'bg-gray-100 text-gray-800',
  on_the_water: 'bg-cyan-100 text-cyan-800',
  in_barbados_sea: 'bg-blue-100 text-blue-800',
  barbados_customs: 'bg-orange-100 text-orange-800',
  ready_for_pickup: 'bg-teal-100 text-teal-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  delayed: 'bg-red-100 text-red-800',
};

const statusLabels: Record<ShipmentStatus, string> = {
  pending: 'Pending',
  received: 'Received',
  miami_warehouse: 'Miami Warehouse',
  in_the_air: 'In the Air',
  in_transit: 'In Transit',
  departed: 'Departed',
  arrived: 'Arrived',
  in_barbados: 'In Barbados',
  customs_hold: 'Customs Hold',
  customs_clearance: 'Customs Clearance',
  customs_cleared: 'Customs Cleared',
  at_warehouse: 'At Warehouse',
  on_the_water: 'On the Water',
  in_barbados_sea: 'In Barbados',
  barbados_customs: 'Barbados Customs',
  ready_for_pickup: 'Ready for Pickup',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  delayed: 'Delayed',
};

export const Badge = ({ status }: BadgeProps) => {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
      {statusLabels[status]}
    </span>
  );
};
