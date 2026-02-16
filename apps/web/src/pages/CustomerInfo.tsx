import { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { getCurrentUser } from '../auth';
import toast from 'react-hot-toast';
import { User, Mail, Phone, MapPin, Building, Plane, Ship, Package } from 'lucide-react';

interface CustomerInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  air_skybox_address?: string;
  sea_skybox_address?: string;
}

export const CustomerInfo = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    id: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    air_skybox_address: '',
    sea_skybox_address: '',
  });

  useEffect(() => {
    fetchCustomerInfo();
  }, []);

  const fetchCustomerInfo = async () => {
    try {
      setLoading(true);
      const user = getCurrentUser();

      if (!user) {
        toast.error('Not authenticated');
        setLoading(false);
        return;
      }

      // TODO: Phase 3 - Fetch from AWS RDS via API Gateway
      setCustomerInfo((prev) => ({
        ...prev,
        email: user.email || '',
      }));
    } catch (error) {
      console.error('Error fetching customer info:', error);
      toast.error('Failed to load customer information');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const user = getCurrentUser();

      if (!user) {
        toast.error('Not authenticated');
        setSaving(false);
        return;
      }

      // TODO: Phase 3 - Save to AWS RDS via API Gateway
      toast('Database features coming in Phase 3', { icon: 'ℹ️' });
      setEditing(false);
    } catch (error) {
      console.error('Error saving customer info:', error);
      toast.error('Failed to save customer information');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <LoadingSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customer Information</h1>
        <p className="text-gray-600 mt-1">Manage your personal and contact details</p>
      </div>

      <Card>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Personal Details</h2>
                <p className="text-sm text-gray-500">Your account information</p>
              </div>
            </div>
            {!editing && (
              <Button onClick={() => setEditing(true)} variant="secondary">
                Edit
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </div>
              </label>
              <Input
                value={customerInfo.name}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, name: e.target.value })
                }
                disabled={!editing}
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </div>
              </label>
              <Input
                type="email"
                value={customerInfo.email}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, email: e.target.value })
                }
                disabled={!editing}
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </div>
              </label>
              <Input
                type="tel"
                value={customerInfo.phone}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, phone: e.target.value })
                }
                disabled={!editing}
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Company
                </div>
              </label>
              <Input
                value={customerInfo.company}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, company: e.target.value })
                }
                disabled={!editing}
                placeholder="Enter your company name"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </div>
              </label>
              <Input
                value={customerInfo.address}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, address: e.target.value })
                }
                disabled={!editing}
                placeholder="Enter your full address"
              />
            </div>
          </div>

          {editing && (
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                onClick={() => {
                  setEditing(false);
                  fetchCustomerInfo();
                }}
                variant="secondary"
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </Card>

      {customerInfo.air_skybox_address || customerInfo.sea_skybox_address ? (
        <Card className="bg-gradient-to-br from-blue-50 to-teal-50 border-blue-200 mt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Package className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Your Skybox Addresses</h2>
              <p className="text-sm text-gray-600 mb-4">Use these addresses when shipping your packages</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customerInfo.air_skybox_address && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Plane className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-gray-900">Air Freight Address</h3>
                    </div>
                    <p className="text-sm text-gray-700 font-mono bg-gray-50 p-3 rounded border border-gray-200 whitespace-pre-line">
                      {customerInfo.air_skybox_address}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">For faster delivery via air freight</p>
                  </div>
                )}

                {customerInfo.sea_skybox_address && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Ship className="w-5 h-5 text-teal-600" />
                      <h3 className="font-bold text-gray-900">Sea Freight Address</h3>
                    </div>
                    <p className="text-sm text-gray-700 font-mono bg-gray-50 p-3 rounded border border-gray-200 whitespace-pre-line">
                      {customerInfo.sea_skybox_address}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">For cost-effective shipping via sea freight</p>
                  </div>
                )}
              </div>

              <div className="mt-4 bg-blue-100 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Tip:</span> Always include your skybox address as the shipping destination when ordering online
                </p>
              </div>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
};
