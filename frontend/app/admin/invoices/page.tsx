'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Download,
  Send,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Eye,
  Trash2,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  paidAt?: string;
  client: {
    id: string;
    companyName: string;
    contactName: string;
    contactEmail: string;
    addressLine1?: string;
    city?: string;
    country?: string;
  };
  lineItems: Array<{
    id: string;
    description: string;
    hours?: number;
    rate: number;
    amount: number;
  }>;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all'
        ? '/api/admin/invoices'
        : `/api/admin/invoices?status=${statusFilter}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    setSendingId(invoiceId);
    const loadingToast = toast.loading('Sending invoice...', {
      description: 'Please wait',
    });

    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}/send`, {
        method: 'POST',
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success('Invoice sent to client!', {
          description: 'Client will receive the invoice via email',
        });
        fetchInvoices();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to send invoice:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to send invoice');
    } finally {
      setSendingId(null);
    }
  };

  const handleResendInvoice = async (invoiceId: string) => {
    setSendingId(invoiceId);
    const loadingToast = toast.loading('Resending invoice...', {
      description: 'Please wait',
    });

    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resend: true }),
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success('Invoice resent successfully!', {
          description: data.message,
        });
        fetchInvoices();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to resend invoice:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to resend invoice');
    } finally {
      setSendingId(null);
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    if (!confirm('Mark this invoice as paid?')) return;

    setMarkingPaidId(invoiceId);
    const loadingToast = toast.loading('Updating invoice...', {
      description: 'Please wait',
    });

    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}/pay`, {
        method: 'POST',
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success('Invoice marked as paid!');
        fetchInvoices();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to mark invoice as paid:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to update invoice');
    } finally {
      setMarkingPaidId(null);
    }
  };

  const handleDownloadPDF = async (invoiceId: string, invoiceNumber: string) => {
    const loadingToast = toast.loading('Generating PDF...', {
      description: 'Please wait',
    });

    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}/pdf`);

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.dismiss(loadingToast);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to generate PDF');
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    setDeletingId(invoiceId);
    const loadingToast = toast.loading('Deleting invoice...', {
      description: 'Please wait',
    });

    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success('Invoice deleted');
        fetchInvoices();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to delete invoice:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to delete invoice');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-slate-100 text-slate-800 border-slate-300',
      SENT: 'bg-blue-100 text-blue-800 border-blue-300',
      PAID: 'bg-green-100 text-green-800 border-green-300',
      OVERDUE: 'bg-red-100 text-red-800 border-red-300',
      CANCELLED: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'DRAFT') return <FileText className="h-4 w-4" />;
    if (status === 'SENT') return <Send className="h-4 w-4" />;
    if (status === 'PAID') return <CheckCircle className="h-4 w-4" />;
    if (status === 'OVERDUE') return <Clock className="h-4 w-4" />;
    return null;
  };

  const stats = {
    total: invoices.length,
    draft: invoices.filter((i) => i.status === 'DRAFT').length,
    sent: invoices.filter((i) => i.status === 'SENT').length,
    overdue: invoices.filter((i) => i.status === 'OVERDUE').length,
    paid: invoices.filter((i) => i.status === 'PAID').length,
    totalRevenue: invoices.filter((i) => i.status === 'PAID').reduce((sum, i) => sum + i.total, 0),
    outstanding: invoices.filter((i) => ['SENT', 'OVERDUE'].includes(i.status)).reduce((sum, i) => sum + i.total, 0),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Invoice Management</h1>
          <p className="text-slate-600 mt-1">Create and manage client invoices</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              toast.info('Auto-generate feature', {
                description: 'Generate invoices from approved timesheets',
              });
            }}
          >
            <Clock className="h-4 w-4 mr-2" />
            Auto-Generate
          </Button>
          <Button
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            onClick={() => router.push('/admin/invoices/new')}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-600">{stats.draft}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.sent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.paid}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${stats.totalRevenue.toFixed(0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${stats.outstanding.toFixed(0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-slate-600" />
            <div className="flex-1">
              <Label className="text-sm font-medium">Filter by Status:</Label>
              <select
                className="w-full md:w-64 px-3 py-2 border border-slate-300 rounded-md mt-1"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Invoices ({stats.total})</option>
                <option value="DRAFT">Draft ({stats.draft})</option>
                <option value="SENT">Sent ({stats.sent})</option>
                <option value="PAID">Paid ({stats.paid})</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-slate-600 mt-2">Loading invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center">
                <FileText className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No invoices yet</h3>
              <p className="text-slate-600 mb-6">Create your first invoice or auto-generate from timesheets</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="border border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-lg text-purple-600">{invoice.invoiceNumber}</span>
                        <Badge className={`text-xs font-semibold ${getStatusColor(invoice.status)} border`}>
                          {getStatusIcon(invoice.status)}
                          <span className="ml-1">{invoice.status}</span>
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <div className="text-xs text-slate-600">Client</div>
                          <div className="font-medium text-slate-900">{invoice.client.companyName}</div>
                          <div className="text-sm text-slate-600">{invoice.client.contactName}</div>
                        </div>

                        <div>
                          <div className="text-xs text-slate-600">Issue Date</div>
                          <div className="font-medium text-slate-900">
                            {format(new Date(invoice.issueDate), 'MMM d, yyyy')}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-slate-600">Due Date</div>
                          <div className="font-medium text-slate-900">
                            {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-slate-600">Total Amount</div>
                          <div className="text-xl font-bold text-green-600">${invoice.total.toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500">
                        {invoice.lineItems.length} line {invoice.lineItems.length === 1 ? 'item' : 'items'}
                        {invoice.paidAt && ` • Paid on ${format(new Date(invoice.paidAt), 'MMM d, yyyy')}`}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPDF(invoice.id, invoice.invoiceNumber)}
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>

                      {invoice.status === 'DRAFT' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleSendInvoice(invoice.id)}
                            disabled={sendingId === invoice.id || deletingId === invoice.id}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {sendingId === invoice.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-1" />
                                Send
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            disabled={deletingId === invoice.id || sendingId === invoice.id}
                            className="text-red-600 hover:text-red-700 border-red-300"
                          >
                            {deletingId === invoice.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </>
                      )}

                      {invoice.status === 'SENT' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResendInvoice(invoice.id)}
                            disabled={sendingId === invoice.id || markingPaidId === invoice.id}
                            className="border-blue-300 text-blue-600 hover:bg-blue-50"
                            title="Resend email to client"
                          >
                            {sendingId === invoice.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            disabled={markingPaidId === invoice.id || sendingId === invoice.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {markingPaidId === invoice.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                                Processing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Mark Paid
                              </>
                            )}
                          </Button>
                        </>
                      )}

                      {invoice.status === 'PAID' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResendInvoice(invoice.id)}
                          disabled={sendingId === invoice.id}
                          className="border-blue-300 text-blue-600 hover:bg-blue-50"
                          title="Resend email to client"
                        >
                          {sendingId === invoice.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-1"></div>
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-1" />
                              Resend
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
