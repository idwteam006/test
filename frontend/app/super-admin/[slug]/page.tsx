'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Users,
  Briefcase,
  FileText,
  Clock,
  DollarSign,
  Settings,
  CheckCircle,
  XCircle,
  Calendar,
  Mail,
  Shield,
  Activity,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import EmailDomainManager from '@/components/super-admin/EmailDomainManager';

interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface TenantSettings {
  companyName: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  maxEmployees: number | null;
  maxProjects: number | null;
  workingHours?: any;
  leavePolicies?: any;
}

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  settings: TenantSettings | null;
  users: TenantUser[];
  _count: {
    users: number;
    employees: number;
    clients: number;
    projects: number;
    invoices: number;
    timeEntries: number;
  };
}

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchTenantDetails();
  }, [params.slug]);

  const fetchTenantDetails = async () => {
    try {
      const response = await fetch(`/api/super-admin/tenants/${params.slug}`);
      const data = await response.json();

      if (data.success) {
        setTenant(data.tenant);
      } else {
        toast.error(data.error || 'Failed to load tenant details');
      }
    } catch (error) {
      console.error('Error fetching tenant:', error);
      toast.error('Failed to load tenant details');
    } finally {
      setLoading(false);
    }
  };

  const toggleTenantStatus = async () => {
    if (!tenant) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/super-admin/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !tenant.isActive }),
      });

      const data = await response.json();

      if (data.success) {
        setTenant({ ...tenant, isActive: !tenant.isActive });
        toast.success(
          `Tenant ${!tenant.isActive ? 'activated' : 'deactivated'} successfully`
        );
      } else {
        toast.error(data.error || 'Failed to update tenant status');
      }
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error('Failed to update tenant status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading tenant details...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Tenant Not Found
          </h2>
          <p className="text-slate-600 mb-6">
            The tenant you're looking for doesn't exist.
          </p>
          <button
            onClick={() => router.push('/super-admin')}
            className="px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Users',
      value: tenant._count.users,
      icon: Users,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Employees',
      value: tenant._count.employees,
      icon: Briefcase,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Clients',
      value: tenant._count.clients,
      icon: Building2,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      label: 'Projects',
      value: tenant._count.projects,
      icon: FileText,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
    {
      label: 'Invoices',
      value: tenant._count.invoices,
      icon: DollarSign,
      color: 'pink',
      bgColor: 'bg-pink-50',
      iconColor: 'text-pink-600',
    },
    {
      label: 'Time Entries',
      value: tenant._count.timeEntries,
      icon: Clock,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
  ];

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-700';
      case 'USER':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/super-admin')}
            className="flex items-center gap-2 text-slate-600 hover:text-violet-600 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-slate-800">
                  {tenant.name}
                </h1>
                {tenant.isActive ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    <XCircle className="w-4 h-4" />
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-slate-600 mb-2">Slug: {tenant.slug}</p>
              <p className="text-sm text-slate-500">
                Created on {new Date(tenant.createdAt).toLocaleDateString()}
              </p>
            </div>

            <button
              onClick={toggleTenantStatus}
              disabled={updating}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                tenant.isActive
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {updating
                ? 'Updating...'
                : tenant.isActive
                ? 'Deactivate Tenant'
                : 'Activate Tenant'}
            </button>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800 mb-1">
                {stat.value.toLocaleString()}
              </p>
              <p className="text-sm text-slate-600">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tenant Settings */}
          {tenant.settings && (
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-violet-50 rounded-lg">
                  <Settings className="w-6 h-6 text-violet-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  Tenant Settings
                </h2>
              </div>

              <div className="space-y-4">
                <div className="pb-4 border-b border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">Company Name</p>
                  <p className="text-slate-800 font-medium">
                    {tenant.settings.companyName}
                  </p>
                </div>

                <div className="pb-4 border-b border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">
                    Subscription Plan
                  </p>
                  <span className="inline-flex px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                    {tenant.settings.subscriptionPlan}
                  </span>
                </div>

                <div className="pb-4 border-b border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">
                    Subscription Status
                  </p>
                  <span
                    className={`inline-flex px-3 py-1 rounded-lg text-sm font-medium ${
                      tenant.settings.subscriptionStatus === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {tenant.settings.subscriptionStatus}
                  </span>
                </div>

                <div className="pb-4 border-b border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">Max Employees</p>
                  <p className="text-slate-800 font-medium">
                    {tenant.settings.maxEmployees || 'Unlimited'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500 mb-1">Max Projects</p>
                  <p className="text-slate-800 font-medium">
                    {tenant.settings.maxProjects || 'Unlimited'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Activity Summary */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-50 rounded-lg">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">
                Activity Summary
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Users</p>
                    <p className="text-lg font-bold text-slate-800">
                      {tenant._count.users}
                    </p>
                  </div>
                </div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>

              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Active Employees</p>
                    <p className="text-lg font-bold text-slate-800">
                      {tenant._count.employees}
                    </p>
                  </div>
                </div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>

              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <FileText className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Active Projects</p>
                    <p className="text-lg font-bold text-slate-800">
                      {tenant._count.projects}
                    </p>
                  </div>
                </div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-50 rounded-lg">
                    <DollarSign className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Invoices</p>
                    <p className="text-lg font-bold text-slate-800">
                      {tenant._count.invoices}
                    </p>
                  </div>
                </div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Email Domain Management */}
        <div className="mt-6">
          <EmailDomainManager tenantId={tenant.id} tenantName={tenant.name} />
        </div>

        {/* Users List */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Users</h2>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
              {tenant.users.length}
            </span>
          </div>

          {tenant.users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                      Last Login
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tenant.users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800">
                            {user.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          <Shield className="w-3 h-3" />
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {user.isActive ? (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium w-fit">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium w-fit">
                            <XCircle className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-600 text-sm">
                        {user.lastLoginAt ? (
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {new Date(user.lastLoginAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                            <span className="text-xs text-slate-400 ml-6">
                              {new Date(user.lastLoginAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Never</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-600 text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
