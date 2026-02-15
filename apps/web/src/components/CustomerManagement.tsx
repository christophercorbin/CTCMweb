import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, Mail, Phone, Package, Edit2, Trash2 } from 'lucide-react';
import { Button, Input, Card, LoadingSkeleton, EmptyState, Modal } from './index';
import { Customer } from '../types';

export const CustomerManagement = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      // TODO: Phase 3 - Connect to AWS RDS via API Gateway
      console.log('CustomerManagement: Database not yet migrated. Showing empty state.');
      setCustomers([]);
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      // TODO: Phase 3 - Connect to AWS RDS via API Gateway
      toast.info('Database features coming in Phase 3');
    } catch (error) {
      toast.error('Failed to delete customer');
      console.error(error);
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.email.toLowerCase().includes(search.toLowerCase()) ||
    customer.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
          <p className="text-gray-600 mt-1">Manage customer information and skybox addresses</p>
        </div>
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{customer.phone}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-900 uppercase">Air Freight</span>
                        </div>
                        <p className="text-sm text-gray-700 font-mono">{customer.air_skybox_address}</p>
                      </div>
                      <div className="bg-teal-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-4 h-4 text-teal-600" />
                          <span className="text-xs font-semibold text-teal-900 uppercase">Sea Freight</span>
                        </div>
                        <p className="text-sm text-gray-700 font-mono">{customer.sea_skybox_address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
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
  customer: Customer | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CustomerFormModal = ({ customer, onClose, onSuccess }: CustomerFormModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    air_skybox_address: customer?.air_skybox_address || '',
    sea_skybox_address: customer?.sea_skybox_address || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Phase 3 - Connect to AWS RDS via API Gateway
      toast.info('Database features coming in Phase 3');
      onSuccess();
    } catch (error: any) {
      toast.error(customer ? 'Failed to update customer' : 'Failed to add customer');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={customer ? 'Edit Customer' : 'Add New Customer'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="John Doe"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (246) 123-4567"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Air Freight Skybox Address
          </label>
          <Input
            type="text"
            value={formData.air_skybox_address}
            onChange={(e) => setFormData({ ...formData, air_skybox_address: e.target.value })}
            placeholder="Miami, FL 33101, USA - Box #12345"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Customer's skybox address for air freight shipments</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sea Freight Skybox Address
          </label>
          <Input
            type="text"
            value={formData.sea_skybox_address}
            onChange={(e) => setFormData({ ...formData, sea_skybox_address: e.target.value })}
            placeholder="Miami Port, FL 33132, USA - Box #12345"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Customer's skybox address for sea freight shipments</p>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Saving...' : customer ? 'Update Customer' : 'Add Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
