import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Gift, Heart, Snowflake, Sparkles, Package as PackageIcon } from 'lucide-react';
import { Button, LoadingSkeleton, EmptyState, Badge, Card } from '../components';
import { ShipmentStatus } from '../types';
import { useRealtimeShipments } from '../hooks/useRealtimeShipments';
import { SearchBar } from '../components/SearchBar';

export const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const { shipments, loading, error } = useRealtimeShipments(customerId || undefined);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchCustomerId = async () => {
      // TODO: Phase 3 - Fetch customer ID from AWS Cognito + RDS
      console.log('CustomerDashboard: Auth not yet migrated. Using demo mode.');
      // For now, use a mock customer ID
      setCustomerId('demo-customer-1');
    };
    fetchCustomerId();
  }, []);

  const filteredShipments = useMemo(() => {
    return shipments
      .filter((s) => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            s.tracking_number.toLowerCase().includes(query) ||
            s.warehouse_receipt_number?.toLowerCase().includes(query) ||
            s.description?.toLowerCase().includes(query)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [shipments, searchQuery]);

  const getPromotion = () => {
    const now = new Date();
    const month = now.getMonth();

    if (month === 1) {
      return {
        title: "Valentine's Day Special",
        description: "Send love across the miles! Enjoy 15% off all air freight shipments this February.",
        discount: "15% OFF",
        icon: Heart,
        gradient: "from-pink-50 to-red-50",
        iconBg: "bg-pink-100",
        iconColor: "text-pink-600",
        code: "LOVE2024"
      };
    } else if (month === 11) {
      return {
        title: "Christmas Holiday Special",
        description: "Ship your gifts home for the holidays! Get 20% off all shipments in December.",
        discount: "20% OFF",
        icon: Snowflake,
        gradient: "from-blue-50 to-cyan-50",
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
        code: "XMAS2024"
      };
    } else {
      return {
        title: "Special Offer",
        description: "Great shipping rates all year round! Contact us for bulk shipping discounts.",
        discount: "SAVE NOW",
        icon: Gift,
        gradient: "from-emerald-50 to-teal-50",
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        code: "CONTACT"
      };
    }
  };

  const promotion = getPromotion();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage your shipments and invoices</p>
      </div>

      <Card className={`bg-gradient-to-r ${promotion.gradient} border-2`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 flex-1">
            <div className={`p-4 ${promotion.iconBg} rounded-xl`}>
              <promotion.icon className={`w-8 h-8 ${promotion.iconColor}`} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{promotion.title}</h3>
              <p className="text-sm text-gray-600">{promotion.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold text-gray-500">Promo Code:</span>
                <code className="px-2 py-1 bg-white rounded text-sm font-mono font-bold text-gray-900 border border-gray-300">
                  {promotion.code}
                </code>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="bg-white px-6 py-3 rounded-lg shadow-sm border-2 border-gray-200">
                <p className="text-2xl font-bold text-gray-900">{promotion.discount}</p>
              </div>
            </div>
            <Sparkles className="w-6 h-6 text-amber-500" />
          </div>
        </div>
      </Card>

      {shipments.filter(s => s.status === 'received').length > 0 && (
        <Card className="bg-orange-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-600 rounded-lg">
                <PackageIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {shipments.filter(s => s.status === 'received').length} Package{shipments.filter(s => s.status === 'received').length > 1 ? 's' : ''} Awaiting Your Decision
                </h3>
                <p className="text-gray-700 mt-1">
                  Your packages have arrived at our warehouse. Ship them now or consolidate for bulk savings.
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/dashboard/pending-packages')}
              variant="primary"
              size="sm"
            >
              View Packages
            </Button>
          </div>
        </Card>
      )}

      <Card>
          <div className="mb-6">
            <SearchBar
              placeholder="Search by tracking #, warehouse receipt, or description..."
              onSearch={setSearchQuery}
            />
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : error ? (
            <EmptyState
              title="Error loading shipments"
              message={error}
            />
          ) : filteredShipments.length === 0 ? (
            <EmptyState
              title="No shipments found"
              message={searchQuery ? 'Try adjusting your search' : 'No shipments yet'}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Tracking #</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Description</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Warehouse Location</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Updated</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredShipments.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-gray-900 font-medium">{shipment.tracking_number}</p>
                        {shipment.warehouse_receipt_number && (
                          <p className="text-xs text-gray-500">WR: {shipment.warehouse_receipt_number}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-600 truncate max-w-xs">
                          {shipment.description || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={shipment.status as ShipmentStatus} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {shipment.warehouse_location || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {new Date(shipment.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/dashboard/shipments/${shipment.id}`)}
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
  );
};
