import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Upload } from 'lucide-react';
import { Button, Card, CardSkeleton, Badge, Timeline, ShipmentProgress } from '../components';
import { apiClient } from '../api/axios';
import { Shipment, TrackingItem, ShipmentStatus } from '../types';
import { isDemoMode, getMockShipment, getMockTracking } from '../utils/useMockData';

export const ShipmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [tracking, setTracking] = useState<TrackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      if (isDemoMode()) {
        const [shipmentData, trackingData] = await Promise.all([
          getMockShipment(Number(id)),
          getMockTracking(Number(id)),
        ]);
        setShipment(shipmentData as Shipment);
        setTracking(trackingData as TrackingItem[]);
      } else {
        const [shipmentRes, trackingRes] = await Promise.all([
          apiClient.get<Shipment>(`/shipments/${id}`),
          apiClient.get<TrackingItem[]>(`/shipments/${id}/tracking`),
        ]);
        setShipment(shipmentRes.data);
        setTracking(trackingRes.data);
      }
    } catch {
      toast.error('Failed to load shipment details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf')) {
      toast.error('Only PDF files are allowed');
      return;
    }

    if (!id) return;

    setUploading(true);
    try {
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success('Invoice uploaded successfully (Demo Mode)');
      } else {
        const formData = new FormData();
        formData.append('file', file);
        await apiClient.post(`/shipments/${id}/invoices`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Invoice uploaded successfully');
        fetchData();
      }
    } catch {
      toast.error('Failed to upload invoice');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <CardSkeleton />;

  if (!shipment) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-blue-600">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="text-center py-12">
          <p className="text-gray-600">Shipment not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Shipments
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{shipment.tracking_number}</h1>
                <p className="text-gray-600 text-sm mt-1">Created {new Date(shipment.created_at).toLocaleDateString()}</p>
              </div>
              <Badge status={shipment.status as ShipmentStatus} />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-600">Origin</p>
                <p className="text-lg font-semibold text-gray-900">{shipment.origin}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Destination</p>
                <p className="text-lg font-semibold text-gray-900">{shipment.destination}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Shipping Method</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">{shipment.shipping_method} Freight</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Weight</p>
                <p className="text-lg font-semibold text-gray-900">{shipment.weight} kg</p>
              </div>
              {shipment.delivery_method && (
                <div>
                  <p className="text-sm text-gray-600">Delivery Method</p>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {shipment.delivery_method === 'home_delivery' ? 'Home Delivery' : 'Pickup'}
                  </p>
                </div>
              )}
              {shipment.delivery_address && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Delivery Address</p>
                  <p className="text-base font-medium text-gray-900">{shipment.delivery_address}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Description</p>
              <p className="text-gray-900">{shipment.description}</p>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Shipment Progress</h2>
            <ShipmentProgress status={shipment.status as ShipmentStatus} shippingMethod={shipment.shipping_method} />
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Tracking History</h2>
            {tracking.length > 0 ? (
              <Timeline items={tracking} />
            ) : (
              <p className="text-gray-600 text-center py-8">No tracking updates yet</p>
            )}
          </Card>
        </div>

        <div>
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Invoices</h2>

            <div className="mb-6">
              <label className="block">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleInvoiceUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <Button
                  as="span"
                  variant="secondary"
                  loading={uploading}
                  className="w-full cursor-pointer"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Invoice PDF
                </Button>
              </label>
            </div>

            <div className="text-sm text-gray-600">
              <p className="mb-2 font-medium">Upload your shipment invoice here.</p>
              <p>Only PDF files are accepted.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
