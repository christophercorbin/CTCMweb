import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowLeft, FileText, Download, Mail } from 'lucide-react';
import { Button, Card, CardSkeleton, Badge, Timeline, Select, Textarea, Input } from '../components';
import { apiClient } from '../api/axios';
import { Shipment, TrackingItem, ShipmentStatus } from '../types';
import { isDemoMode, getMockShipment, getMockTracking } from '../utils/useMockData';

const statusUpdateSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  notes: z.string().optional(),
  reason: z.string().optional(),
  customsRequest: z.string().optional(),
  dutiesFee: z.string().optional(),
  shippingFee: z.string().optional(),
}).refine(
  (data) => data.status !== 'delayed' || data.reason,
  { message: 'Reason is required for delayed status', path: ['reason'] }
).refine(
  (data) => data.status !== 'ready_for_pickup' || (data.dutiesFee && data.shippingFee),
  { message: 'Invoice details are required for ready for pickup status', path: ['dutiesFee'] }
);

type StatusUpdateData = z.infer<typeof statusUpdateSchema>;

const airStatusOptions = [
  { value: 'miami_warehouse', label: 'Miami Warehouse' },
  { value: 'in_the_air', label: 'In the Air' },
  { value: 'in_barbados', label: 'In Barbados' },
  { value: 'customs_hold', label: 'Customs Hold' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'delayed', label: 'Delayed' },
];

const seaStatusOptions = [
  { value: 'at_warehouse', label: 'At Warehouse' },
  { value: 'on_the_water', label: 'On the Water' },
  { value: 'in_barbados_sea', label: 'In Barbados' },
  { value: 'barbados_customs', label: 'Barbados Customs' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'delayed', label: 'Delayed' },
];

const mockDocuments = [
  { id: '1', name: 'Commercial Invoice.pdf', uploadedAt: '2024-01-15T10:30:00Z' },
  { id: '2', name: 'Packing List.pdf', uploadedAt: '2024-01-15T10:32:00Z' },
  { id: '3', name: 'Bill of Lading.pdf', uploadedAt: '2024-01-15T10:35:00Z' },
];

export const AdminShipmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [tracking, setTracking] = useState<TrackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [sendingCustomsRequest, setSendingCustomsRequest] = useState(false);

  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<StatusUpdateData>({
    resolver: zodResolver(statusUpdateSchema),
    defaultValues: { status: '', notes: '', customsRequest: '', dutiesFee: '', shippingFee: '' },
  });

  const selectedStatus = watch('status');
  const dutiesFee = watch('dutiesFee');
  const shippingFee = watch('shippingFee');

  const calculateTotal = () => {
    const duties = parseFloat(dutiesFee || '0');
    const shipping = parseFloat(shippingFee || '0');
    return (duties + shipping).toFixed(2);
  };

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

  useEffect(() => {
    if (shipment) {
      reset({ status: shipment.status, notes: '', customsRequest: '', dutiesFee: '', shippingFee: '' });
    }
  }, [shipment, reset]);

  const onSubmit = async (data: StatusUpdateData) => {
    if (!id) return;
    setUpdating(true);
    try {
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success('Status updated and customer notified successfully (Demo Mode)');
        fetchData();
      } else {
        await apiClient.post(`/admin/shipments/${id}/status`, {
          status: data.status,
          notes: data.notes || undefined,
          reason: data.reason || undefined,
          dutiesFee: data.dutiesFee || undefined,
          shippingFee: data.shippingFee || undefined,
        });
        toast.success('Status updated and customer notified via email');
        fetchData();
      }
    } catch {
      toast.error('Failed to update shipment status');
    } finally {
      setUpdating(false);
    }
  };

  const handleCustomsRequest = async () => {
    const customsRequest = watch('customsRequest');
    if (!customsRequest || !id) {
      toast.error('Please enter a customs request message');
      return;
    }

    setSendingCustomsRequest(true);
    try {
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success('Customs information request sent to customer (Demo Mode)');
      } else {
        await apiClient.post(`/admin/shipments/${id}/customs-request`, {
          message: customsRequest,
        });
        toast.success('Customs information request sent to customer via email');
      }
    } catch {
      toast.error('Failed to send customs request');
    } finally {
      setSendingCustomsRequest(false);
    }
  };

  const handleDownloadPDF = (documentName: string) => {
    toast.success(`Downloading ${documentName}...`);
  };

  const handleViewPDF = (documentName: string) => {
    toast.success(`Opening ${documentName}...`);
  };

  const statusOptions = shipment?.shipping_method === 'air' ? airStatusOptions : seaStatusOptions;

  if (loading) return <CardSkeleton />;

  if (!shipment) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/admin/shipments')} className="flex items-center gap-2 text-blue-600">
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
        onClick={() => navigate('/admin/shipments')}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Broker Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{shipment.tracking_number}</h1>
                <p className="text-gray-600 text-sm mt-1">
                  Customer: {shipment.customer_name || `Customer #${shipment.customer_id}`}
                </p>
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">Shipment Documents</h2>
            <div className="space-y-3">
              {mockDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{doc.name}</p>
                      <p className="text-sm text-gray-500">
                        Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewPDF(doc.name)}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(doc.name)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
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

        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Update Status</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Select
                label="New Status"
                options={statusOptions}
                error={errors.status?.message}
                {...register('status')}
              />

              {selectedStatus === 'delayed' && (
                <Textarea
                  label="Reason for Delay"
                  placeholder="Explain the reason for the delay..."
                  rows={3}
                  error={errors.reason?.message}
                  {...register('reason')}
                />
              )}

              {selectedStatus === 'ready_for_pickup' && (
                <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-gray-900">Invoice Details (Required)</h3>
                  <Input
                    label="Duties Fee ($)"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    error={errors.dutiesFee?.message}
                    {...register('dutiesFee')}
                  />
                  <Input
                    label="Shipping Fee ($)"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    error={errors.shippingFee?.message}
                    {...register('shippingFee')}
                  />
                  <div className="pt-2 border-t border-blue-300">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Total:</span>
                      <span className="text-xl font-bold text-gray-900">${calculateTotal()}</span>
                    </div>
                  </div>
                  <p className="text-sm text-blue-700">
                    This invoice will be sent to the customer via email and displayed on their dashboard.
                  </p>
                </div>
              )}

              <Textarea
                label="Quick Notes (Optional)"
                placeholder="Add any internal notes or customer messages..."
                rows={3}
                {...register('notes')}
              />

              <Button type="submit" loading={updating} className="w-full">
                Update Customer
              </Button>
            </form>
          </Card>

          {selectedStatus === 'barbados_customs' && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Request Additional Information
              </h2>
              <div className="space-y-4">
                <Textarea
                  label="Customs Request"
                  placeholder="Describe what additional documents or information is needed from the customer..."
                  rows={4}
                  error={errors.customsRequest?.message}
                  {...register('customsRequest')}
                />
                <Button
                  type="button"
                  onClick={handleCustomsRequest}
                  loading={sendingCustomsRequest}
                  className="w-full"
                  variant="secondary"
                >
                  Send Request to Customer
                </Button>
                <p className="text-sm text-gray-600">
                  Customer will receive this request via email and see it on their dashboard.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
