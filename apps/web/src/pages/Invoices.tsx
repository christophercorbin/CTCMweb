import { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import toast from 'react-hot-toast';
import { FileText, Download, Calendar, DollarSign, CheckCircle, Clock, XCircle, Search } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import { getUrl } from 'aws-amplify/storage';
import type { Schema } from '../../../../amplify/data/resource';

const client = generateClient<Schema>();
type AppSyncInvoice = Schema['Invoice']['type'];

const normalizeStatus = (s: string | null | undefined): 'paid' | 'pending' | 'overdue' => {
  if (s === 'PAID') return 'paid';
  if (s === 'OVERDUE') return 'overdue';
  return 'pending'; // SENT, DRAFT, CANCELLED → pending badge
};

export const Invoices = () => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<AppSyncInvoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, errors } = await client.models.Invoice.list();
      if (errors?.length) throw new Error(errors[0].message);
      const sorted = [...(data ?? [])].sort(
        (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      );
      setInvoices(sorted);
    } catch (error) {
      console.error('Unexpected error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'overdue':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount ?? 0);
  };

  const handleDownload = async (invoiceId: string, invoiceNumber: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv?.s3Key) {
      toast.error('No PDF available for this invoice');
      return;
    }
    try {
      const { url } = await getUrl({ path: inv.s3Key, options: { expiresIn: 300 } });
      window.open(url.toString(), '_blank');
    } catch {
      toast.error(`Failed to download ${invoiceNumber}`);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return invoices.filter(inv => {
      const matchStatus =
        statusFilter === 'all' ||
        normalizeStatus(inv.status) === statusFilter;
      const matchSearch =
        !q ||
        inv.invoiceNumber?.toLowerCase().includes(q) ||
        inv.trackingNumber?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [invoices, search, statusFilter]);

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount ?? 0), 0);
  const paidAmount = invoices
    .filter(inv => inv.status === 'PAID')
    .reduce((sum, inv) => sum + (inv.totalAmount ?? 0), 0);
  const pendingAmount = invoices
    .filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
    .reduce((sum, inv) => sum + (inv.totalAmount ?? 0), 0);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">View and manage your shipping invoices</p>
        </div>
        <LoadingSkeleton count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">View and manage your shipping invoices</p>
        </div>
        <Card>
          <div className="text-center py-12">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Invoices</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchInvoices}>Try Again</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">View and manage your shipping invoices</p>
        </div>
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="No invoices yet"
          message="Your invoices will appear here once shipments are created"
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="text-gray-600 mt-1">View and manage your shipping invoices</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(paidAmount)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(pendingAmount)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoice # or tracking #…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm font-medium">
            {(['all', 'pending', 'paid', 'overdue'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex-1 px-3 py-2 transition-colors whitespace-nowrap ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Invoice #
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Tracking #
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Amount
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Issue Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Due Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-gray-400">
                    No invoices match your filters
                  </td>
                </tr>
              ) : filtered.map((invoice) => {
                const uiStatus = normalizeStatus(invoice.status);
                return (
                  <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{invoice.trackingNumber ?? '—'}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(invoice.totalAmount)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {formatDate(invoice.createdAt)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {formatDate(invoice.dueDate)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={getStatusColor(uiStatus)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(uiStatus)}
                          <span className="capitalize">{uiStatus}</span>
                        </div>
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownload(invoice.id, invoice.invoiceNumber)}
                        disabled={!invoice.s3Key}
                        title={invoice.s3Key ? 'Download PDF' : 'No PDF available'}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
