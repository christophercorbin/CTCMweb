import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import toast from 'react-hot-toast';
import { User, Mail, Phone, MapPin, Building, Plane, Ship, Package, Copy, Check } from 'lucide-react';

const client = generateClient<Schema>();

interface CustomerData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  airSkyboxAddress: string;
  seaSkyboxAddress: string;
}

const EMPTY: CustomerData = {
  id: '',
  name: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  company: '',
  airSkyboxAddress: '',
  seaSkyboxAddress: '',
};

function AddressBlock({ icon, title, address, sub }: {
  icon: React.ReactNode
  title: string
  address: string
  sub: string
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
        </div>
        {address && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
      {address ? (
        <pre className="text-sm text-gray-700 font-mono bg-gray-50 p-3 rounded border border-gray-200 whitespace-pre-wrap leading-relaxed">
          {address}
        </pre>
      ) : (
        <p className="text-sm text-gray-400 italic bg-gray-50 p-3 rounded border border-gray-200">
          Not set — contact support
        </p>
      )}
      <p className="text-xs text-gray-500 mt-2">{sub}</p>
    </div>
  );
}

export const CustomerInfo = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerData>(EMPTY);
  // Snapshot to restore on cancel
  const [snapshot, setSnapshot] = useState<CustomerData>(EMPTY);

  useEffect(() => {
    fetchCustomerInfo();
  }, []);

  const fetchCustomerInfo = async () => {
    try {
      setLoading(true);
      const { data, errors } = await client.models.Customer.list();

      if (errors?.length) {
        console.error('[CustomerInfo] AppSync errors:', errors);
        toast.error('Failed to load customer information');
        return;
      }

      const record = data?.[0];
      if (!record) {
        // No Customer record yet (e.g. admin-created account without post-confirmation trigger)
        setLoading(false);
        return;
      }

      const fullName = record.name ?? ''
      const spaceIdx = fullName.indexOf(' ')
      const firstName = spaceIdx > -1 ? fullName.slice(0, spaceIdx) : fullName
      const lastName  = spaceIdx > -1 ? fullName.slice(spaceIdx + 1) : ''

      const loaded: CustomerData = {
        id: record.id,
        name: fullName,
        firstName,
        lastName,
        email: record.email ?? '',
        phone: record.phone ?? '',
        address: record.address ?? '',
        company: record.company ?? '',
        airSkyboxAddress: record.airSkyboxAddress ?? '',
        seaSkyboxAddress: record.seaSkyboxAddress ?? '',
      };

      setCustomerData(loaded);
      setSnapshot(loaded);
    } catch (error) {
      console.error('[CustomerInfo] fetch error:', error);
      toast.error('Failed to load customer information');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!customerData.id) {
      toast.error('No customer record found');
      return;
    }

    try {
      setSaving(true);

      const combinedName = [customerData.firstName.trim(), customerData.lastName.trim()].filter(Boolean).join(' ')

      const { errors } = await client.models.Customer.update({
        id: customerData.id,
        name: combinedName || customerData.name,
        phone: customerData.phone || undefined,
        address: customerData.address || undefined,
        company: customerData.company || undefined,
      });

      if (errors?.length) {
        console.error('[CustomerInfo] update errors:', errors);
        toast.error('Failed to save customer information');
        return;
      }

      setSnapshot(customerData);
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('[CustomerInfo] save error:', error);
      toast.error('Failed to save customer information');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setCustomerData(snapshot);
    setEditing(false);
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
                  First Name
                </div>
              </label>
              <Input
                value={customerData.firstName}
                onChange={(e) => setCustomerData({ ...customerData, firstName: e.target.value })}
                disabled={!editing}
                placeholder="Enter your first name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Last Name
                </div>
              </label>
              <Input
                value={customerData.lastName}
                onChange={(e) => setCustomerData({ ...customerData, lastName: e.target.value })}
                disabled={!editing}
                placeholder="Enter your last name"
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
                value={customerData.email}
                disabled
                placeholder="Your email address"
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
                value={customerData.phone}
                onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
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
                value={customerData.company}
                onChange={(e) => setCustomerData({ ...customerData, company: e.target.value })}
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
                value={customerData.address}
                onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
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
              <Button onClick={handleCancel} variant="secondary" disabled={saving}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-blue-50 to-teal-50 border-blue-200 mt-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-600 rounded-lg flex-shrink-0">
            <Package className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-1">My Addresses</h2>
            <p className="text-sm text-gray-600 mb-4">Use these addresses when placing orders online — your package will be forwarded to Barbados</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AddressBlock
                icon={<Plane className="w-5 h-5 text-blue-600" />}
                title="✈ Air Freight"
                address={customerData.airSkyboxAddress}
                sub="Faster delivery · typically 3–5 days"
              />
              <AddressBlock
                icon={<Ship className="w-5 h-5 text-teal-600" />}
                title="🚢 Sea Freight"
                address={customerData.seaSkyboxAddress}
                sub="Cost-effective · typically 3–4 weeks"
              />
            </div>

            <div className="mt-4 bg-blue-100 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Tip:</span> Copy and paste your shipping address directly into checkout — your name is already included at the top.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
