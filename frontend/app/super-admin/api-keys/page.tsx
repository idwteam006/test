'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  ArrowLeft,
  Calendar,
  Shield,
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  lastUsed: string | null;
  createdAt: string;
  permissions: string[];
}

export default function ApiKeysPage() {
  const router = useRouter();
  const [showKey, setShowKey] = useState<string | null>(null);
  const [apiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      name: 'Production API',
      key: 'sk_live_xxxxxxxxxxxxxxxxxxxx',
      lastUsed: '2024-01-15T10:30:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      permissions: ['read', 'write'],
    },
    {
      id: '2',
      name: 'Development API',
      key: 'sk_test_xxxxxxxxxxxxxxxxxxxx',
      lastUsed: null,
      createdAt: '2024-01-10T00:00:00Z',
      permissions: ['read'],
    },
  ]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('API key copied to clipboard');
  };

  const maskKey = (key: string) => {
    return key.substring(0, 8) + '••••••••••••••••';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">API Keys</h1>
          <p className="text-slate-600 mt-1">Manage API access and authentication</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl hover:from-violet-600 hover:to-indigo-700 shadow-lg shadow-violet-500/25 transition-all font-medium">
          <Plus className="w-4 h-4" />
          Generate Key
        </button>
      </div>

      {/* Warning */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Shield className="w-5 h-5 text-amber-700" />
          </div>
          <p className="text-sm font-medium text-amber-800">
            Keep your API keys secure. Never share them in public repositories or client-side code.
          </p>
        </div>
      </div>

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.map((apiKey) => (
          <div
            key={apiKey.id}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 rounded-xl flex items-center justify-center">
                  <Key className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{apiKey.name}</h3>
                  <p className="text-sm font-medium text-slate-600">
                    Created {new Date(apiKey.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                  className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors"
                  title={showKey === apiKey.id ? 'Hide key' : 'Show key'}
                >
                  {showKey === apiKey.id ? (
                    <EyeOff className="w-5 h-5 text-slate-600" />
                  ) : (
                    <Eye className="w-5 h-5 text-slate-600" />
                  )}
                </button>
                <button
                  onClick={() => copyToClipboard(apiKey.key)}
                  className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="w-5 h-5 text-slate-600" />
                </button>
                <button className="p-2.5 hover:bg-rose-50 rounded-lg transition-colors" title="Delete key">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-sm">
              <span className="text-slate-800 font-semibold">
                {showKey === apiKey.id ? apiKey.key : maskKey(apiKey.key)}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-600">Last used: </span>
                <span className="font-semibold text-slate-800">
                  {apiKey.lastUsed
                    ? new Date(apiKey.lastUsed).toLocaleDateString()
                    : 'Never'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-600">Permissions: </span>
                {apiKey.permissions.map((perm) => (
                  <span
                    key={perm}
                    className="px-2.5 py-1 bg-violet-100 text-violet-700 rounded-lg text-xs font-semibold"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {apiKeys.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-violet-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No API keys</h3>
          <p className="text-slate-600 mt-1">Generate your first API key to get started</p>
        </div>
      )}
    </div>
  );
}
