import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import toast from 'react-hot-toast';
import { Plus, Search, Mail, Phone, Package, Edit2, Trash2, RefreshCw, PackagePlus, ExternalLink } from 'lucide-react';
import { Button, Input, Card, LoadingSkeleton, EmptyState, Modal } from './index';

const client = generateClient<Schema>();

type AppCustomer = Schema['Customer']['type']

// ── Skybox address templates ──────────────────────────────────────
const buildAirAddress = (name: string) =>
  `${name}\nCaribconex - CargoLink Barbados\n13155 NW 19th Lane\nDoral\nFL 33182`

const buildSeaAddress = (name: string) =>
  `${name}\nIntegrity Logistics-CargoLink Barbados\n10301 NW 108TH AVE UNIT 2B MEDLEY, FL 33178`

// ── Phone auto-formatter ──────────────────────────────────────────
const formatPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(-10) // keep last 10 digits
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
}

interface CustomerManagementProps {
  /** Called when admin clicks "New Shipment" on a customer card */
  onCreateShipment?: (customer: AppCustomer) => void
  /** Active shipment count per customerId — shows a badge on each card */
  shipmentCounts?: Record<string, number>
}

export const CustomerManagement = ({ onCreateShipment, shipmentCounts }: CustomerManagementProps) => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<AppCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<AppCustomer | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const allItems: AppCustomer[] = [];
      let cursor: string | undefined;
      do {
        const result = await client.models.Customer.list({ limit: 1000, nextToken: cursor });
        if (result.errors?.length) throw new Error(result.errors[0].message);
        allItems.push(...result.data);
        cursor = result.nextToken ?? undefined;
      } while (cursor);
      setCustomers(allItems);
    } catch (error) {
      toast.error('Failed to load customers');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSyncFromCognito = async () => {
    setSyncing(true);
    try {
      const { data: result, errors } = await client.mutations.syncCustomersFromCognito({});
      if (errors?.length) throw new Error(errors[0].message);
      const { synced, skipped, errors: syncErrors } = result ?? {};
      if ((syncErrors ?? 0) > 0) {
        toast.error(`Sync finished with ${syncErrors} error(s). Check CloudWatch logs.`);
      } else {
        toast.success(
          synced === 0
            ? `All customers already synced (${skipped} skipped)`
            : `Synced ${synced} new customer${synced !== 1 ? 's' : ''}`
        );
      }
      await fetchCustomers();
    } catch (error) {
      toast.error('Failed to sync customers from Cognito');
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (customerId?: string) => {
    if (!customerId) return;
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      const { errors } = await client.models.Customer.delete({ id: customerId });
      if (errors?.length) throw new Error(errors[0].message);
      toast.success('Customer deleted');
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to delete customer');
      console.error(error);
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.email.toLowerCase().includes(search.toLowerCase()) ||
    (customer.phone ?? '').includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
          <p className="text-gray-600 mt-1">Manage customer information and skybox addresses</p>
        </div>
        <Button
          onClick={handleSyncFromCognito}
          variant="secondary"
          loading={syncing}
          icon={<RefreshCw className="w-4 h-4" />}
        >
          Refresh
        </Button>
        <Button
          onClick={() => {
            setEditingCustomer(null);
            setIsAddModalOpen(true);
          }}
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
        >
          Add Customer
        </Button>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4 text-gray-400" />}
            />
          </div>
          <div className="text-sm text-gray-600">
            {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'}
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : filteredCustomers.length === 0 ? (
          <EmptyState
            title="No customers found"
            message={search ? 'Try adjusting your search terms' : 'Add your first customer to get started'}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-gray-900">{customer.name}</h3>
                      {shipmentCounts !== undefined && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {shipmentCounts[customer.id] ?? 0} shipment{(shipmentCounts[customer.id] ?? 0) !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{customer.phone ?? '—'}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-900 uppercase">Air Freight</span>
                        </div>
                        <pre className="text-sm text-gray-700 font-mono whitespace-pre-wrap leading-relaxed">{customer.airSkyboxAddress || '—'}</pre>
                      </div>
                      <div className="bg-teal-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-4 h-4 text-teal-600" />
                          <span className="text-xs font-semibold text-teal-900 uppercase">Sea Freight</span>
                        </div>
                        <pre className="text-sm text-gray-700 font-mono whitespace-pre-wrap leading-relaxed">{customer.seaSkyboxAddress || '—'}</pre>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => navigate(`/admin/customers/${customer.id}`)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View customer detail"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    {onCreateShipment && (
                      <button
                        onClick={() => onCreateShipment(customer)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Create shipment for this customer"
                      >
                        <PackagePlus className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingCustomer(customer);
                        setIsAddModalOpen(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit customer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete customer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {isAddModalOpen && (
        <CustomerFormModal
          customer={editingCustomer}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingCustomer(null);
          }}
          onSuccess={() => {
            setIsAddModalOpen(false);
            setEditingCustomer(null);
            fetchCustomers();
          }}
        />
      )}
    </div>
  );
};

interface CustomerFormModalProps {
  customer: AppCustomer | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CustomerFormModal = ({ customer, onClose, onSuccess }: CustomerFormModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    email: customer?.email ?? '',
    airSkyboxAddress: customer?.airSkyboxAddress ?? '',
    seaSkyboxAddress: customer?.seaSkyboxAddress ?? '',
  });

  // Use a ref (not state) so handleNameChange always reads the latest value
  // without stale closure issues or accidental browser-autofill interference.
  const manualEdit = useRef({
    air: !!customer?.airSkyboxAddress,
    sea: !!customer?.seaSkyboxAddress,
  });

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      airSkyboxAddress: manualEdit.current.air ? prev.airSkyboxAddress : (name ? buildAirAddress(name) : ''),
      seaSkyboxAddress: manualEdit.current.sea ? prev.seaSkyboxAddress : (name ? buildSeaAddress(name) : ''),
    }));
  };

  const handleAirChange = (val: string) => {
    manualEdit.current.air = true;
    setFormData(prev => ({ ...prev, airSkyboxAddress: val }));
  };

  const handleSeaChange = (val: string) => {
    manualEdit.current.sea = true;
    setFormData(prev => ({ ...prev, seaSkyboxAddress: val }));
  };

  const handlePhoneChange = (raw: string) => {
    setFormData(prev => ({ ...prev, phone: formatPhone(raw) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (customer) {
        const { errors } = await client.models.Customer.update({
          id: customer.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          airSkyboxAddress: formData.airSkyboxAddress,
          seaSkyboxAddress: formData.seaSkyboxAddress,
        });
        if (errors?.length) throw new Error(errors[0].message);
        toast.success('Customer updated');
      } else {
        // Create Cognito account + Customer DB record + send welcome email
        const { data: result, errors } = await client.mutations.createCustomerWithAccount({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          airSkyboxAddress: formData.airSkyboxAddress || undefined,
          seaSkyboxAddress: formData.seaSkyboxAddress || undefined,
        });
        if (errors?.length) throw new Error(errors[0].message);
        if (!result?.success) throw new Error(result?.message ?? 'Failed to create account');
        toast.success(`Account created! Welcome email sent to ${formData.email}`);
      }
      onSuccess();
    } catch (error) {
      toast.error(customer ? 'Failed to update customer' : 'Failed to add customer');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fieldCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={customer ? 'Edit Customer' : 'Add New Customer'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Jane Smith"
            required
          />
          {!customer && (
            <p className="text-xs text-gray-400 mt-1">Shipping addresses will be auto-generated from this name.</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="jane@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(246) 123-4567"
              required
            />
          </div>
        </div>

        {/* ── Air address ── */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">✈ Air Skybox Address</label>
            {manualEdit.current.air && !customer && (
              <button
                type="button"
                onClick={() => {
                  manualEdit.current.air = false;
                  setFormData(prev => ({ ...prev, airSkyboxAddress: prev.name ? buildAirAddress(prev.name) : '' }));
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                Reset to auto
              </button>
            )}
          </div>
          <textarea
            value={formData.airSkyboxAddress}
            onChange={(e) => handleAirChange(e.target.value)}
            rows={4}
            className={`${fieldCls} font-mono resize-none`}
            placeholder={`Customer Name\nCaribconex - CargoLink Barbados\n13155 NW 19th Lane\nDoral, FL 33182`}
          />
        </div>

        {/* ── Sea address ── */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">🚢 Sea Skybox Address</label>
            {manualEdit.current.sea && !customer && (
              <button
                type="button"
                onClick={() => {
                  manualEdit.current.sea = false;
                  setFormData(prev => ({ ...prev, seaSkyboxAddress: prev.name ? buildSeaAddress(prev.name) : '' }));
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                Reset to auto
              </button>
            )}
          </div>
          <textarea
            value={formData.seaSkyboxAddress}
            onChange={(e) => handleSeaChange(e.target.value)}
            rows={4}
            className={`${fieldCls} font-mono resize-none`}
            placeholder={`Customer Name\nIntegrity Logistics-CargoLink Barbados\n10301 NW 108TH AVE UNIT 2B\nMEDLEY, FL 33178`}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" onClick={onClose} variant="secondary" className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading} className="flex-1">
            {loading ? 'Saving...' : customer ? 'Update Customer' : 'Add Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
