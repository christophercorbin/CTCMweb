import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Upload } from 'lucide-react';
import { Button, Card, CardSkeleton, Badge, Timeline, ShipmentProgress } from '../components';
import { shipmentApi, documentApi } from '../api/services';
import { ShipmentDetails as ShipmentDetailsType, TrackingItem, ShipmentStatus } from '../types';

export const ShipmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<ShipmentDetailsType | null>(null);
  const [tracking, setTracking] = useState<TrackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      // Fetch shipment details from API Gateway
      const shipmentData = await shipmentApi.getById(id);
      setShipment(shipmentData);
      
      // Convert shipment events to tracking items
      const trackingItems: TrackingItem[] = (shipmentData.events || []).map(event => ({
        status: shipmentData.status as ShipmentStatus,
        location: event.location || '',
        timestamp: event.created_at,
        notes: event.event_description || '',
      }));
      setTracking(trackingItems);
    } catch (error) {
      console.error('Error fetching shipment:', error);
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

    if (!id || !shipment) return;

    setUploading(true);
    try {
      // Upload document to S3 via API Gateway
      await documentApi.upload(file, {
        customerId: shipment.customer_id,
        shipmentId: id,
        documentType: 'invoice',
      });
      toast.success('Invoice uploaded successfully');
      fetchData();
    } catch (error) {
      console.error('Error uploading invoice:', error);
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
                <p className="text-sm text-gray-600">Shipper</p>
                <p className="text-lg font-semibold text-gray-900">{shipment.shipper_name || 'N/A'}</p>
                {shipment.shipper_address && (
                  <p className="text-sm text-gray-600 mt-1">{shipment.shipper_address}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Consignee</p>
                <p className="text-lg font-semibold text-gray-900">{shipment.consignee_name || 'N/A'}</p>
                {shipment.consignee_address && (
                  <p className="text-sm text-gray-600 mt-1">{shipment.consignee_address}</p>
                )}
              </div>
              {shipment.carrier_name && (
                <div>
                  <p className="text-sm text-gray-600">Carrier</p>
                  <p className="text-lg font-semibold text-gray-900">{shipment.carrier_name}</p>
                </div>
              )}
              {shipment.packages && shipment.packages.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600">Total Weight</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {shipment.packages.reduce((sum, pkg) => sum + (pkg.weight_kg || 0), 0).toFixed(2)} kg
                  </p>
                </div>
              )}
              {shipment.warehouse_location && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Warehouse Location</p>
                  <p className="text-base font-medium text-gray-900">{shipment.warehouse_location}</p>
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
            <ShipmentProgress status={shipment.status as ShipmentStatus} shippingMethod="air" />
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
