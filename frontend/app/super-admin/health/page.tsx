'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Server,
  Database,
  Cloud,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Cpu,
  HardDrive,
  Wifi,
} from 'lucide-react';

interface HealthStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  message?: string;
}

export default function SystemHealthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [healthChecks, setHealthChecks] = useState<HealthStatus[]>([
    { name: 'Database', status: 'healthy', latency: 12, message: 'PostgreSQL connected' },
    { name: 'Redis Cache', status: 'healthy', latency: 3, message: 'Sessions active' },
    { name: 'API Server', status: 'healthy', latency: 45, message: 'All endpoints responding' },
    { name: 'Email Service', status: 'healthy', latency: 120, message: 'Resend connected' },
    { name: 'File Storage', status: 'healthy', latency: 89, message: 'S3 bucket accessible' },
  ]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    // Simulate health check
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const refreshHealth = () => {
    setLoading(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setLoading(false);
    }, 1000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'degraded':
        return <Activity className="w-5 h-5 text-amber-600" />;
      default:
        return <XCircle className="w-5 h-5 text-rose-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-emerald-50 border-emerald-200';
      case 'degraded':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-rose-50 border-rose-200';
    }
  };

  const getIcon = (name: string) => {
    const iconClass = "w-6 h-6 text-emerald-600";
    switch (name) {
      case 'Database':
        return <Database className={iconClass} />;
      case 'Redis Cache':
        return <Cpu className={iconClass} />;
      case 'API Server':
        return <Server className={iconClass} />;
      case 'Email Service':
        return <Cloud className={iconClass} />;
      case 'File Storage':
        return <HardDrive className={iconClass} />;
      default:
        return <Wifi className={iconClass} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">System Health</h1>
          <p className="text-slate-600 mt-1">Monitor system status and performance</p>
        </div>
        <button
          onClick={refreshHealth}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 font-medium transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overall Status */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-emerald-800">All Systems Operational</h2>
            <p className="text-emerald-700 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Health Checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {healthChecks.map((check) => (
          <div
            key={check.name}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl">
                  {getIcon(check.name)}
                </div>
                <h3 className="text-lg font-bold text-slate-800">{check.name}</h3>
              </div>
              {getStatusIcon(check.status)}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-600">Latency</span>
                <span className="font-semibold text-slate-800">{check.latency}ms</span>
              </div>
              <p className="text-sm text-slate-600 font-medium">{check.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Cpu className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">CPU Usage</h3>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-bold text-slate-800">24%</span>
            <span className="text-emerald-600 text-sm mb-1 font-semibold">Normal</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div className="h-full w-1/4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full shadow-sm"></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <HardDrive className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Memory Usage</h3>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-bold text-slate-800">67%</span>
            <span className="text-amber-600 text-sm mb-1 font-semibold">Moderate</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div className="h-full w-2/3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full shadow-sm"></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Database className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Disk Usage</h3>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-bold text-slate-800">45%</span>
            <span className="text-emerald-600 text-sm mb-1 font-semibold">Normal</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div className="h-full w-1/2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full shadow-sm"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
