import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowLeft, Upload, X, FileText } from 'lucide-react';
import { Button, Input, Textarea, Card, Select } from '../components';
import { apiClient } from '../api/axios';
import { isDemoMode } from '../utils/useMockData';

const createShipmentSchema = z.object({
  tracking_number: z.string().min(3, 'Tracking number is required'),
  shipping_method: z.enum(['air', 'sea'], { required_error: 'Shipping method is required' }),
  delivery_method: z.enum(['pickup', 'home_delivery'], { required_error: 'Delivery method is required' }),
  delivery_address: z.string().optional(),
  origin: z.string().min(2, 'Origin is required'),
  destination: z.string().min(2, 'Destination is required'),
  weight: z.coerce.number().positive('Weight must be positive'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
}).refine((data) => {
  if (data.delivery_method === 'home_delivery' && !data.delivery_address) {
    return false;
  }
  return true;
}, {
  message: 'Delivery address is required for home delivery',
  path: ['delivery_address'],
});

type CreateShipmentData = z.infer<typeof createShipmentSchema>;

const shippingMethodOptions = [
  { value: 'air', label: 'Air Freight' },
  { value: 'sea', label: 'Sea Freight' },
];

const deliveryMethodOptions = [
  { value: 'pickup', label: 'Pickup from Warehouse' },
  { value: 'home_delivery', label: 'Home Delivery' },
];

export const CreateShipment = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<CreateShipmentData>({
    resolver: zodResolver(createShipmentSchema),
  });

  const deliveryMethod = watch('delivery_method');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');

    if (pdfFiles.length !== files.length) {
      toast.error('Only PDF files are allowed');
    }

    setInvoiceFiles(prev => [...prev, ...pdfFiles]);
  };

  const removeFile = (index: number) => {
    setInvoiceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: CreateShipmentData) => {
    if (invoiceFiles.length === 0) {
      toast.error('Please upload at least one invoice document');
      return;
    }

    setLoading(true);
    try {
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success('Shipment created successfully (Demo Mode)');
      } else {
        await apiClient.post('/shipments', data);
        toast.success('Shipment created successfully');
      }
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch {
      toast.error('Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Shipment</h1>
          <p className="text-gray-600 mt-1">Create a new freight shipment request</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Tracking Number"
            placeholder="e.g., CTCM-2024-001"
            error={errors.tracking_number?.message}
            {...register('tracking_number')}
          />

          <Select
            label="Shipping Method"
            options={shippingMethodOptions}
            error={errors.shipping_method?.message}
            {...register('shipping_method')}
          />

          <Select
            label="Delivery Method"
            options={deliveryMethodOptions}
            error={errors.delivery_method?.message}
            {...register('delivery_method')}
          />

          {deliveryMethod === 'home_delivery' && (
            <Textarea
              label="Delivery Address"
              placeholder="Enter complete delivery address including street, city, and postal code"
              rows={3}
              error={errors.delivery_address?.message}
              {...register('delivery_address')}
            />
          )}

          <Input
            label="Origin"
            placeholder="e.g., Miami, FL"
            error={errors.origin?.message}
            {...register('origin')}
          />

          <Input
            label="Destination"
            placeholder="e.g., Bridgetown, Barbados"
            error={errors.destination?.message}
            {...register('destination')}
          />

          <Input
            label="Weight (kg)"
            type="number"
            step="0.1"
            placeholder="e.g., 25.5"
            error={errors.weight?.message}
            {...register('weight')}
          />

          <Textarea
            label="Description"
            placeholder="Describe the shipment contents..."
            rows={4}
            error={errors.description?.message}
            {...register('description')}
          />

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Invoice Documents <span className="text-red-600">*</span>
            </label>
            <p className="text-sm text-gray-600">
              Required for customs clearance in Barbados
            </p>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="invoice-upload"
              />
              <label
                htmlFor="invoice-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-10 h-10 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  Click to upload invoice PDFs
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  PDF files only
                </span>
              </label>
            </div>

            {invoiceFiles.length > 0 && (
              <div className="space-y-2">
                {invoiceFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Shipment
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
