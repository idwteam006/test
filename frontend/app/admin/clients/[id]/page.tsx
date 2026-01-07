'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  User,
  Calendar,
  DollarSign,
  FileText,
  Edit,
  ArrowLeft,
  Briefcase,
  Clock,
  TrendingUp,
  Globe,
  CreditCard,
  FolderKanban,
  Users,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  XCircle,
  PlayCircle,
  PauseCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface Client {
  id: string;
  clientId: string;
  companyName: string;
  industry: string;
  companySize?: string;
  website?: string;
  taxId?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'VIP';
  clientType: 'COMPANY' | 'INDIVIDUAL' | 'GOVERNMENT' | 'NON_PROFIT';
  contactName: string;
  contactDesignation?: string;
  contactEmail: string;
  contactPhone: string;
  portalAccess: boolean;
  secondaryContactName?: string;
  secondaryContactDesignation?: string;
  secondaryContactEmail?: string;
  secondaryContactPhone?: string;
  secondaryPortalAccess: boolean;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  billingEmail?: string;
  paymentTerms: string;
  currency: string;
  contractStartDate?: string;
  contractEndDate?: string;
  contractValue?: number;
  tags: string[];
  internalNotes?: string;
  accountManager?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  creator?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  projects: Array<{
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate?: string;
    budgetCost?: number;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    total: number;
    status: string;
    dueDate: string;
    createdAt: string;
  }>;
  projectsByStatus?: {
    ACTIVE: number;
    COMPLETED: number;
    PLANNING: number;
    ON_HOLD: number;
    CANCELLED: number;
  };
  financialSummary?: {
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    pendingInvoices: number;
    overdueInvoices: number;
    currency: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function ClientDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clients/${clientId}`);
      const data = await response.json();

      if (data.success) {
        setClient(data.client);
      } else {
        toast.error('Failed to load client');
        router.push('/admin/clients');
      }
    } catch (error) {
      console.error('Error fetching client:', error);
      toast.error('Failed to load client');
      router.push('/admin/clients');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      ACTIVE: 'bg-green-100 text-green-700 border-green-300',
      INACTIVE: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      SUSPENDED: 'bg-red-100 text-red-700 border-red-300',
    };
    return variants[status as keyof typeof variants] || variants.INACTIVE;
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      VIP: 'bg-purple-100 text-purple-700 border-purple-300',
      HIGH: 'bg-red-100 text-red-700 border-red-300',
      MEDIUM: 'bg-blue-100 text-blue-700 border-blue-300',
      LOW: 'bg-gray-100 text-gray-700 border-gray-300',
    };
    return variants[priority as keyof typeof variants] || variants.MEDIUM;
  };

  const formatCurrency = (value: number, currency: string = client?.currency || 'INR') => {
    const symbols: Record<string, string> = {
      INR: '₹',
      USD: '$',
      EUR: '€',
      GBP: '£',
    };
    const symbol = symbols[currency] || currency;

    // For INR, use Lakhs and Crores
    if (currency === 'INR') {
      if (value >= 10000000) return `${symbol}${(value / 10000000).toFixed(1)}Cr`;
      if (value >= 100000) return `${symbol}${(value / 100000).toFixed(1)}L`;
      return `${symbol}${(value / 1000).toFixed(0)}K`;
    }

    // For other currencies, use standard format
    if (value >= 1000000) return `${symbol}${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${symbol}${(value / 1000).toFixed(0)}K`;
    return `${symbol}${value.toFixed(0)}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  // Use API-provided data if available, fallback to client-side calculation
  const activeProjects = client.projectsByStatus?.ACTIVE ?? client.projects.filter((p) => p.status === 'ACTIVE').length;
  const totalInvoiceAmount = client.financialSummary?.totalInvoiced ?? client.invoices.reduce((sum, inv) => sum + inv.total, 0);
  const pendingInvoices = client.financialSummary?.pendingInvoices ?? client.invoices.filter((inv) => inv.status === 'PENDING').length;
  const totalPaid = client.financialSummary?.totalPaid ?? 0;
  const totalOutstanding = client.financialSummary?.totalOutstanding ?? 0;
  const overdueInvoices = client.financialSummary?.overdueInvoices ?? 0;

  return (
    <div className="p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/admin/clients')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900">{client.companyName}</h1>
                <Badge className={`${getStatusBadge(client.status)} border`}>
                  {client.status}
                </Badge>
                <Badge className={`${getPriorityBadge(client.priority)} border`}>
                  {client.priority}
                </Badge>
              </div>
              <p className="text-slate-600 mt-1">
                {client.clientId} • {client.industry} • {client.clientType}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <MessageSquare className="w-4 h-4 mr-2" />
              Message
            </Button>
            <Button variant="outline">
              <FolderKanban className="w-4 h-4 mr-2" />
              Projects
            </Button>
            <Button
              onClick={() => router.push(`/admin/clients/${client.clientId}/edit`)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Client
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Active Projects</p>
                  <p className="text-2xl font-bold text-blue-900">{activeProjects}</p>
                </div>
                <Briefcase className="w-8 h-8 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Contract Value</p>
                  <p className="text-2xl font-bold text-green-900">
                    {client.contractValue ? formatCurrency(client.contractValue, client.currency) : `${client.currency === 'USD' ? '$' : client.currency === 'EUR' ? '€' : client.currency === 'GBP' ? '£' : '₹'}0`}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 font-medium">Total Invoices</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatCurrency(totalInvoiceAmount, client.currency)}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-purple-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-600 font-medium">Pending Invoices</p>
                  <p className="text-2xl font-bold text-orange-900">{pendingInvoices}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Status Breakdown & Financial Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Project Status Breakdown */}
          {client.projectsByStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderKanban className="w-5 h-5" />
                  Project Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <PlayCircle className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-900">Active</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">
                      {client.projectsByStatus.ACTIVE}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-900">Completed</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      {client.projectsByStatus.COMPLETED}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="p-2 bg-slate-50 rounded border border-slate-200 text-center">
                      <p className="text-slate-600">Planning</p>
                      <p className="text-lg font-bold text-slate-900">{client.projectsByStatus.PLANNING}</p>
                    </div>
                    <div className="p-2 bg-orange-50 rounded border border-orange-200 text-center">
                      <p className="text-orange-600">On Hold</p>
                      <p className="text-lg font-bold text-orange-900">{client.projectsByStatus.ON_HOLD}</p>
                    </div>
                    <div className="p-2 bg-red-50 rounded border border-red-200 text-center">
                      <p className="text-red-600">Cancelled</p>
                      <p className="text-lg font-bold text-red-900">{client.projectsByStatus.CANCELLED}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 font-medium">Total Projects</span>
                      <span className="text-lg font-bold text-slate-900">
                        {client.projectsByStatus.ACTIVE +
                         client.projectsByStatus.COMPLETED +
                         client.projectsByStatus.PLANNING +
                         client.projectsByStatus.ON_HOLD +
                         client.projectsByStatus.CANCELLED}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Financial Dashboard */}
          {client.financialSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-600 font-medium mb-1">Total Invoiced</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatCurrency(client.financialSummary.totalInvoiced, client.financialSummary.currency)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-green-600 font-medium mb-1">Total Paid</p>
                      <p className="text-lg font-bold text-green-900">
                        {formatCurrency(client.financialSummary.totalPaid, client.financialSummary.currency)}
                      </p>
                      {client.financialSummary.totalInvoiced > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          {Math.round((client.financialSummary.totalPaid / client.financialSummary.totalInvoiced) * 100)}%
                        </p>
                      )}
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-xs text-orange-600 font-medium mb-1">Outstanding</p>
                      <p className="text-lg font-bold text-orange-900">
                        {formatCurrency(client.financialSummary.totalOutstanding, client.financialSummary.currency)}
                      </p>
                      {client.financialSummary.totalInvoiced > 0 && (
                        <p className="text-xs text-orange-600 mt-1">
                          {Math.round((client.financialSummary.totalOutstanding / client.financialSummary.totalInvoiced) * 100)}%
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-yellow-50 rounded border border-yellow-200 text-center">
                      <p className="text-yellow-600">Pending</p>
                      <p className="text-lg font-bold text-yellow-900">{client.financialSummary.pendingInvoices}</p>
                    </div>
                    <div className="p-2 bg-red-50 rounded border border-red-200 text-center">
                      <p className="text-red-600">Overdue</p>
                      <p className="text-lg font-bold text-red-900">{client.financialSummary.overdueInvoices}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Company Name</p>
                    <p className="font-medium">{client.companyName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Industry</p>
                    <p className="font-medium">{client.industry || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Company Size</p>
                    <p className="font-medium">{client.companySize || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Tax ID</p>
                    <p className="font-medium">{client.taxId || 'N/A'}</p>
                  </div>
                  {client.website && (
                    <div className="col-span-2">
                      <p className="text-sm text-slate-500">Website</p>
                      <a
                        href={client.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-purple-600 hover:underline flex items-center gap-1"
                      >
                        <Globe className="w-4 h-4" />
                        {client.website}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Primary Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Primary Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {client.contactName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{client.contactName}</p>
                    {client.contactDesignation && (
                      <p className="text-sm text-slate-600">{client.contactDesignation}</p>
                    )}
                  </div>
                  {client.portalAccess && (
                    <Badge className="bg-green-100 text-green-700">Portal Access</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <a href={`mailto:${client.contactEmail}`} className="text-purple-600 hover:underline">
                      {client.contactEmail}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <a href={`tel:${client.contactPhone}`} className="text-purple-600 hover:underline">
                      {client.contactPhone}
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Secondary Contact */}
            {client.secondaryContactName && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Secondary Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {client.secondaryContactName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{client.secondaryContactName}</p>
                      {client.secondaryContactDesignation && (
                        <p className="text-sm text-slate-600">{client.secondaryContactDesignation}</p>
                      )}
                    </div>
                    {client.secondaryPortalAccess && (
                      <Badge className="bg-green-100 text-green-700">Portal Access</Badge>
                    )}
                  </div>
                  {client.secondaryContactEmail && (
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <a href={`mailto:${client.secondaryContactEmail}`} className="text-purple-600 hover:underline">
                          {client.secondaryContactEmail}
                        </a>
                      </div>
                      {client.secondaryContactPhone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <a href={`tel:${client.secondaryContactPhone}`} className="text-purple-600 hover:underline">
                            {client.secondaryContactPhone}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Address & Billing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Address & Billing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.addressLine1 && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Office Address</p>
                    <p className="font-medium">
                      {client.addressLine1}
                      {client.addressLine2 && <>, {client.addressLine2}</>}
                    </p>
                    <p className="font-medium">
                      {client.city && `${client.city}, `}
                      {client.state && `${client.state} `}
                      {client.postalCode}
                    </p>
                    {client.country && <p className="font-medium">{client.country}</p>}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-slate-500">Payment Terms</p>
                    <p className="font-medium">{client.paymentTerms}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Currency</p>
                    <p className="font-medium">{client.currency}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Billing Email</p>
                    <p className="font-medium text-sm">{client.billingEmail || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Projects */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-5 h-5" />
                    Projects ({client.projects.length})
                  </div>
                  {client.projects.length > 0 && (
                    <Button size="sm" variant="outline">
                      View All
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {client.projects.length > 0 ? (
                  <div className="space-y-3">
                    {client.projects.slice(0, 5).map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-slate-600">
                            {formatDate(project.startDate)}
                            {project.endDate && ` - ${formatDate(project.endDate)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {project.budgetCost && (
                            <p className="text-sm font-medium">{formatCurrency(project.budgetCost)}</p>
                          )}
                          <Badge
                            className={
                              project.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-700'
                            }
                          >
                            {project.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium mb-1">No projects yet</p>
                    <p className="text-sm text-slate-500 mb-4">
                      Start by creating a new project for this client
                    </p>
                    <Button variant="outline" size="sm">
                      Create Project
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Invoices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Recent Invoices ({client.invoices.length})
                  </div>
                  {client.invoices.length > 0 && (
                    <Button size="sm" variant="outline">
                      View All
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {client.invoices.length > 0 ? (
                  <div className="space-y-3">
                    {client.invoices.slice(0, 5).map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-slate-600">Due: {formatDate(invoice.dueDate)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-medium">{formatCurrency(invoice.total)}</p>
                          <Badge
                            className={
                              invoice.status === 'PAID'
                                ? 'bg-green-100 text-green-700'
                                : invoice.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }
                          >
                            {invoice.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium mb-1">No invoices yet</p>
                    <p className="text-sm text-slate-500 mb-4">
                      Generate your first invoice for this client
                    </p>
                    <Button variant="outline" size="sm">
                      Create Invoice
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Account Manager */}
            {client.accountManager && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Account Manager</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {client.accountManager.firstName.charAt(0)}
                        {client.accountManager.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">
                          {client.accountManager.firstName} {client.accountManager.lastName}
                        </p>
                        <p className="text-xs text-slate-600">{client.accountManager.email}</p>
                      </div>
                    </div>
                    {client.accountManager.phone && (
                      <div className="flex items-center gap-2 text-sm pt-2 border-t">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <a
                          href={`tel:${client.accountManager.phone}`}
                          className="text-purple-600 hover:underline"
                        >
                          {client.accountManager.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contract Details */}
            {(client.contractStartDate || client.contractValue) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Contract Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {client.contractValue && (
                    <div>
                      <p className="text-sm text-slate-500">Contract Value</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(client.contractValue, client.currency)}
                      </p>
                    </div>
                  )}
                  {client.contractStartDate && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-slate-500">Start Date</p>
                        <p className="font-medium">{formatDate(client.contractStartDate)}</p>
                      </div>
                      {client.contractEndDate && (
                        <div>
                          <p className="text-sm text-slate-500">End Date</p>
                          <p className="font-medium">{formatDate(client.contractEndDate)}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {client.tags && client.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {client.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="bg-slate-50">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Internal Notes */}
            {client.internalNotes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Internal Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{client.internalNotes}</p>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-slate-500">Created</p>
                  <p className="font-medium">{formatDate(client.createdAt)}</p>
                  {client.creator && (
                    <p className="text-xs text-slate-600">
                      by {client.creator.firstName} {client.creator.lastName}
                    </p>
                  )}
                </div>
                <div className="pt-3 border-t">
                  <p className="text-slate-500">Last Updated</p>
                  <p className="font-medium">{formatDate(client.updatedAt)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
