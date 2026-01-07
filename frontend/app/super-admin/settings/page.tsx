'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Settings,
  Save,
  Globe,
  Shield,
  Database,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface GlobalSettings {
  id: string;
  siteName: string;
  supportEmail: string;
  maxTenantsPerDay: number;
  requireEmailVerification: boolean;
  allowPublicRegistration: boolean;
  maintenanceMode: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  isDevelopmentMode: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/super-admin/settings');
      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
      } else {
        toast.error(data.error || 'Failed to fetch settings');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch('/api/super-admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
        toast.success('Settings saved successfully');
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDevelopmentMode = async () => {
    if (!settings) return;

    const confirmMessage = settings.isDevelopmentMode
      ? 'Switch to Production Mode?\n\n• Email OTPs will be sent\n• Real authentication flow\n• Secure for production use'
      : 'Switch to Development Mode?\n\n⚠️ WARNING: This will:\n• Skip email sending\n• Use static OTP: 123456\n• Only use for testing!\n\nAre you sure?';

    if (!confirm(confirmMessage)) return;

    setSaving(true);
    try {
      const updatedSettings = {
        ...settings,
        isDevelopmentMode: !settings.isDevelopmentMode,
      };

      const response = await fetch('/api/super-admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
      });

      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
        toast.success(
          `Successfully switched to ${!settings.isDevelopmentMode ? 'Development' : 'Production'} Mode`
        );
      } else {
        toast.error(data.error || 'Failed to update mode');
      }
    } catch (error) {
      console.error('Error updating mode:', error);
      toast.error('Failed to update mode');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">Failed to load settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Global Settings</h1>
          <p className="text-slate-600 mt-1">Configure platform-wide settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl hover:from-violet-600 hover:to-indigo-700 shadow-lg shadow-violet-500/25 transition-all font-medium disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Environment Mode - New Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Environment Mode</h2>
          </div>

          <div
            className={`border-2 rounded-xl p-6 ${
              settings.isDevelopmentMode
                ? 'border-yellow-400 bg-yellow-50'
                : 'border-green-400 bg-green-50'
            }`}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3
                  className={`text-lg font-bold mb-2 ${
                    settings.isDevelopmentMode ? 'text-yellow-900' : 'text-green-900'
                  }`}
                >
                  {settings.isDevelopmentMode ? '🚧 Development Mode' : '✅ Production Mode'}
                </h3>

                {settings.isDevelopmentMode ? (
                  <div className="space-y-2 text-sm text-yellow-800">
                    <p className="flex items-center">
                      <span className="font-medium mr-2">⚠️ Active Features:</span>
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Email sending is <strong>disabled</strong></li>
                      <li>
                        Static OTP code:{' '}
                        <code className="bg-yellow-200 px-2 py-0.5 rounded font-mono">123456</code>
                      </li>
                      <li>Faster testing workflow</li>
                      <li>No email server required</li>
                    </ul>
                    <p className="mt-3 text-xs bg-yellow-100 border border-yellow-300 rounded p-2">
                      ⚠️ <strong>Security Notice:</strong> Development mode should NEVER be used in
                      production environments!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-green-800">
                    <p className="flex items-center">
                      <span className="font-medium mr-2">✅ Active Features:</span>
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Email OTPs sent via SMTP</li>
                      <li>Random 6-digit codes</li>
                      <li>Secure authentication flow</li>
                      <li>Production-ready</li>
                    </ul>
                    <p className="mt-3 text-xs bg-green-100 border border-green-300 rounded p-2">
                      ✅ <strong>Secure:</strong> Production mode uses industry-standard security
                      practices
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleToggleDevelopmentMode}
              disabled={saving}
              className={`w-full px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 ${
                settings.isDevelopmentMode
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              } disabled:opacity-50`}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Switching...</span>
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  <span>
                    Switch to {settings.isDevelopmentMode ? 'Production' : 'Development'} Mode
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-violet-50 rounded-lg">
              <Globe className="w-5 h-5 text-violet-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">General</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Site Name
              </label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Support Email
              </label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Security</h2>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="font-bold text-slate-800">Require Email Verification</p>
                <p className="text-sm font-medium text-slate-600 mt-1">
                  Users must verify email before accessing the platform
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    requireEmailVerification: !settings.requireEmailVerification,
                  })
                }
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  settings.requireEmailVerification ? 'bg-gradient-to-r from-violet-500 to-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${
                    settings.requireEmailVerification ? 'left-8' : 'left-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="font-bold text-slate-800">Allow Public Registration</p>
                <p className="text-sm font-medium text-slate-600 mt-1">
                  Allow anyone to create a new tenant account
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    allowPublicRegistration: !settings.allowPublicRegistration,
                  })
                }
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  settings.allowPublicRegistration ? 'bg-gradient-to-r from-violet-500 to-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${
                    settings.allowPublicRegistration ? 'left-8' : 'left-1'
                  }`}
                />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Session Timeout (seconds)
                </label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) =>
                    setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Max Login Attempts
                </label>
                <input
                  type="number"
                  value={settings.maxLoginAttempts}
                  onChange={(e) =>
                    setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Database className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Maintenance</h2>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <p className="font-bold text-slate-800">Maintenance Mode</p>
              <p className="text-sm font-medium text-slate-600 mt-1">
                Temporarily disable access for all users except super admins
              </p>
            </div>
            <button
              onClick={() =>
                setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })
              }
              className={`relative w-14 h-7 rounded-full transition-colors ${
                settings.maintenanceMode ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${
                  settings.maintenanceMode ? 'left-8' : 'left-1'
                }`}
              />
            </button>
          </div>
          {settings.maintenanceMode && (
            <div className="mt-4 p-4 bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200 rounded-xl">
              <p className="text-sm font-semibold text-rose-800">
                Warning: Maintenance mode is enabled. Regular users cannot access the platform.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
