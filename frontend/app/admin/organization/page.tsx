'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Save, Building2, Globe, Shield, CreditCard, Palette, Users, Upload, X, ClipboardList, Plus, Trash2, GripVertical, Eye, EyeOff } from 'lucide-react';
import { PhoneInput } from '@/components/ui/phone-input';
import { initializeOnboardingFields, getSectionFields } from '@/lib/onboarding-fields-defaults';

interface TenantSettings {
  id: string;
  companyName: string;
  logoUrl: string | null;
  timezone: string;
  currency: string;
  allowedEmailDomains: string[];
  isDevelopmentMode: boolean;

  // Subscription
  subscriptionPlan: string;
  subscriptionStatus: string;
  maxEmployees: number;
  maxProjects: number;

  // Company Details
  industry: string | null;
  companySize: string | null;
  website: string | null;
  description: string | null;
  companyPhone: string | null;
  zoomHostEmail: string | null;

  // Branding
  primaryColor: string | null;
  secondaryColor: string | null;
  customDomain: string | null;

  // Regional
  dateFormat: string;
  timeFormat: string;
  weekStartDay: string;
  language: string;

  // Billing
  billingEmail: string | null;
  billingAddress: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  taxId: string | null;

  // Security
  sessionTimeout: number;
  require2FA: boolean;

  // Onboarding
  onboardingFields?: {
    sections: Array<{
      id: string;
      name: string;
      order: number;
      enabled: boolean;
      fields: Array<{
        id: string;
        name: string;
        type: string;
        required: boolean;
        enabled: boolean;
        options?: string[];
        placeholder?: string;
        order: number;
      }>;
    }>;
  };
}

export default function OrganizationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<TenantSettings | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();

      if (data.success) {
        setSettings(data.settings);
      } else {
        toast.error(data.error || 'Failed to fetch settings');
      }
    } catch (error) {
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Organization settings saved successfully!');
        setSettings(data.settings);
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof TenantSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    const uploadToast = toast.loading('Uploading logo...', {
      description: 'Please wait',
    });

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/admin/upload-logo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      toast.dismiss(uploadToast);

      if (data.success) {
        toast.success('Logo uploaded successfully!');
        setSettings({ ...settings!, logoUrl: data.logoUrl });
      } else {
        toast.error(data.error || 'Failed to upload logo');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.dismiss(uploadToast);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    if (!settings) return;
    setSettings({ ...settings, logoUrl: null });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load settings</p>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'regional', label: 'Regional', icon: Globe },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'onboarding', label: 'Onboarding Fields', icon: ClipboardList },
    { id: 'subscription', label: 'Subscription', icon: Users },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Organization Settings</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your organization profile, subscription, and preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg p-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Company Information</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Logo
              </label>
              <div className="flex items-start gap-4">
                {settings.logoUrl && (
                  <div className="relative">
                    <img
                      src={settings.logoUrl}
                      alt="Company Logo"
                      className="h-24 w-24 object-contain border rounded bg-white p-2"
                    />
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      title="Remove logo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <label
                    htmlFor="logo-upload"
                    className={`inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${
                      uploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Uploading...' : 'Upload Logo'}
                  </label>
                  <p className="mt-2 text-sm text-gray-500">
                    Upload an image file (PNG, JPG, WebP). Max size: 5MB. Will appear on invoices and documents.
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Recommended: Square image, at least 200x200px for best quality
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => updateSetting('companyName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone
                </label>
                <PhoneInput
                  value={settings.companyPhone || ''}
                  onChange={(value) => updateSetting('companyPhone', value)}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Billing Email
                </label>
                <input
                  type="email"
                  value={settings.billingEmail || ''}
                  onChange={(e) => updateSetting('billingEmail', e.target.value)}
                  placeholder="billing@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <input
                type="text"
                value={settings.billingAddress?.street || ''}
                onChange={(e) => updateSetting('billingAddress', { ...settings.billingAddress, street: e.target.value })}
                placeholder="Street address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={settings.billingAddress?.city || ''}
                  onChange={(e) => updateSetting('billingAddress', { ...settings.billingAddress, city: e.target.value })}
                  placeholder="City"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={settings.billingAddress?.state || ''}
                  onChange={(e) => updateSetting('billingAddress', { ...settings.billingAddress, state: e.target.value })}
                  placeholder="State"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  type="text"
                  value={settings.billingAddress?.zip || ''}
                  onChange={(e) => updateSetting('billingAddress', { ...settings.billingAddress, zip: e.target.value })}
                  placeholder="ZIP/Postal Code"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={settings.billingAddress?.country || ''}
                  onChange={(e) => updateSetting('billingAddress', { ...settings.billingAddress, country: e.target.value })}
                  placeholder="Country"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Development Mode</p>
                  <p className="text-sm text-gray-600 mt-1">
                    When enabled, emails will not be sent (useful for testing)
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    ⚠️ Turn this OFF in production to enable email sending
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.isDevelopmentMode}
                    onChange={(e) => updateSetting('isDevelopmentMode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                </label>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-md font-semibold text-gray-900 mb-4">Zoom Integration</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zoom Host Email
                </label>
                <input
                  type="email"
                  value={settings.zoomHostEmail || ''}
                  onChange={(e) => updateSetting('zoomHostEmail', e.target.value)}
                  placeholder="vijay.n@idwteam.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="mt-2 text-sm text-gray-500">
                  The Zoom account email that will host all meetings created from this organization.
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  This must be a valid Zoom user email in your Zoom account.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry
              </label>
              <select
                value={settings.industry || ''}
                onChange={(e) => updateSetting('industry', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select industry</option>
                <option value="technology">Technology</option>
                <option value="finance">Finance</option>
                <option value="healthcare">Healthcare</option>
                <option value="education">Education</option>
                <option value="retail">Retail</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Size
              </label>
              <select
                value={settings.companySize || ''}
                onChange={(e) => updateSetting('companySize', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="501+">501+ employees</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                value={settings.website || ''}
                onChange={(e) => updateSetting('website', e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={settings.description || ''}
                onChange={(e) => updateSetting('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Brief description of your organization..."
              />
            </div>
          </div>
        )}

        {/* Regional Tab */}
        {activeTab === 'regional' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Regional Settings</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                value={settings.timezone}
                onChange={(e) => updateSetting('timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Asia/Shanghai">Shanghai (CST)</option>
                <option value="Asia/Kolkata">India (IST)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={settings.currency}
                onChange={(e) => updateSetting('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="USD">USD - US Dollar ($)</option>
                <option value="EUR">EUR - Euro (€)</option>
                <option value="GBP">GBP - British Pound (£)</option>
                <option value="JPY">JPY - Japanese Yen (¥)</option>
                <option value="INR">INR - Indian Rupee (₹)</option>
                <option value="AUD">AUD - Australian Dollar (A$)</option>
                <option value="CAD">CAD - Canadian Dollar (C$)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Format
              </label>
              <select
                value={settings.dateFormat}
                onChange={(e) => updateSetting('dateFormat', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                <option value="DD MMM YYYY">DD MMM YYYY (31 Dec 2024)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Format
              </label>
              <select
                value={settings.timeFormat}
                onChange={(e) => updateSetting('timeFormat', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="12h">12-hour (2:30 PM)</option>
                <option value="24h">24-hour (14:30)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Week Starts On
              </label>
              <select
                value={settings.weekStartDay}
                onChange={(e) => updateSetting('weekStartDay', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="SUNDAY">Sunday</option>
                <option value="MONDAY">Monday</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                value={settings.language}
                onChange={(e) => updateSetting('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
                <option value="zh">Chinese</option>
              </select>
            </div>
          </div>
        )}

        {/* Branding Tab */}
        {activeTab === 'branding' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Brand Customization</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Color
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={settings.primaryColor || '#6366F1'}
                  onChange={(e) => updateSetting('primaryColor', e.target.value)}
                  className="h-10 w-20 rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={settings.primaryColor || '#6366F1'}
                  onChange={(e) => updateSetting('primaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="#6366F1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secondary Color
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={settings.secondaryColor || '#764BA2'}
                  onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                  className="h-10 w-20 rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={settings.secondaryColor || '#764BA2'}
                  onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="#764BA2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Domain
              </label>
              <input
                type="text"
                value={settings.customDomain || ''}
                onChange={(e) => updateSetting('customDomain', e.target.value)}
                placeholder="yourcompany.zenora.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-2 text-sm text-gray-500">
                Contact support to configure your custom domain
              </p>
            </div>
          </div>
        )}

        {/* Onboarding Fields Tab */}
        {activeTab === 'onboarding' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Employee Onboarding Fields</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Configure which fields appear in the employee onboarding form
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 Enable or disable sections and fields that employees need to fill during onboarding. Changes will apply to new onboarding invitations.
              </p>
            </div>

            {initializeOnboardingFields(settings).sections.map((section, sectionIndex) => {
              const sectionFields = getSectionFields(section);
              return (
              <div key={section.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-5 h-5 text-gray-400" />
                    <div>
                      <h3 className="font-medium text-gray-900">{section.name}</h3>
                      <p className="text-sm text-gray-500">Section {section.order} • {sectionFields.length} fields</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newFields = { ...settings.onboardingFields };
                        if (!newFields.sections) newFields.sections = [];
                        if (!newFields.sections[sectionIndex]) {
                          newFields.sections[sectionIndex] = { ...section };
                        }
                        newFields.sections[sectionIndex].enabled = !section.enabled;
                        updateSetting('onboardingFields', newFields);
                      }}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        section.enabled
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {section.enabled ? (
                        <>
                          <Eye className="w-4 h-4 inline mr-1" />
                          Enabled
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4 inline mr-1" />
                          Disabled
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {section.enabled && sectionFields.length > 0 && (
                  <div className="mt-4 space-y-2 pl-8">
                    {sectionFields.map((field, fieldIndex) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{field.name}</p>
                            <p className="text-xs text-gray-500">
                              {field.type} {field.required && '• Required'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const newFields = { ...settings.onboardingFields };
                              if (!newFields.sections) newFields.sections = [];

                              // Ensure section exists and has fields array
                              if (!newFields.sections[sectionIndex]) {
                                newFields.sections[sectionIndex] = { ...section, fields: [...sectionFields] };
                              } else if (!newFields.sections[sectionIndex].fields || newFields.sections[sectionIndex].fields.length === 0) {
                                newFields.sections[sectionIndex].fields = [...sectionFields];
                              }

                              // Toggle the field enabled state
                              if (newFields.sections[sectionIndex].fields[fieldIndex]) {
                                newFields.sections[sectionIndex].fields[fieldIndex] = {
                                  ...newFields.sections[sectionIndex].fields[fieldIndex],
                                  enabled: !field.enabled
                                };
                              }

                              updateSetting('onboardingFields', newFields);
                            }}
                            className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                              field.enabled
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {field.enabled ? 'On' : 'Off'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )})}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ Note: Core system fields (First Name, Last Name, Email, Date of Birth, etc.) are always required and cannot be disabled. You can add additional custom fields in future updates.
              </p>
            </div>
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Subscription & Limits</h2>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-indigo-900">
                    {settings.subscriptionPlan} Plan
                  </h3>
                  <p className="text-sm text-indigo-700 mt-1">
                    Status: <span className="font-medium">{settings.subscriptionStatus}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-600">Max Employees</p>
                <p className="text-2xl font-bold text-gray-900">{settings.maxEmployees}</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-600">Max Projects</p>
                <p className="text-2xl font-bold text-gray-900">{settings.maxProjects}</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                To upgrade your plan or modify limits, please contact support
              </p>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Billing & Tax Information</h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 Company contact details and billing email are configured in the General tab
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax ID / VAT Number
              </label>
              <input
                type="text"
                value={settings.taxId || ''}
                onChange={(e) => updateSetting('taxId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter tax ID or VAT number"
              />
              <p className="mt-2 text-sm text-gray-500">
                This will appear on invoices and tax documents
              </p>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Timeout (seconds)
              </label>
              <input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-2 text-sm text-gray-500">
                Current: {Math.floor(settings.sessionTimeout / 60)} minutes
              </p>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Require Two-Factor Authentication</p>
                <p className="text-sm text-gray-500">Force all users to enable 2FA</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.require2FA}
                  onChange={(e) => updateSetting('require2FA', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
