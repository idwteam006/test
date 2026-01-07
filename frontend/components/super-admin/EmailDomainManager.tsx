'use client';

import { useState, useEffect } from 'react';
import { Mail, Plus, X, Edit2, Save, Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface EmailDomainManagerProps {
  tenantId: string;
  tenantName: string;
}

export default function EmailDomainManager({ tenantId, tenantName }: EmailDomainManagerProps) {
  const [domains, setDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [editedDomains, setEditedDomains] = useState<string[]>([]);

  useEffect(() => {
    fetchDomains();
  }, [tenantId]);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/super-admin/tenants/${tenantId}/email-domains`);
      const data = await response.json();

      if (data.success) {
        setDomains(data.data.allowedEmailDomains);
        setEditedDomains(data.data.allowedEmailDomains);
      } else {
        toast.error(data.error || 'Failed to load email domains');
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
      toast.error('Failed to load email domains');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
    setEditedDomains([...domains]);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditedDomains([...domains]);
    setNewDomain('');
  };

  const handleAddDomain = () => {
    if (!newDomain.trim()) {
      toast.error('Please enter a domain');
      return;
    }

    // Basic domain validation
    if (newDomain !== '*' && !/^[a-zA-Z0-9][a-zA-Z0-9-_.]*\.[a-zA-Z]{2,}$/.test(newDomain)) {
      toast.error('Invalid domain format. Use format: example.com or * for all domains');
      return;
    }

    if (editedDomains.includes(newDomain)) {
      toast.error('Domain already exists');
      return;
    }

    // If adding *, remove all other domains
    if (newDomain === '*') {
      setEditedDomains(['*']);
    } else {
      // If * exists, remove it when adding specific domain
      const filtered = editedDomains.filter(d => d !== '*');
      setEditedDomains([...filtered, newDomain]);
    }

    setNewDomain('');
  };

  const handleRemoveDomain = (domain: string) => {
    if (editedDomains.length === 1) {
      toast.error('At least one domain is required');
      return;
    }
    setEditedDomains(editedDomains.filter((d) => d !== domain));
  };

  const handleSave = async () => {
    if (editedDomains.length === 0) {
      toast.error('At least one domain is required');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/super-admin/tenants/${tenantId}/email-domains`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedEmailDomains: editedDomains }),
      });

      const data = await response.json();

      if (data.success) {
        setDomains(editedDomains);
        setEditing(false);
        toast.success('Email domains updated successfully');
      } else {
        toast.error(data.error || 'Failed to update email domains');
      }
    } catch (error) {
      console.error('Error saving domains:', error);
      toast.error('Failed to update email domains');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 rounded-lg">
            <Mail className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Allowed Email Domains</h2>
            <p className="text-sm text-slate-500">Control which email domains can register for {tenantName}</p>
          </div>
        </div>

        {!editing && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit Domains
          </button>
        )}
      </div>

      {/* Security Notice */}
      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Security Feature</p>
            <p>
              Only users with email addresses from these domains can be invited or register to this tenant.
              Use <code className="bg-amber-100 px-1.5 py-0.5 rounded">*</code> to allow all domains.
            </p>
          </div>
        </div>
      </div>

      {editing ? (
        <div className="space-y-4">
          {/* Add New Domain */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value.toLowerCase().trim())}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
              placeholder="example.com or * for all"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              onClick={handleAddDomain}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* Current Domains (Editable) */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Current Domains ({editedDomains.length}):</p>
            <div className="flex flex-wrap gap-2">
              {editedDomains.map((domain) => (
                <div
                  key={domain}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-100 text-indigo-800 rounded-lg group"
                >
                  <Mail className="w-4 h-4" />
                  <span className="font-medium">
                    {domain === '*' ? 'All domains (*)' : domain}
                  </span>
                  <button
                    onClick={() => handleRemoveDomain(domain)}
                    className="ml-1 p-1 hover:bg-indigo-200 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-slate-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Current Domains ({domains.length}):</p>
          <div className="flex flex-wrap gap-2">
            {domains.map((domain) => (
              <div
                key={domain}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-100 text-indigo-800 rounded-lg"
              >
                <Mail className="w-4 h-4" />
                <span className="font-medium">
                  {domain === '*' ? 'All domains (*)' : domain}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
