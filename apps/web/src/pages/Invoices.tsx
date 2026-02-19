import { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { getCurrentUser } from '../auth';
import toast from 'react-hot-toast';
import { FileText, Download, Calendar, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  shipment_id: string;
  shipment_tracking: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  issue_date: string;
  due_date: string;
  paid_date?: string;
}

export const Invoices = () => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (!user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }
      fetchInvoices();
    };
    checkAuth();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Phase 3 - Fetch invoices from AWS RDS via API Gateway
      console.log('Invoices: Database not yet migrated. Using demo mode.');
      
      // Mock data for now
      setInvoices([]);
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleDownload = (_invoiceId: string, invoiceNumber: string) => {
    toast.success(`Downloading invoice ${invoiceNumber}...`);
  };

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

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidAmount = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);
  const pendingAmount = invoices
    .filter((inv) => inv.status === 'pending')
    .reduce((sum, inv) => sum + inv.amount, 0);

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
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {invoice.invoice_number}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-600">{invoice.shipment_tracking}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(invoice.amount)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {formatDate(invoice.issue_date)}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {formatDate(invoice.due_date)}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant={getStatusColor(invoice.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(invoice.status)}
                        <span className="capitalize">{invoice.status}</span>
                      </div>
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownload(invoice.id, invoice.invoice_number)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
