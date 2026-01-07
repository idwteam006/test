'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Plus,
  Search,
  Filter,
  TrendingUp,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  DollarSign,
  ArrowRight,
  Building2,
  ArrowUpDown,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Project {
  id: string;
  projectCode?: string | null;
  name: string;
  description?: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  budgetHours?: number | null;
  budgetCost?: number | null;
  currency?: string | null;
  createdAt: string;
  client: {
    id: string;
    clientId: string;
    companyName: string;
  };
  assignments: Array<{
    role: string | null;
    employee: {
      user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
    };
  }>;
  _count?: {
    tasks: number;
    timeEntries: number;
  };
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'budget' | 'status'>('date');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const response = await fetch('/api/projects/list');
      const data = await response.json();

      if (data.success) {
        console.log('Projects loaded:', data.projects?.length || 0);
        setProjects(data.projects || []);
      } else {
        console.error('Failed to fetch projects:', data.error);
        setFetchError(data.error || 'Failed to load projects');
        toast.error('Failed to load projects');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setFetchError('Network error. Please check your connection and try again.');
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  // Get unique clients for filter dropdown
  const uniqueClients = Array.from(
    new Map(projects.map(p => [p.client.id, p.client])).values()
  ).sort((a, b) => a.companyName.localeCompare(b.companyName));

  // Filter and sort projects
  const filteredProjects = projects
    .filter((project) => {
      const matchesSearch =
        searchQuery === '' ||
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.client.companyName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      const matchesClient = clientFilter === 'all' || project.client.id === clientFilter;
      return matchesSearch && matchesStatus && matchesClient;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'budget':
          return (b.budgetCost || 0) - (a.budgetCost || 0);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

  // Calculate stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length;
  const completedProjects = projects.filter((p) => p.status === 'COMPLETED').length;
  const planningProjects = projects.filter((p) => p.status === 'PLANNING').length;
  const onHoldProjects = projects.filter((p) => p.status === 'ON_HOLD').length;

  // Calculate at-risk projects: past due date and not completed, or on hold
  const today = new Date();
  const atRiskProjects = projects.filter((p) => {
    // Completed or cancelled projects are not at risk
    if (['COMPLETED', 'CANCELLED'].includes(p.status)) return false;
    // On hold projects are at risk
    if (p.status === 'ON_HOLD') return true;
    // Projects past due date are at risk
    if (p.endDate) {
      const endDate = new Date(p.endDate);
      if (today > endDate) return true;
    }
    return false;
  }).length;

  // On track = active projects that are not at risk
  const onTrackProjects = projects.filter((p) => {
    if (p.status !== 'ACTIVE') return false;
    if (p.endDate) {
      const endDate = new Date(p.endDate);
      if (today > endDate) return false;
    }
    return true;
  }).length;

  const totalBudget = projects.reduce((sum, p) => sum + (p.budgetCost || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'ON_HOLD':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600';
    if (progress >= 50) return 'text-blue-600';
    if (progress >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  return (
    <div className="p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
            <p className="text-slate-600 mt-1">Manage and track your projects</p>
          </div>
          <Button
            onClick={() => router.push('/admin/projects/new')}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        </div>

        {/* Error Banner */}
        {fetchError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-800">Error loading projects</p>
                    <p className="text-sm text-red-600">{fetchError}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchProjects}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Projects</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{totalProjects}</p>
                  <p className="text-xs text-slate-500 mt-1">{activeProjects} active</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">On Track</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">{onTrackProjects}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {totalProjects > 0 ? Math.round((onTrackProjects / totalProjects) * 100) : 0}% of total
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">At Risk</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-2">{atRiskProjects}</p>
                  <p className="text-xs text-slate-500 mt-1">Need attention</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Budget</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">
                    {formatCurrency(totalBudget)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{completedProjects} completed</p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by project name, ID, or client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PLANNING">Planning</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {uniqueClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date (Newest)</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="budget">Budget (High-Low)</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Projects List */}
        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                {projects.length === 0 ? 'No projects yet' : 'No projects match your filters'}
              </h3>
              <p className="text-slate-500 mb-6">
                {projects.length === 0 ? (
                  'Get started by creating your first project'
                ) : (
                  <>
                    {searchQuery && `No results for "${searchQuery}". `}
                    {statusFilter !== 'all' && `No ${statusFilter.toLowerCase()} projects found. `}
                    {clientFilter !== 'all' && `No projects for selected client. `}
                    <br />
                    <span className="text-sm">Try adjusting your search or filters, or create a new project.</span>
                  </>
                )}
              </p>
              <div className="flex gap-3 justify-center">
                {(searchQuery || statusFilter !== 'all' || clientFilter !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setClientFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
                <Button
                  onClick={() => router.push('/admin/projects/new')}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Project Info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-lg font-semibold text-slate-900">
                                {project.name}
                              </h3>
                              <Badge variant="outline" className={getStatusColor(project.status)}>
                                {project.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-500">
                              {project.client.clientId} • {project.client.companyName}
                            </p>
                          </div>
                        </div>

                        {/* Description */}
                        {project.description && (
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {project.description}
                          </p>
                        )}

                        {/* Project Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-slate-500 text-xs">Start Date</p>
                              <p className="font-medium text-slate-900">
                                {formatDate(project.startDate)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-slate-500 text-xs">End Date</p>
                              <p className="font-medium text-slate-900">
                                {project.endDate ? formatDate(project.endDate) : 'Not set'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-slate-500 text-xs">Budget</p>
                              <p className="font-medium text-slate-900">
                                {project.budgetCost ? formatCurrency(project.budgetCost, project.currency || 'USD') : 'Not set'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-slate-500 text-xs">Budget Hours</p>
                              <p className="font-medium text-slate-900">
                                {project.budgetHours ? `${project.budgetHours}h` : 'Not set'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-slate-500 text-xs">Team</p>
                              <p className="font-medium text-slate-900">
                                {project.assignments?.length || 0} member{project.assignments?.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-slate-500 text-xs">Tasks</p>
                              <p className="font-medium text-slate-900">
                                {project._count?.tasks || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/projects/${project.projectCode || project.id}`)}
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      >
                        View Details
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
