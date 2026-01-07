'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  Users,
  Building2,
  Calendar,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export default function AnalyticsPage() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState('30d');

  const stats = [
    {
      label: 'Total Users',
      value: '1,234',
      change: '+12%',
      positive: true,
      icon: Users,
    },
    {
      label: 'Active Tenants',
      value: '45',
      change: '+3',
      positive: true,
      icon: Building2,
    },
    {
      label: 'API Calls',
      value: '89,432',
      change: '+23%',
      positive: true,
      icon: BarChart3,
    },
    {
      label: 'Avg. Session',
      value: '24m',
      change: '-5%',
      positive: false,
      icon: Calendar,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
        <p className="text-slate-600 mt-1">Platform usage and performance metrics</p>
      </div>

      {/* Time Range Filter */}
      <div className="flex gap-2">
        {['7d', '30d', '90d'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
              timeRange === range
                ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 rounded-xl flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-violet-600" />
              </div>
              <div
                className={`flex items-center gap-1 text-sm font-semibold ${
                  stat.positive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {stat.positive ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                {stat.change}
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
            <p className="text-sm font-medium text-slate-600 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">User Growth</h3>
          </div>
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-slate-50 to-violet-50 rounded-xl border border-slate-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-slate-700 font-medium">Chart visualization coming soon</p>
              <p className="text-sm text-slate-500 mt-1">User growth trends will appear here</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">API Usage</h3>
          </div>
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-slate-700 font-medium">Chart visualization coming soon</p>
              <p className="text-sm text-slate-500 mt-1">API usage analytics will appear here</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Tenants */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-violet-50 rounded-lg">
            <Building2 className="w-5 h-5 text-violet-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Top Tenants by Usage</h3>
        </div>
        <div className="space-y-4">
          {[
            { name: 'Acme Corp', users: 45, usage: '89%' },
            { name: 'Tech Solutions', users: 32, usage: '76%' },
            { name: 'Global Services', users: 28, usage: '65%' },
            { name: 'Innovation Labs', users: 21, usage: '52%' },
          ].map((tenant, i) => (
            <div key={tenant.name} className="flex items-center gap-4">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg text-white font-bold text-sm">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="font-semibold text-slate-800">{tenant.name}</span>
                  <span className="text-sm font-medium text-slate-600">{tenant.users} users</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full shadow-sm"
                    style={{ width: tenant.usage }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
