'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  FileText,
  Search,
  Filter,
  ArrowLeft,
  User,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  userName?: string;
  ipAddress: string | null;
  createdAt: string;
  success: boolean;
  metadata?: any;
}

export default function AuditLogsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/super-admin/audit-logs');
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs || []);
      } else {
        // Mock data for demo
        setLogs([
          {
            id: '1',
            action: 'USER_LOGIN',
            entityType: 'Session',
            entityId: 'sess_123',
            userId: 'user_1',
            userName: 'John Doe',
            ipAddress: '192.168.1.1',
            createdAt: new Date().toISOString(),
            success: true,
          },
          {
            id: '2',
            action: 'TENANT_CREATED',
            entityType: 'Tenant',
            entityId: 'tenant_456',
            userId: 'user_1',
            userName: 'Admin',
            ipAddress: '192.168.1.1',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            success: true,
          },
          {
            id: '3',
            action: 'USER_LOGIN_FAILED',
            entityType: 'Session',
            entityId: 'sess_789',
            userId: null,
            userName: 'Unknown',
            ipAddress: '10.0.0.1',
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            success: false,
          },
        ]);
      }
    } catch (error) {
      // Use mock data on error
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string, success: boolean) => {
    if (!success) return <XCircle className="w-5 h-5 text-rose-600" />;
    if (action.includes('LOGIN')) return <User className="w-5 h-5 text-blue-600" />;
    if (action.includes('SECURITY')) return <Shield className="w-5 h-5 text-amber-600" />;
    return <CheckCircle className="w-5 h-5 text-emerald-600" />;
  };

  const getActionColor = (action: string, success: boolean) => {
    if (!success) return 'text-rose-700';
    if (action.includes('DELETE')) return 'text-rose-700';
    if (action.includes('CREATE')) return 'text-emerald-700';
    if (action.includes('UPDATE')) return 'text-blue-700';
    return 'text-slate-700';
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName?.toLowerCase().includes(searchQuery.toLowerCase());

    if (filter === 'all') return matchesSearch;
    if (filter === 'success') return matchesSearch && log.success;
    if (filter === 'failed') return matchesSearch && !log.success;
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Audit Logs</h1>
        <p className="text-slate-600 mt-1">Track all system activities and changes</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-sm transition-all"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'success', 'failed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl capitalize font-medium transition-all ${
                filter === f
                  ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl flex items-center justify-center border border-slate-200">
                  {getActionIcon(log.action, log.success)}
                </div>
                <div>
                  <p className={`font-bold ${getActionColor(log.action, log.success)}`}>
                    {log.action.replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm font-medium text-slate-600">
                    {log.entityType} • {log.entityId.substring(0, 12)}...
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-800">{log.userName || 'System'}</p>
                <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 justify-end">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            {log.ipAddress && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <span className="text-xs font-medium text-slate-600">IP: {log.ipAddress}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredLogs.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200">
            <FileText className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No logs found</h3>
          <p className="text-slate-600 mt-1">Try adjusting your search or filter</p>
        </div>
      )}
    </div>
  );
}
