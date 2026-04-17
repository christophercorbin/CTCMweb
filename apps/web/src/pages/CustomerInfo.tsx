import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import toast from 'react-hot-toast';
import { User, Mail, Phone, MapPin, Building, Plane, Ship, Package, Copy, Check, Pencil } from 'lucide-react';
import {
  nameSchema,
  phoneSchema,
  addressSchema,
  companySchema,
  normalisePhone,
} from '../lib/schemas';

const client = generateClient<Schema>();

/** Editable profile fields. Email is read-only (managed by Cognito). */
const profileSchema = z.object({
  firstName: nameSchema,
  lastName:  nameSchema,
  phone:     phoneSchema,
  address:   addressSchema,
  company:   companySchema,
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface CustomerRecord extends ProfileFormData {
  id: string;
  email: string;
  airSkyboxAddress: string;
  seaSkyboxAddress: string;
}

const EMPTY: CustomerRecord = {
  id: '',
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

/** Read-mode field: label + icon + plain text (or "—" placeholder). */
function ReadField({
  icon,
  label,
  value,
  className = '',
}: {
  icon: React.ReactNode
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
        {icon}
        {label}
      </div>
      <p className={`text-base ${value ? 'text-gray-900' : 'text-gray-400 italic'}`}>
        {value || 'Not set'}
      </p>
    </div>
  );
}

export const CustomerInfo = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [record, setRecord] = useState<CustomerRecord>(EMPTY);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      address: '',
      company: '',
    },
  });

  useEffect(() => {
    fetchCustomerInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const row = data?.[0];
      if (!row) {
        setLoading(false);
        return;
      }

      const fullName = row.name ?? '';
      const spaceIdx = fullName.indexOf(' ');
      const firstName = spaceIdx > -1 ? fullName.slice(0, spaceIdx) : fullName;
      const lastName  = spaceIdx > -1 ? fullName.slice(spaceIdx + 1) : '';

      const loaded: CustomerRecord = {
        id: row.id,
        firstName,
        lastName,
        email: row.email ?? '',
        phone: row.phone ?? '',
        address: row.address ?? '',
        company: row.company ?? '',
        airSkyboxAddress: row.airSkyboxAddress ?? '',
        seaSkyboxAddress: row.seaSkyboxAddress ?? '',
      };

      setRecord(loaded);
      form.reset({
        firstName: loaded.firstName,
        lastName: loaded.lastName,
        phone: loaded.phone,
        address: loaded.address,
        company: loaded.company,
      });
    } catch (error) {
      console.error('[CustomerInfo] fetch error:', error);
      toast.error('Failed to load customer information');
    } finally {
      setLoading(false);
    }
  };

  const onSave = async (data: ProfileFormData) => {
    if (!record.id) {
      toast.error('No customer record found');
      return;
    }

    try {
      setSaving(true);

      const combinedName = [data.firstName.trim(), data.lastName.trim()]
        .filter(Boolean)
        .join(' ');
      const phone = data.phone ? normalisePhone(data.phone) : undefined;

      const { errors } = await client.models.Customer.update({
        id: record.id,
        name: combinedName,
        phone,
        address: data.address || undefined,
        company: data.company || undefined,
      });

      if (errors?.length) {
        console.error('[CustomerInfo] update errors:', errors);
        toast.error('Failed to save customer information');
        return;
      }

      setRecord({
        ...record,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: phone ?? '',
        address: data.address,
        company: data.company ?? '',
      });
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
    form.reset({
      firstName: record.firstName,
      lastName: record.lastName,
      phone: record.phone,
      address: record.address,
      company: record.company,
    });
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
        <form onSubmit={form.handleSubmit(onSave)} className="space-y-6" noValidate>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Personal Details</h2>
                <p className="text-sm text-gray-500">
                  {editing ? 'Editing — click Save when done' : 'Your account information'}
                </p>
              </div>
            </div>
            {!editing && (
              <Button
                type="button"
                onClick={() => setEditing(true)}
                variant="secondary"
                icon={Pencil}
              >
                Edit
              </Button>
            )}
          </div>

          {editing ? (
            // ── Edit mode ─────────────────────────────────────────────────
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    First Name *
                  </div>
                </label>
                <Input
                  placeholder="Enter your first name"
                  autoComplete="given-name"
                  error={form.formState.errors.firstName?.message}
                  {...form.register('firstName')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Last Name *
                  </div>
                </label>
                <Input
                  placeholder="Enter your last name"
                  autoComplete="family-name"
                  error={form.formState.errors.lastName?.message}
                  {...form.register('lastName')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </div>
                </label>
                <Input type="email" value={record.email} disabled />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed — contact support.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number *
                  </div>
                </label>
                <Input
                  type="tel"
                  placeholder="+1 (246) 555-0100"
                  autoComplete="tel"
                  error={form.formState.errors.phone?.message}
                  {...form.register('phone')}
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
                  placeholder="Optional"
                  autoComplete="organization"
                  error={form.formState.errors.company?.message}
                  {...form.register('company')}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Address *
                  </div>
                </label>
                <Input
                  placeholder="Street, City, Parish, Barbados"
                  autoComplete="street-address"
                  error={form.formState.errors.address?.message}
                  {...form.register('address')}
                />
              </div>
            </div>
          ) : (
            // ── Read mode ─────────────────────────────────────────────────
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ReadField icon={<User className="w-4 h-4" />} label="First Name" value={record.firstName} />
              <ReadField icon={<User className="w-4 h-4" />} label="Last Name"  value={record.lastName} />
              <ReadField icon={<Mail className="w-4 h-4" />} label="Email Address" value={record.email} />
              <ReadField icon={<Phone className="w-4 h-4" />} label="Phone Number" value={record.phone} />
              <ReadField icon={<Building className="w-4 h-4" />} label="Company" value={record.company ?? ''} />
              <ReadField
                icon={<MapPin className="w-4 h-4" />}
                label="Address"
                value={record.address}
                className="md:col-span-2"
              />
            </div>
          )}

          {editing && (
            <div className="flex gap-3 pt-4 border-t">
              <Button type="submit" loading={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button type="button" onClick={handleCancel} variant="secondary" disabled={saving}>
                Cancel
              </Button>
            </div>
          )}
        </form>
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
                address={record.airSkyboxAddress}
                sub="Faster delivery · typically 3–5 days"
              />
              <AddressBlock
                icon={<Ship className="w-5 h-5 text-teal-600" />}
                title="🚢 Sea Freight"
                address={record.seaSkyboxAddress}
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
