import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, Package, AlertCircle, Clock, CheckCircle2, FileText, Users } from 'lucide-react';
import { Button, Input, Select, LoadingSkeleton, EmptyState, Badge, Card } from '../components';
import { CustomerManagement } from '../components/CustomerManagement';
import { Shipment, ShipmentStatus } from '../types';
import { isDemoMode, getMockShipments } from '../utils/useMockData';

const statusOptions: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'received', label: 'Received' },
  { value: 'miami_warehouse', label: 'Miami Warehouse' },
  { value: 'in_the_air', label: 'In the Air' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'departed', label: 'Departed' },
  { value: 'arrived', label: 'Arrived' },
  { value: 'in_barbados', label: 'In Barbados' },
  { value: 'customs_hold', label: 'Customs Hold' },
  { value: 'customs_clearance', label: 'Customs Clearance' },
  { value: 'customs_cleared', label: 'Customs Cleared' },
  { value: 'at_warehouse', label: 'At Warehouse' },
  { value: 'on_the_water', label: 'On the Water' },
  { value: 'in_barbados_sea', label: 'In Barbados (Sea)' },
  { value: 'barbados_customs', label: 'Barbados Customs' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'delayed', label: 'Delayed' },
];

const shippingMethodOptions: { value: string; label: string }[] = [
  { value: '', label: 'All Methods' },
  { value: 'air', label: 'Air Freight' },
  { value: 'sea', label: 'Sea Freight' },
];

type AdminTab = 'shipments' | 'customers';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('shipments');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [shippingMethodFilter, setShippingMethodFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');

  const fetchShipments = async () => {
    try {
      setLoading(true);
      if (isDemoMode()) {
        const data = await getMockShipments() as Shipment[];
        setShipments(data);
      } else {
        // TODO: Phase 3 - Connect to AWS RDS via API Gateway
        console.log('AdminDashboard: Database not yet migrated. Using demo mode.');
        const data = await getMockShipments() as Shipment[];
        setShipments(data);
      }

          const shipping_method = shipment.tracking_number?.includes('SEA') ? 'sea' : 'air';

          return {
            ...shipment,
            customer_name: shipment.customer?.name || 'Unknown',
            shipping_method,
            origin: origin || 'N/A',
            destination: destination || 'N/A',
            weight: totalWeight,
          };
        });

        setShipments(formattedShipments);
      }
    } catch (error) {
      console.error('Error fetching shipments:', error);
      toast.error('Failed to load shipments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const activeShipments = shipments.filter(s => s.status !== 'delivered');
  const customsShipments = shipments.filter(s =>
    s.status === 'barbados_customs' || s.status === 'customs_hold' || s.status === 'customs_clearance'
  );
  const readyForPickup = shipments.filter(s => s.status === 'ready_for_pickup');
  const delayedShipments = shipments.filter(s => s.status === 'delayed');

  const customerOptions = [
    { value: '', label: 'All Customers' },
    ...Array.from(new Set(shipments.map(s => s.customer_name).filter(Boolean))).map(name => ({
      value: name as string,
      label: name as string,
    })),
  ];

  const filteredShipments = shipments
    .filter((s) => statusFilter === '' || s.status === statusFilter)
    .filter((s) => shippingMethodFilter === '' || s.shipping_method === shippingMethodFilter)
    .filter((s) => customerFilter === '' || s.customer_name === customerFilter)
    .filter((s) => s.tracking_number.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const MetricCard = ({
    icon: Icon,
    title,
    value,
    subtitle,
    color,
    onClick
  }: {
    icon: any;
    title: string;
    value: number;
    subtitle: string;
    color: string;
    onClick?: () => void;
  }) => (
    <Card className={`${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Broker Dashboard</h1>
          <p className="text-gray-600 mt-1">Daily workflow and shipment management</p>
        </div>
        <Button onClick={() => navigate('/admin/warehouse-receipt')} size="lg">
          <Package className="w-5 h-5 mr-2" />
          New Warehouse Receipt
        </Button>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('shipments')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative ${
            activeTab === 'shipments'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="w-5 h-5" />
          Shipments
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative ${
            activeTab === 'customers'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-5 h-5" />
          Customers
        </button>
      </div>

      {activeTab === 'customers' ? (
        <CustomerManagement />
      ) : (
        <div className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Package}
          title="Active Shipments"
          value={activeShipments.length}
          subtitle="In transit and processing"
          color="bg-blue-600"
        />
        <MetricCard
          icon={AlertCircle}
          title="Awaiting Customs"
          value={customsShipments.length}
          subtitle="Requires clearance"
          color="bg-orange-600"
          onClick={() => setStatusFilter(customsShipments[0]?.status || 'barbados_customs')}
        />
        <MetricCard
          icon={CheckCircle2}
          title="Ready for Pickup"
          value={readyForPickup.length}
          subtitle="Invoice sent to customers"
          color="bg-green-600"
          onClick={() => setStatusFilter('ready_for_pickup')}
        />
        <MetricCard
          icon={Clock}
          title="Delayed"
          value={delayedShipments.length}
          subtitle="Needs attention"
          color="bg-red-600"
          onClick={() => setStatusFilter('delayed')}
        />
      </div>

      {customsShipments.length > 0 && (
        <Card className="bg-orange-50 border-orange-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-600 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Priority: Customs Clearance Required</h3>
                <p className="text-gray-700 mt-1">
                  {customsShipments.length} {customsShipments.length === 1 ? 'shipment' : 'shipments'} awaiting customs processing
                </p>
              </div>
            </div>
            <Button
              onClick={() => setStatusFilter(customsShipments[0]?.status)}
              variant="primary"
              size="sm"
            >
              Process Now
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">All Shipments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Search by tracking number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              options={customerOptions}
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
            />
            <Select
              options={shippingMethodOptions}
              value={shippingMethodFilter}
              onChange={(e) => setShippingMethodFilter(e.target.value)}
            />
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : filteredShipments.length === 0 ? (
          <EmptyState
            title="No shipments found"
            message={search || statusFilter || shippingMethodFilter || customerFilter ? 'Try adjusting your filters' : 'No shipments in the system yet'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Tracking #</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Origin</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Destination</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Weight (kg)</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Updated</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredShipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-gray-900 font-medium">{shipment.tracking_number}</p>
                        <p className="text-xs text-gray-500">{shipment.customer_name || `Customer #${shipment.customer_id}`}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">{shipment.shipping_method}</span>
                      <p className="mt-1">{shipment.origin}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{shipment.destination}</td>
                    <td className="px-4 py-3">
                      <Badge status={shipment.status as ShipmentStatus} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{shipment.weight}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{new Date(shipment.updated_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/admin/shipments/${shipment.id}`)}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
        </div>
      )}
    </div>
  );
};
