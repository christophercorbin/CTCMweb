import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { Package, Plus, Trash2, Save, Link, PlusCircle, ChevronDown, X } from 'lucide-react';
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

interface ShipmentOption {
  id: string;
  trackingNumber: string;
  customerId: string;
  customerName?: string;
  status: string;
  type: string;
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

interface Props {
  onSuccess?: () => void;
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

export const WarehouseReceiptIntake = ({ onSuccess }: Props = {}) => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Customer combobox state
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);
  const customerComboRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerComboRef.current && !customerComboRef.current.contains(e.target as Node)) {
        setCustomerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const sortedCustomers = useMemo(
    () => customers.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [customers]
  );

  const filteredCustomerOptions = customerQuery.trim()
    ? sortedCustomers.filter((c) => {
        const q = customerQuery.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
      })
    : sortedCustomers;

  // Link-to-existing state
  const [linkToExisting, setLinkToExisting] = useState(false);
  const [existingShipments, setExistingShipments] = useState<ShipmentOption[]>([]);
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [selectedShipmentId, setSelectedShipmentId] = useState('');

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
    fetchShipments();
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

  const fetchShipments = async () => {
    try {
      const { data } = await client.models.Shipment.list();
      const list = data ?? [];
      // Fetch customer names in parallel
      const uniqueCustomerIds = [...new Set(list.map(s => s.customerId).filter(Boolean))];
      const customerResults = await Promise.all(
        uniqueCustomerIds.map(id => client.models.Customer.get({ id }))
      );
      const customerNameMap: Record<string, string> = {};
      customerResults.forEach(({ data: c }) => { if (c) customerNameMap[c.id] = c.name });

      setExistingShipments(
        list.map(s => ({
          id: s.id,
          trackingNumber: s.trackingNumber,
          customerId: s.customerId,
          customerName: customerNameMap[s.customerId],
          status: s.status,
          type: s.type,
        }))
      );
    } catch {
      // Non-fatal — just hides the link option
    }
  };

  const filteredShipments = useMemo(() => {
    const q = shipmentSearch.toLowerCase();
    if (!q) return existingShipments.slice(0, 50);
    return existingShipments.filter(s =>
      s.trackingNumber.toLowerCase().includes(q) ||
      s.customerName?.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [existingShipments, shipmentSearch]);

  const selectedShipment = existingShipments.find(s => s.id === selectedShipmentId);

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
          length: '', width: '', height: '',
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

    if (linkToExisting) {
      if (!selectedShipmentId) {
        toast.error('Please select a shipment to link this receipt to');
        return;
      }
    } else {
      if (!formData.tracking_number || !formData.customer_id) {
        toast.error('Tracking number and customer are required');
        return;
      }
    }

    setLoading(true);

    try {
      let shipmentId: string;
      const selectedCustomer = customers.find((c) => c.id === formData.customer_id);

      if (linkToExisting) {
        // ── Link to existing shipment ──
        shipmentId = selectedShipmentId;

        // Update status to MIAMI_WAREHOUSE and save WR#
        await client.models.Shipment.update({
          id: shipmentId,
          status: 'MIAMI_WAREHOUSE',
          warehouseReceiptNumber: formData.warehouse_receipt_number || undefined,
        });
      } else {
        // ── Create new shipment ──
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

        const { data: shipment, errors: shipmentErrors } = await client.models.Shipment.create({
          trackingNumber: formData.tracking_number,
          customerId: formData.customer_id,
          customerCognitoSub: selectedCustomer?.cognitoSub ?? undefined,
          status: 'MIAMI_WAREHOUSE',
          type: formData.shipment_type as 'AIR' | 'SEA',
          origin,
          description,
          warehouseReceiptNumber: formData.warehouse_receipt_number || undefined,
        });

        if (shipmentErrors?.length) throw new Error(shipmentErrors[0].message);
        if (!shipment) throw new Error('Failed to create shipment');
        shipmentId = shipment.id;
      }

      // Add package records
      await Promise.all(
        packages.map((pkg) =>
          client.models.Package.create({
            shipmentId,
            packageType: toSchemaPackageType(pkg.package_type),
            weight: pkg.weight ? parseFloat(pkg.weight) : undefined,
            weightUnit: 'lb',
            length: pkg.length ? parseFloat(pkg.length) : undefined,
            width: pkg.width ? parseFloat(pkg.width) : undefined,
            height: pkg.height ? parseFloat(pkg.height) : undefined,
            dimensionUnit: 'in',
            description: pkg.description || undefined,
            quantity: pkg.pieces_count,
            customerCognitoSub: selectedCustomer?.cognitoSub ?? undefined,
          })
        )
      );

      // Add timeline event
      await client.models.ShipmentEvent.create({
        shipmentId,
        status: 'MIAMI_WAREHOUSE',
        location: formData.warehouse_location || 'Miami, FL',
        description: `Warehouse receipt processed${formData.received_by ? ` by ${formData.received_by}` : ''}${formData.warehouse_receipt_number ? ` — WR# ${formData.warehouse_receipt_number}` : ''}`,
        eventTimestamp: new Date().toISOString(),
        customerCognitoSub: selectedCustomer?.cognitoSub ?? undefined,
      });

      toast.success('Warehouse receipt processed successfully');

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/admin/dashboard');
      }
    } catch (error) {
      console.error('Error processing warehouse receipt:', error);
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
      <form onSubmit={handleSubmit} className="space-y-6">
        <DocumentScanner onExtract={handleExtractedData} />

        {/* ── Link to existing / create new toggle ── */}
        <Card>
          <h2 className="text-base font-bold text-gray-900 mb-3">Link to Shipment</h2>
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={() => { setLinkToExisting(false); setSelectedShipmentId('') }}
              className={`flex items-center gap-2 flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
                !linkToExisting
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              Create new shipment
            </button>
            <button
              type="button"
              onClick={() => setLinkToExisting(true)}
              className={`flex items-center gap-2 flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
                linkToExisting
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Link className="w-4 h-4" />
              Link to existing shipment
            </button>
          </div>

          {linkToExisting ? (
            <div className="space-y-3">
              <input
                type="text"
                value={shipmentSearch}
                onChange={e => setShipmentSearch(e.target.value)}
                placeholder="Search by tracking # or customer name…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {filteredShipments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No shipments found</p>
                ) : filteredShipments.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedShipmentId(s.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center justify-between ${
                      selectedShipmentId === s.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div>
                      <p className="text-sm font-mono font-medium text-gray-900">{s.trackingNumber}</p>
                      <p className="text-xs text-gray-500">{s.customerName ?? s.customerId} · {s.type} · {s.status}</p>
                    </div>
                    {selectedShipmentId === s.id && (
                      <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Selected</span>
                    )}
                  </button>
                ))}
              </div>
              {selectedShipment && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                  <Package className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-800">
                    Receipt will be linked to <span className="font-mono font-semibold">{selectedShipment.trackingNumber}</span>
                    {' '}— status will update to <span className="font-semibold">MIAMI_WAREHOUSE</span>
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </Card>

        {/* ── Basic info (only shown when creating new) ── */}
        {!linkToExisting && (
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number *</label>
                <Input
                  value={formData.tracking_number}
                  onChange={(e) => handleInputChange('tracking_number', e.target.value)}
                  placeholder="1zw6535x1325401737"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Receipt Number</label>
                <Input
                  value={formData.warehouse_receipt_number}
                  onChange={(e) => handleInputChange('warehouse_receipt_number', e.target.value)}
                  placeholder="W296434"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                <div ref={customerComboRef} className="relative">
                  <div className={`flex items-center border rounded-lg overflow-hidden transition-shadow ${
                    customerOpen ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
                  }`}>
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 text-sm outline-none bg-white placeholder-gray-400"
                      placeholder={customers.length ? 'Search by name or email…' : 'Loading customers…'}
                      value={customerQuery}
                      onChange={(e) => {
                        setCustomerQuery(e.target.value);
                        setCustomerOpen(true);
                        if (!e.target.value) handleInputChange('customer_id', '');
                      }}
                      onFocus={() => setCustomerOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setCustomerOpen(false);
                        if (e.key === 'Enter' && filteredCustomerOptions.length > 0) {
                          e.preventDefault();
                          const c = filteredCustomerOptions[0];
                          handleInputChange('customer_id', c.id);
                          setCustomerQuery(`${c.name} — ${c.email}`);
                          setCustomerOpen(false);
                        }
                      }}
                    />
                    {formData.customer_id && (
                      <button
                        type="button"
                        onClick={() => {
                          handleInputChange('customer_id', '');
                          setCustomerQuery('');
                          setCustomerOpen(false);
                        }}
                        className="px-2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <span className="px-2 text-gray-400 pointer-events-none">
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </div>

                  {customerOpen && customers.length > 0 && (
                    <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                      {filteredCustomerOptions.length === 0 ? (
                        <li className="px-4 py-3 text-sm text-gray-400">No customers match "{customerQuery}"</li>
                      ) : (
                        filteredCustomerOptions.map((c) => (
                          <li
                            key={c.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleInputChange('customer_id', c.id);
                              setCustomerQuery(`${c.name} — ${c.email}`);
                              setCustomerOpen(false);
                            }}
                            className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between group ${
                              c.id === formData.customer_id
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-800 hover:bg-gray-50'
                            }`}
                          >
                            <span>{c.name}</span>
                            <span className={`text-xs ${c.id === formData.customer_id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`}>
                              {c.email}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Type *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Received By</label>
                <Input
                  value={formData.received_by}
                  onChange={(e) => handleInputChange('received_by', e.target.value)}
                  placeholder="Staff name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Location</label>
                <Input
                  value={formData.warehouse_location}
                  onChange={(e) => handleInputChange('warehouse_location', e.target.value)}
                  placeholder="SP"
                />
              </div>
            </div>
          </Card>
        )}

        {/* ── When linking, still capture WR# and received by ── */}
        {linkToExisting && (
          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Receipt Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Receipt Number</label>
                <Input
                  value={formData.warehouse_receipt_number}
                  onChange={(e) => handleInputChange('warehouse_receipt_number', e.target.value)}
                  placeholder="W296434"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Received By</label>
                <Input
                  value={formData.received_by}
                  onChange={(e) => handleInputChange('received_by', e.target.value)}
                  placeholder="Staff name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Location</label>
                <Input
                  value={formData.warehouse_location}
                  onChange={(e) => handleInputChange('warehouse_location', e.target.value)}
                  placeholder="SP"
                />
              </div>
            </div>
          </Card>
        )}

        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Shipper Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shipper Name</label>
              <Input value={formData.shipper_name} onChange={(e) => handleInputChange('shipper_name', e.target.value)} placeholder="FASHION NOVA" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shipper Address</label>
              <Input value={formData.shipper_address} onChange={(e) => handleInputChange('shipper_address', e.target.value)} placeholder="2801 E 46TH ST" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <Input value={formData.shipper_city} onChange={(e) => handleInputChange('shipper_city', e.target.value)} placeholder="VERNON" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <Input value={formData.shipper_state} onChange={(e) => handleInputChange('shipper_state', e.target.value)} placeholder="CA" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <Input value={formData.shipper_country} onChange={(e) => handleInputChange('shipper_country', e.target.value)} placeholder="UNITED STATES" />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Carrier &amp; References</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Carrier Name</label>
              <Input value={formData.carrier_name} onChange={(e) => handleInputChange('carrier_name', e.target.value)} placeholder="UPS GROUND" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PRO Number</label>
              <Input value={formData.pro_number} onChange={(e) => handleInputChange('pro_number', e.target.value)} placeholder="PRO/BOL number" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <Input value={formData.supplier} onChange={(e) => handleInputChange('supplier', e.target.value)} placeholder="Supplier name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
              <Input value={formData.invoice_number} onChange={(e) => handleInputChange('invoice_number', e.target.value)} placeholder="Invoice #" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">P.O. Number</label>
              <Input value={formData.po_number} onChange={(e) => handleInputChange('po_number', e.target.value)} placeholder="Purchase order #" />
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
                  <Input type="number" min="1" value={pkg.pieces_count} onChange={(e) => handlePackageChange(index, 'pieces_count', parseInt(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <Select value={pkg.package_type} onChange={(e) => handlePackageChange(index, 'package_type', e.target.value)} options={packageTypeOptions} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Length (in)</label>
                  <Input type="number" step="0.01" value={pkg.length} onChange={(e) => handlePackageChange(index, 'length', e.target.value)} placeholder="21.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Width (in)</label>
                  <Input type="number" step="0.01" value={pkg.width} onChange={(e) => handlePackageChange(index, 'width', e.target.value)} placeholder="16.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (in)</label>
                  <Input type="number" step="0.01" value={pkg.height} onChange={(e) => handlePackageChange(index, 'height', e.target.value)} placeholder="7.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (lb)</label>
                  <Input type="number" step="0.01" value={pkg.weight} onChange={(e) => handlePackageChange(index, 'weight', e.target.value)} placeholder="12.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location</label>
                  <Input value={pkg.storage_location} onChange={(e) => handlePackageChange(index, 'storage_location', e.target.value)} placeholder="SP" />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <Input value={pkg.description} onChange={(e) => handlePackageChange(index, 'description', e.target.value)} placeholder="GENERAL MERCHANDISE" />
                </div>
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Notes</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">General Description</label>
            <Textarea value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} placeholder="Brief description of contents" rows={2} />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
            <Textarea value={formData.notes} onChange={(e) => handleInputChange('notes', e.target.value)} placeholder="Internal notes for staff" rows={3} />
          </div>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="flex-1">
            <Save className="w-5 h-5 mr-2" />
            {loading ? 'Processing...' : 'Process Receipt'}
          </Button>
          {!onSuccess && (
            <Button type="button" variant="secondary" onClick={() => navigate('/admin/dashboard')}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};
