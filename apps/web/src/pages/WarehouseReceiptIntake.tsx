import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { Package, Plus, Trash2, Save } from 'lucide-react';
import { Card, Button, Input, Select, Textarea, DocumentScanner } from '../components';
import toast from 'react-hot-toast';
import { PackageType } from '../types';

const client = generateClient<Schema>();

interface ExtractedData {
  trackingNumber?: string;
  warehouseReceiptNumber?: string;
  receivedDate?: string;
  shipperName?: string;
  shipperAddress?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  packages?: Array<{
    piecesCount?: number;
    weightKg?: number;
    dimensions?: string;
  }>;
}

interface CustomerOption {
  id: string;
  name: string;
  email: string;
  cognitoSub?: string | null;
}

interface PackageInput {
  pieces_count: number;
  package_type: PackageType;
  length: string;
  width: string;
  height: string;
  weight: string;
  description: string;
  storage_location: string;
}

function toSchemaPackageType(pt: PackageType): 'BOX' | 'ENVELOPE' | 'PALLET' | 'CONTAINER' {
  switch (pt) {
    case 'envelope': return 'ENVELOPE';
    case 'pallet': return 'PALLET';
    case 'crate': return 'CONTAINER';
    default: return 'BOX';
  }
}

const emptyPackage = (): PackageInput => ({
  pieces_count: 1,
  package_type: 'box',
  length: '',
  width: '',
  height: '',
  weight: '',
  description: '',
  storage_location: 'SP',
});

export const WarehouseReceiptIntake = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    tracking_number: '',
    warehouse_receipt_number: '',
    customer_id: '',
    shipment_type: 'AIR',
    received_by: '',
    shipper_name: '',
    shipper_address: '',
    shipper_city: '',
    shipper_state: '',
    shipper_country: '',
    carrier_name: '',
    pro_number: '',
    supplier: '',
    invoice_number: '',
    po_number: '',
    warehouse_location: 'SP',
    description: '',
    notes: '',
  });

  const [packages, setPackages] = useState<PackageInput[]>([emptyPackage()]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, errors } = await client.models.Customer.list();
      if (errors?.length) throw new Error(errors[0].message);
      setCustomers(data.map((c) => ({ id: c.id, name: c.name, email: c.email, cognitoSub: c.cognitoSub })));
    } catch (error) {
      toast.error('Failed to load customers');
      console.error(error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePackageChange = (index: number, field: keyof PackageInput, value: string | number) => {
    setPackages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addPackage = () => setPackages((prev) => [...prev, emptyPackage()]);

  const removePackage = (index: number) => {
    if (packages.length === 1) {
      toast.error('At least one package is required');
      return;
    }
    setPackages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExtractedData = (data: ExtractedData) => {
    const updatedFormData: Partial<typeof formData> = {};

    if (data.trackingNumber) updatedFormData.tracking_number = String(data.trackingNumber);
    if (data.warehouseReceiptNumber) updatedFormData.warehouse_receipt_number = String(data.warehouseReceiptNumber);
    if (data.shipperName) updatedFormData.shipper_name = String(data.shipperName);
    if (data.shipperAddress) updatedFormData.shipper_address = String(data.shipperAddress);

    setFormData((prev) => ({ ...prev, ...updatedFormData }));

    if (data.packages?.length) {
      setPackages(
        data.packages.map((pkg) => ({
          pieces_count: pkg.piecesCount || 1,
          package_type: 'box' as PackageType,
          length: '',
          width: '',
          height: '',
          weight: pkg.weightKg?.toString() || '',
          description: pkg.dimensions || '',
          storage_location: 'SP',
        }))
      );
    }

    const fieldsExtracted = Object.keys(updatedFormData).length + (data.packages?.length || 0);
    toast.success(`Extracted ${fieldsExtracted} field(s) from documents`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tracking_number || !formData.customer_id) {
      toast.error('Tracking number and customer are required');
      return;
    }

    setLoading(true);

    try {
      // Pack extra fields into description since schema is lean
      const extraLines = [
        formData.warehouse_receipt_number && `WR#: ${formData.warehouse_receipt_number}`,
        formData.received_by && `Received by: ${formData.received_by}`,
        formData.shipper_name && `Shipper: ${formData.shipper_name}`,
        formData.shipper_address && `${formData.shipper_address}`,
        formData.carrier_name && `Carrier: ${formData.carrier_name}`,
        formData.pro_number && `PRO#: ${formData.pro_number}`,
        formData.supplier && `Supplier: ${formData.supplier}`,
        formData.invoice_number && `Invoice#: ${formData.invoice_number}`,
        formData.po_number && `PO#: ${formData.po_number}`,
        formData.warehouse_location && `Warehouse: ${formData.warehouse_location}`,
        formData.notes && `Notes: ${formData.notes}`,
      ].filter(Boolean).join('\n');

      const description = [formData.description, extraLines].filter(Boolean).join('\n\n') || undefined;

      const origin = [formData.shipper_city, formData.shipper_state, formData.shipper_country]
        .filter(Boolean).join(', ') || undefined;

      const selectedCustomer = customers.find((c) => c.id === formData.customer_id);

      // 1. Create the shipment
      const { data: shipment, errors: shipmentErrors } = await client.models.Shipment.create({
        trackingNumber: formData.tracking_number,
        customerId: formData.customer_id,
        customerCognitoSub: selectedCustomer?.cognitoSub ?? undefined,
        status: 'PENDING',
        type: formData.shipment_type as 'AIR' | 'SEA',
        origin,
        description,
      });

      if (shipmentErrors?.length) throw new Error(shipmentErrors[0].message);
      if (!shipment) throw new Error('Failed to create shipment');

      // 2. Create package records
      await Promise.all(
        packages.map((pkg) =>
          client.models.Package.create({
            shipmentId: shipment.id,
            packageType: toSchemaPackageType(pkg.package_type),
            weight: pkg.weight ? parseFloat(pkg.weight) : undefined,
            weightUnit: 'lb',
            length: pkg.length ? parseFloat(pkg.length) : undefined,
            width: pkg.width ? parseFloat(pkg.width) : undefined,
            height: pkg.height ? parseFloat(pkg.height) : undefined,
            dimensionUnit: 'in',
            description: pkg.description || undefined,
            quantity: pkg.pieces_count,
          })
        )
      );

      // 3. Create initial timeline event
      await client.models.ShipmentEvent.create({
        shipmentId: shipment.id,
        status: 'PENDING',
        location: formData.warehouse_location || 'Miami, FL',
        description: `Warehouse receipt processed${formData.received_by ? ` by ${formData.received_by}` : ''}`,
        eventTimestamp: new Date().toISOString(),
      });

      toast.success('Warehouse receipt processed successfully');
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Error creating shipment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process warehouse receipt');
    } finally {
      setLoading(false);
    }
  };

  const packageTypeOptions = [
    { value: 'box', label: 'Box' },
    { value: 'bag', label: 'Bag' },
    { value: 'pallet', label: 'Pallet' },
    { value: 'crate', label: 'Crate' },
    { value: 'envelope', label: 'Envelope' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Warehouse Receipt Intake</h1>
            <p className="text-gray-600">Process incoming packages and notify customers</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <DocumentScanner onExtract={handleExtractedData} />

        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tracking Number *
              </label>
              <Input
                value={formData.tracking_number}
                onChange={(e) => handleInputChange('tracking_number', e.target.value)}
                placeholder="1zw6535x1325401737"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warehouse Receipt Number
              </label>
              <Input
                value={formData.warehouse_receipt_number}
                onChange={(e) => handleInputChange('warehouse_receipt_number', e.target.value)}
                placeholder="W296434"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer *
              </label>
              <Select
                value={formData.customer_id}
                onChange={(e) => handleInputChange('customer_id', e.target.value)}
                options={[
                  { value: '', label: customers.length ? 'Select customer...' : 'No customers yet — add one first' },
                  ...customers.map((c) => ({ value: c.id, label: `${c.name} (${c.email})` })),
                ]}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shipping Type *
              </label>
              <Select
                value={formData.shipment_type}
                onChange={(e) => handleInputChange('shipment_type', e.target.value)}
                options={[
                  { value: 'AIR', label: 'Air Freight' },
                  { value: 'SEA', label: 'Sea Freight' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Received By
              </label>
              <Input
                value={formData.received_by}
                onChange={(e) => handleInputChange('received_by', e.target.value)}
                placeholder="Staff name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warehouse Location
              </label>
              <Input
                value={formData.warehouse_location}
                onChange={(e) => handleInputChange('warehouse_location', e.target.value)}
                placeholder="SP"
              />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Shipper Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shipper Name
              </label>
              <Input
                value={formData.shipper_name}
                onChange={(e) => handleInputChange('shipper_name', e.target.value)}
                placeholder="FASHION NOVA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shipper Address
              </label>
              <Input
                value={formData.shipper_address}
                onChange={(e) => handleInputChange('shipper_address', e.target.value)}
                placeholder="2801 E 46TH ST"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <Input
                value={formData.shipper_city}
                onChange={(e) => handleInputChange('shipper_city', e.target.value)}
                placeholder="VERNON"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <Input
                value={formData.shipper_state}
                onChange={(e) => handleInputChange('shipper_state', e.target.value)}
                placeholder="CA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <Input
                value={formData.shipper_country}
                onChange={(e) => handleInputChange('shipper_country', e.target.value)}
                placeholder="UNITED STATES"
              />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Carrier & References</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Carrier Name
              </label>
              <Input
                value={formData.carrier_name}
                onChange={(e) => handleInputChange('carrier_name', e.target.value)}
                placeholder="UPS GROUND"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PRO Number
              </label>
              <Input
                value={formData.pro_number}
                onChange={(e) => handleInputChange('pro_number', e.target.value)}
                placeholder="PRO/BOL number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier
              </label>
              <Input
                value={formData.supplier}
                onChange={(e) => handleInputChange('supplier', e.target.value)}
                placeholder="Supplier name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Number
              </label>
              <Input
                value={formData.invoice_number}
                onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                placeholder="Invoice #"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                P.O. Number
              </label>
              <Input
                value={formData.po_number}
                onChange={(e) => handleInputChange('po_number', e.target.value)}
                placeholder="Purchase order #"
              />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Package Details</h2>
            <Button type="button" onClick={addPackage} variant="secondary" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Package
            </Button>
          </div>

          {packages.map((pkg, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Package {index + 1}</h3>
                {packages.length > 1 && (
                  <Button type="button" onClick={() => removePackage(index)} variant="secondary" size="sm">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pieces</label>
                  <Input
                    type="number"
                    min="1"
                    value={pkg.pieces_count}
                    onChange={(e) => handlePackageChange(index, 'pieces_count', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <Select
                    value={pkg.package_type}
                    onChange={(e) => handlePackageChange(index, 'package_type', e.target.value)}
                    options={packageTypeOptions}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Length (in)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pkg.length}
                    onChange={(e) => handlePackageChange(index, 'length', e.target.value)}
                    placeholder="21.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Width (in)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pkg.width}
                    onChange={(e) => handlePackageChange(index, 'width', e.target.value)}
                    placeholder="16.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (in)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pkg.height}
                    onChange={(e) => handlePackageChange(index, 'height', e.target.value)}
                    placeholder="7.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (lb)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pkg.weight}
                    onChange={(e) => handlePackageChange(index, 'weight', e.target.value)}
                    placeholder="12.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location</label>
                  <Input
                    value={pkg.storage_location}
                    onChange={(e) => handlePackageChange(index, 'storage_location', e.target.value)}
                    placeholder="SP"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <Input
                    value={pkg.description}
                    onChange={(e) => handlePackageChange(index, 'description', e.target.value)}
                    placeholder="GENERAL MERCHANDISE"
                  />
                </div>
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Notes</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">General Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of contents"
              rows={2}
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Internal notes for staff"
              rows={3}
            />
          </div>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="flex-1">
            <Save className="w-5 h-5 mr-2" />
            {loading ? 'Processing...' : 'Process Receipt & Notify Customer'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/admin/dashboard')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};
