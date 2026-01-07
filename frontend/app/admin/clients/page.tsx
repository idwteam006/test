'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  UserPlus,
  Building2,
  Search,
  Download,
  Upload,
  BarChart3,
  Eye,
  Edit,
  FolderKanban,
  MessageSquare,
  Filter,
  TrendingUp,
  Users,
  DollarSign,
  Briefcase,
  Calendar,
  UserCheck,
  MapPin,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { formatCurrency, formatCurrencySmart } from '@/lib/currency-utils';

interface Client {
  id: string;
  clientId: string;
  companyName: string;
  industry: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'VIP';
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
  city?: string;
  state?: string;
  country?: string;
  accountManager?: {
    firstName: string;
    lastName: string;
  };
  creator?: {
    firstName: string;
    lastName: string;
  };
  contractValue?: number;
  createdAt: string;
  projectsByStatus?: {
    ACTIVE: number;
    COMPLETED: number;
    PLANNING: number;
    ON_HOLD: number;
    CANCELLED: number;
  };
  _count?: {
    projects: number;
  };
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clients/list');
      const data = await response.json();

      if (data.success) {
        setClients(data.clients || []);
      } else {
        toast.error('Failed to load clients');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort clients
  const filteredClients = clients
    .filter((client) => {
      const matchesSearch =
        searchQuery === '' ||
        client.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.contactName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      const matchesIndustry = industryFilter === 'all' || client.industry === industryFilter;
      return matchesSearch && matchesStatus && matchesIndustry;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.companyName.localeCompare(b.companyName);
      if (sortBy === 'value') return (b.contractValue || 0) - (a.contractValue || 0);
      return 0; // recent - keep original order
    });

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === 'ACTIVE').length;
  const inactiveClients = clients.filter((c) => c.status === 'INACTIVE').length;
  const totalProjects = clients.reduce((sum, c) => sum + (c._count?.projects || 0), 0);

  // Detect the primary currency (most common one)
  const currencyCounts: Record<string, number> = {};
  clients.forEach((c) => {
    currencyCounts[c.currency] = (currencyCounts[c.currency] || 0) + 1;
  });
  const primaryCurrency = Object.keys(currencyCounts).reduce(
    (a, b) => (currencyCounts[a] > currencyCounts[b] ? a : b),
    'INR'
  );
  const hasMixedCurrencies = Object.keys(currencyCounts).length > 1;

  const totalValue = clients.reduce((sum, c) => sum + (c.contractValue || 0), 0);

  const getStatusColor = (status: string) => {
    if (status === 'ACTIVE') return 'text-green-600 bg-green-100';
    if (status === 'INACTIVE') return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'ACTIVE') return '🟢';
    if (status === 'INACTIVE') return '🟡';
    return '🔴';
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      VIP: 'bg-purple-100 text-purple-700 border-purple-300',
      HIGH: 'bg-red-100 text-red-700 border-red-300',
      MEDIUM: 'bg-blue-100 text-blue-700 border-blue-300',
      LOW: 'bg-gray-100 text-gray-700 border-gray-300',
    };
    return colors[priority as keyof typeof colors] || colors.MEDIUM;
  };

  // Use centralized currency formatting
  const formatClientCurrency = (value: number, currency: string = 'USD') => {
    return formatCurrencySmart(value, currency);
  };

  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format location
  const formatLocation = (client: Client) => {
    const parts = [client.city, client.state, client.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Not specified';
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

  if (clients.length === 0) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Clients</h1>
              <p className="text-slate-600 mt-1">Manage your clients and relationships</p>
            </div>
            <Button
              onClick={() => router.push('/admin/clients/new')}
              className="bg-gradient-to-r from-purple-600 to-indigo-600"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </div>

          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <Building2 className="w-20 h-20 mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No clients yet</h3>
              <p className="text-slate-500 mb-6">Get started by adding your first client</p>
              <Button
                onClick={() => router.push('/admin/clients/new')}
                className="bg-gradient-to-r from-purple-600 to-indigo-600"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Your First Client
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Clients Dashboard</h1>
            <p className="text-slate-600 mt-1">Manage your clients and relationships</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <Button
              onClick={() => router.push('/admin/clients/new')}
              className="bg-gradient-to-r from-purple-600 to-indigo-600"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 font-medium">Total Clients</p>
                  <p className="text-2xl font-bold text-purple-900">{totalClients}</p>
                </div>
                <Users className="w-8 h-8 text-purple-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Active</p>
                  <p className="text-2xl font-bold text-green-900">{activeClients}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-600 font-medium">Inactive</p>
                  <p className="text-2xl font-bold text-yellow-900">{inactiveClients}</p>
                </div>
                <Users className="w-8 h-8 text-yellow-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Active Projects</p>
                  <p className="text-2xl font-bold text-blue-900">{totalProjects}</p>
                </div>
                <Briefcase className="w-8 h-8 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-indigo-600 font-medium">Total Value</p>
                  <p className="text-2xl font-bold text-indigo-900">
                    {hasMixedCurrencies ? '~' : ''}{formatCurrency(totalValue, primaryCurrency)}
                    {hasMixedCurrencies && <span className="text-xs text-indigo-600 ml-1">*</span>}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-indigo-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search clients or contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>

              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="Fintech">Fintech</SelectItem>
                  <SelectItem value="E-commerce">E-commerce</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recently Added</SelectItem>
                  <SelectItem value="name">Company Name</SelectItem>
                  <SelectItem value="value">Contract Value</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Client List */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {paginatedClients.map((client, index) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg">{getStatusIcon(client.status)}</span>
                        <div>
                          <h3 className="font-semibold text-lg text-slate-900">
                            {client.companyName}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span>{client.industry || 'N/A'}</span>
                            <span>•</span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityBadge(
                                client.priority
                              )}`}
                            >
                              {client.priority}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* First Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Contact</p>
                            <p className="font-medium text-slate-900">{client.contactName}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Value</p>
                            <p className="font-medium text-slate-900">
                              {client.contractValue ? formatClientCurrency(client.contractValue, client.currency) : formatCurrency(0, client.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Manager</p>
                            <p className="font-medium text-slate-900">
                              {client.accountManager
                                ? `${client.accountManager.firstName} ${client.accountManager.lastName}`
                                : 'Unassigned'}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Added Date
                            </p>
                            <p className="font-medium text-slate-900">
                              {formatDate(client.createdAt)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500 flex items-center gap-1">
                              <UserCheck className="w-3 h-3" />
                              Client From
                            </p>
                            <p className="font-medium text-slate-900">
                              {client.creator
                                ? `${client.creator.firstName} ${client.creator.lastName}`
                                : 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              Location
                            </p>
                            <p className="font-medium text-slate-900 text-xs">
                              {formatLocation(client)}
                            </p>
                          </div>
                        </div>

                        {/* Second Row - Project Status */}
                        {client.projectsByStatus && (
                          <div className="flex items-center gap-4 text-xs pt-2 border-t">
                            <span className="text-slate-500 font-medium">Projects:</span>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-blue-600" />
                              <span className="text-blue-600 font-medium">{client.projectsByStatus.ACTIVE} Active</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                              <span className="text-green-600 font-medium">{client.projectsByStatus.COMPLETED} Completed</span>
                            </div>
                            {client.projectsByStatus.PLANNING > 0 && (
                              <span className="text-slate-600">{client.projectsByStatus.PLANNING} Planning</span>
                            )}
                            {client.projectsByStatus.ON_HOLD > 0 && (
                              <span className="text-orange-600">{client.projectsByStatus.ON_HOLD} On Hold</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/admin/clients/${client.clientId}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/admin/clients/${client.clientId}/edit`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <FolderKanban className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredClients.length)} of{' '}
                  {filteredClients.length} clients
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    ← Previous
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      size="sm"
                      variant={currentPage === page ? 'default' : 'outline'}
                      onClick={() => setCurrentPage(page)}
                      className={
                        currentPage === page
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
                          : ''
                      }
                    >
                      {page}
                    </Button>
                  ))}
                  {totalPages > 5 && <span className="px-2">...</span>}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
