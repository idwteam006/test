'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Users,
  MapPin,
  FileText,
  ArrowRight,
  ArrowLeft,
  Save,
  CheckCircle2,
  X,
  Loader2,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PhoneInput } from '@/components/ui/phone-input';
import { toast } from 'sonner';

type ClientFormData = {
  // Step 1
  clientType: string;
  companyName: string;
  industry: string;
  companySize: string;
  website: string;
  taxId: string;

  // Step 2
  contactName: string;
  contactDesignation: string;
  contactEmail: string;
  contactPhone: string;
  portalAccess: boolean;
  secondaryContactName: string;
  secondaryContactDesignation: string;
  secondaryContactEmail: string;
  secondaryContactPhone: string;
  secondaryPortalAccess: boolean;

  // Step 3
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  billingEmail: string;
  sameAsOfficeAddress: boolean;
  paymentTerms: string;
  currency: string;

  // Step 4
  accountManagerId: string;
  priority: string;
  contractStartDate: string;
  contractEndDate: string;
  contractValue: string;
  tags: string[];
  internalNotes: string;
  status: string;
};

const steps = [
  { id: 1, name: 'Basic Info', icon: Building2 },
  { id: 2, name: 'Contacts', icon: Users },
  { id: 3, name: 'Address & Billing', icon: MapPin },
  { id: 4, name: 'Additional Details', icon: FileText },
];

interface AccountManager {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function NewClientPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [accountManagers, setAccountManagers] = useState<AccountManager[]>([]);
  const [formData, setFormData] = useState<ClientFormData>({
    clientType: 'COMPANY',
    companyName: '',
    industry: '',
    companySize: '',
    website: '',
    taxId: '',
    contactName: '',
    contactDesignation: '',
    contactEmail: '',
    contactPhone: '',
    portalAccess: false,
    secondaryContactName: '',
    secondaryContactDesignation: '',
    secondaryContactEmail: '',
    secondaryContactPhone: '',
    secondaryPortalAccess: false,
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    billingEmail: '',
    sameAsOfficeAddress: true,
    paymentTerms: 'NET_30',
    currency: 'INR',
    accountManagerId: '',
    priority: 'MEDIUM',
    contractStartDate: '',
    contractEndDate: '',
    contractValue: '',
    tags: [],
    internalNotes: '',
    status: 'ACTIVE',
  });

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const response = await fetch('/api/clients/draft');
        const data = await response.json();
        if (data.success && data.draft) {
          setFormData(data.draft);
          toast.info('Draft loaded', {
            description: 'Your previous draft has been restored',
          });
        }
      } catch (error) {
        console.error('Load draft error:', error);
      }
    };
    loadDraft();
  }, []);

  // Fetch account managers (ADMIN, MANAGER, and HR roles)
  useEffect(() => {
    const fetchAccountManagers = async () => {
      try {
        const response = await fetch('/api/admin/employees?role=ADMIN,MANAGER,HR');
        const data = await response.json();
        if (data.success && data.data) {
          setAccountManagers(data.data);
        }
      } catch (error) {
        console.error('Fetch account managers error:', error);
      }
    };
    fetchAccountManagers();
  }, []);

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const response = await fetch('/api/clients/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Draft saved successfully', {
          description: 'You can continue later',
        });
      } else {
        toast.error('Failed to save draft');
      }
    } catch (error) {
      console.error('Save draft error:', error);
      toast.error('Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/clients/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          contractValue: formData.contractValue ? parseFloat(formData.contractValue) : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Clear draft after successful creation
        await fetch('/api/clients/draft', { method: 'DELETE' });

        toast.success('Client created successfully!', {
          description: `Client ID: ${data.client.clientId}`,
        });
        router.push('/admin/clients');
      } else {
        toast.error(data.error || 'Failed to create client', {
          description: data.details ? JSON.stringify(data.details) : undefined,
        });
      }
    } catch (error) {
      console.error('Create client error:', error);
      toast.error('Network error', {
        description: 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Basic Info
        return !!(
          formData.companyName &&
          formData.companyName.trim() !== ''
        );
      case 2: // Contacts
        return !!(
          formData.contactName &&
          formData.contactEmail &&
          formData.contactPhone &&
          formData.contactName.trim() !== '' &&
          formData.contactEmail.trim() !== '' &&
          formData.contactPhone.trim() !== ''
        );
      case 3: // Address & Billing - all optional, always valid
        return true;
      case 4: // Additional Details - all optional, always valid
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const progress = (currentStep / 4) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Create New Client</h1>
              <p className="text-slate-600 mt-1">Add a new client to your system</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/admin/clients')}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`flex flex-col items-center ${
                    currentStep >= step.id ? 'text-purple-600' : 'text-slate-400'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                      currentStep >= step.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium">{step.name}</span>
                </div>
              ))}
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* Form Content */}
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
            <CardTitle className="flex items-center justify-between">
              <span>STEP {currentStep} of 4: {steps[currentStep - 1].name}</span>
              <span className="text-sm font-normal text-slate-600">
                Progress: {Math.round(progress)}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <Step1BasicInfo formData={formData} updateFormData={updateFormData} />
              )}
              {currentStep === 2 && (
                <Step2Contacts formData={formData} updateFormData={updateFormData} />
              )}
              {currentStep === 3 && (
                <Step3AddressBilling formData={formData} updateFormData={updateFormData} />
              )}
              {currentStep === 4 && (
                <Step4Additional formData={formData} updateFormData={updateFormData} accountManagers={accountManagers} />
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <div>
                {currentStep > 1 && (
                  <Button variant="outline" onClick={prevStep}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleSaveDraft} disabled={savingDraft}>
                  <Save className="w-4 h-4 mr-2" />
                  {savingDraft ? 'Saving...' : 'Save as Draft'}
                </Button>
                {currentStep < 4 ? (
                  <Button
                    onClick={nextStep}
                    disabled={!validateStep(currentStep)}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-gradient-to-r from-green-600 to-emerald-600"
                  >
                    {loading ? (
                      'Creating...'
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Create Client
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Step 1: Basic Info
function Step1BasicInfo({ formData, updateFormData }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <Label className="text-sm font-semibold">Client Type *</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          {['COMPANY', 'INDIVIDUAL', 'GOVERNMENT', 'NON_PROFIT'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => updateFormData('clientType', type)}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                formData.clientType === type
                  ? 'border-purple-600 bg-purple-50 text-purple-700'
                  : 'border-slate-200 hover:border-purple-300'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="companyName">Company Name *</Label>
        <Input
          id="companyName"
          value={formData.companyName}
          onChange={(e) => updateFormData('companyName', e.target.value)}
          placeholder="Acme Corporation"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="industry">Industry *</Label>
          <select
            id="industry"
            value={formData.industry}
            onChange={(e) => updateFormData('industry', e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white"
          >
            <option value="">Select Industry</option>
            <option value="Information Technology">Information Technology</option>
            <option value="Financial Services">Financial Services</option>
            <option value="Healthcare">Healthcare</option>
            <option value="E-commerce & Retail">E-commerce & Retail</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Education">Education</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <Label htmlFor="companySize">Company Size</Label>
          <select
            id="companySize"
            value={formData.companySize}
            onChange={(e) => updateFormData('companySize', e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white"
          >
            <option value="">Select Size</option>
            <option value="1-10">1-10 employees</option>
            <option value="11-50">11-50 employees</option>
            <option value="51-200">51-200 employees</option>
            <option value="201-500">201-500 employees</option>
            <option value="500+">500+ employees</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          type="url"
          value={formData.website}
          onChange={(e) => updateFormData('website', e.target.value)}
          placeholder="https://acmecorp.com"
        />
      </div>

      <div>
        <Label htmlFor="taxId">Tax ID (GST/PAN)</Label>
        <Input
          id="taxId"
          value={formData.taxId}
          onChange={(e) => updateFormData('taxId', e.target.value)}
          placeholder="29ABCDE1234F1Z5"
        />
        <p className="text-xs text-slate-500 mt-1">Optional - GST number, PAN, or other tax identification</p>
      </div>
    </motion.div>
  );
}

// Step 2: Contacts
function Step2Contacts({ formData, updateFormData }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="border-b pb-4">
        <h3 className="font-semibold text-lg mb-4">Primary Contact *</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contactName">Full Name *</Label>
            <Input
              id="contactName"
              value={formData.contactName}
              onChange={(e) => updateFormData('contactName', e.target.value)}
              placeholder="John Smith"
              required
            />
          </div>

          <div>
            <Label htmlFor="contactDesignation">Designation</Label>
            <Input
              id="contactDesignation"
              value={formData.contactDesignation}
              onChange={(e) => updateFormData('contactDesignation', e.target.value)}
              placeholder="CEO"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <Label htmlFor="contactEmail">Email *</Label>
            <Input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => updateFormData('contactEmail', e.target.value)}
              placeholder="john.smith@acmecorp.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="contactPhone">Phone *</Label>
            <PhoneInput
              id="contactPhone"
              value={formData.contactPhone || ''}
              onChange={(value) => updateFormData('contactPhone', value)}
              placeholder="Phone number"
              required
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.portalAccess}
              onChange={(e) => updateFormData('portalAccess', e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <span className="text-sm">Create portal access for this contact</span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-4">Secondary Contact (Optional)</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="secondaryContactName">Full Name</Label>
            <Input
              id="secondaryContactName"
              value={formData.secondaryContactName}
              onChange={(e) => updateFormData('secondaryContactName', e.target.value)}
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <Label htmlFor="secondaryContactDesignation">Designation</Label>
            <Input
              id="secondaryContactDesignation"
              value={formData.secondaryContactDesignation}
              onChange={(e) => updateFormData('secondaryContactDesignation', e.target.value)}
              placeholder="Project Coordinator"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <Label htmlFor="secondaryContactEmail">Email</Label>
            <Input
              id="secondaryContactEmail"
              type="email"
              value={formData.secondaryContactEmail}
              onChange={(e) => updateFormData('secondaryContactEmail', e.target.value)}
              placeholder="jane.doe@acmecorp.com"
            />
          </div>

          <div>
            <Label htmlFor="secondaryContactPhone">Phone</Label>
            <PhoneInput
              id="secondaryContactPhone"
              value={formData.secondaryContactPhone || ''}
              onChange={(value) => updateFormData('secondaryContactPhone', value)}
              placeholder="Phone number"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Step 3: Address & Billing
function Step3AddressBilling({ formData, updateFormData }: any) {
  const [lookingUpPostal, setLookingUpPostal] = useState(false);
  const [postalError, setPostalError] = useState<string | null>(null);
  const [postalSuccess, setPostalSuccess] = useState(false);

  // Get country code for postal lookup
  const getCountryCode = (country: string): string => {
    const countryMap: Record<string, string> = {
      'india': 'IN',
      'united states': 'US',
      'usa': 'US',
      'united kingdom': 'UK',
      'uk': 'UK',
      'canada': 'CA',
      'australia': 'AU',
      'germany': 'DE',
      'france': 'FR',
    };
    return countryMap[country.toLowerCase()] || country.substring(0, 2).toUpperCase();
  };

  // Lookup address from postal code
  const lookupPostalCode = async () => {
    if (!formData.postalCode) {
      setPostalError('Please enter a postal code first');
      return;
    }

    setLookingUpPostal(true);
    setPostalError(null);
    setPostalSuccess(false);

    try {
      const countryCode = getCountryCode(formData.country || 'India');
      const response = await fetch(
        `/api/utils/postal-lookup?postalCode=${encodeURIComponent(formData.postalCode)}&country=${countryCode}`
      );
      const data = await response.json();

      if (data.success && data.data) {
        // Auto-fill city and state
        if (data.data.city) {
          updateFormData('city', data.data.city);
        }
        if (data.data.state) {
          updateFormData('state', data.data.state);
        }
        if (data.data.country && !formData.country) {
          updateFormData('country', data.data.country);
        }
        setPostalSuccess(true);
        // Clear success message after 3 seconds
        setTimeout(() => setPostalSuccess(false), 3000);
      } else {
        setPostalError(data.error || 'Could not find address for this postal code');
      }
    } catch (error) {
      console.error('Postal lookup error:', error);
      setPostalError('Failed to lookup postal code. Please enter address manually.');
    } finally {
      setLookingUpPostal(false);
    }
  };

  // Auto-lookup when postal code reaches expected length
  const handlePostalCodeChange = async (value: string) => {
    updateFormData('postalCode', value);
    setPostalError(null);
    setPostalSuccess(false);

    // Auto-lookup for Indian postal codes (6 digits)
    const countryCode = getCountryCode(formData.country || 'India');
    if (countryCode === 'IN' && value.length === 6 && /^\d{6}$/.test(value)) {
      // Auto-trigger lookup
      setLookingUpPostal(true);
      try {
        const response = await fetch(
          `/api/utils/postal-lookup?postalCode=${encodeURIComponent(value)}&country=${countryCode}`
        );
        const data = await response.json();

        if (data.success && data.data) {
          if (data.data.city) updateFormData('city', data.data.city);
          if (data.data.state) updateFormData('state', data.data.state);
          setPostalSuccess(true);
          setTimeout(() => setPostalSuccess(false), 3000);
        }
      } catch (error) {
        console.error('Auto postal lookup error:', error);
      } finally {
        setLookingUpPostal(false);
      }
    }
    // Auto-lookup for US zip codes (5 digits)
    else if (countryCode === 'US' && value.length === 5 && /^\d{5}$/.test(value)) {
      setLookingUpPostal(true);
      try {
        const response = await fetch(
          `/api/utils/postal-lookup?postalCode=${encodeURIComponent(value)}&country=${countryCode}`
        );
        const data = await response.json();

        if (data.success && data.data) {
          if (data.data.city) updateFormData('city', data.data.city);
          if (data.data.state) updateFormData('state', data.data.state);
          setPostalSuccess(true);
          setTimeout(() => setPostalSuccess(false), 3000);
        }
      } catch (error) {
        console.error('Auto postal lookup error:', error);
      } finally {
        setLookingUpPostal(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="border-b pb-4">
        <h3 className="font-semibold text-lg mb-4">Office Address</h3>

        <div className="space-y-4">
          {/* Postal Code first - for auto-fill */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="postalCode">Postal Code *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => handlePostalCodeChange(e.target.value)}
                    placeholder={formData.country === 'India' || !formData.country ? '560001' : '10001'}
                    required
                    className={postalSuccess ? 'border-green-500 pr-8' : postalError ? 'border-red-300' : ''}
                  />
                  {postalSuccess && (
                    <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={lookupPostalCode}
                  disabled={lookingUpPostal || !formData.postalCode}
                  title="Lookup address from postal code"
                >
                  {lookingUpPostal ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {postalError && (
                <p className="text-xs text-red-500 mt-1">{postalError}</p>
              )}
              {postalSuccess && (
                <p className="text-xs text-green-600 mt-1">Address auto-filled from postal code</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                Enter postal code to auto-fill city and state
              </p>
            </div>

            <div>
              <Label htmlFor="country">Country *</Label>
              <select
                id="country"
                value={formData.country}
                onChange={(e) => updateFormData('country', e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white"
              >
                <option value="India">India</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
                <option value="Germany">Germany</option>
                <option value="France">France</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => updateFormData('city', e.target.value)}
                placeholder="Bangalore"
                required
              />
            </div>

            <div>
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => updateFormData('state', e.target.value)}
                placeholder="Karnataka"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="addressLine1">Address Line 1 *</Label>
            <Input
              id="addressLine1"
              value={formData.addressLine1}
              onChange={(e) => updateFormData('addressLine1', e.target.value)}
              placeholder="123 Business Park"
              required
            />
          </div>

          <div>
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input
              id="addressLine2"
              value={formData.addressLine2}
              onChange={(e) => updateFormData('addressLine2', e.target.value)}
              placeholder="Tower A, 5th Floor"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-4">Billing Information</h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="billingEmail">Billing Email *</Label>
            <Input
              id="billingEmail"
              type="email"
              value={formData.billingEmail}
              onChange={(e) => updateFormData('billingEmail', e.target.value)}
              placeholder="billing@acmecorp.com"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.sameAsOfficeAddress}
                onChange={(e) => updateFormData('sameAsOfficeAddress', e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="text-sm">Same as office address</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentTerms">Payment Terms *</Label>
              <select
                id="paymentTerms"
                value={formData.paymentTerms}
                onChange={(e) => updateFormData('paymentTerms', e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white"
              >
                <option value="NET_30">Net 30 days</option>
                <option value="NET_60">Net 60 days</option>
                <option value="NET_90">Net 90 days</option>
                <option value="ADVANCE">Advance Payment</option>
                <option value="MILESTONE">Milestone-based</option>
              </select>
            </div>

            <div>
              <Label htmlFor="currency">Preferred Currency</Label>
              <select
                id="currency"
                value={formData.currency}
                onChange={(e) => updateFormData('currency', e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Step 4: Additional Details
function Step4Additional({ formData, updateFormData, accountManagers }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <Label htmlFor="accountManagerId">Account Manager</Label>
        <select
          id="accountManagerId"
          value={formData.accountManagerId}
          onChange={(e) => updateFormData('accountManagerId', e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white"
        >
          <option value="">Select Account Manager</option>
          {accountManagers?.map((manager: any) => (
            <option key={manager.id} value={manager.id}>
              {manager.firstName} {manager.lastName} ({manager.role})
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500 mt-1">The person responsible for managing this client relationship</p>
      </div>

      <div>
        <Label>Client Priority</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          {['LOW', 'MEDIUM', 'HIGH', 'VIP'].map((priority) => (
            <button
              key={priority}
              type="button"
              onClick={() => updateFormData('priority', priority)}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                formData.priority === priority
                  ? 'border-purple-600 bg-purple-50 text-purple-700'
                  : 'border-slate-200 hover:border-purple-300'
              }`}
            >
              {priority}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b pb-4">
        <h3 className="font-semibold text-base mb-4">Contract Details (Optional)</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contractStartDate">Contract Start Date</Label>
            <Input
              id="contractStartDate"
              type="date"
              value={formData.contractStartDate}
              onChange={(e) => updateFormData('contractStartDate', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="contractEndDate">Contract End Date</Label>
            <Input
              id="contractEndDate"
              type="date"
              value={formData.contractEndDate}
              onChange={(e) => updateFormData('contractEndDate', e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="contractValue">Contract Value ({formData.currency})</Label>
          <Input
            id="contractValue"
            type="number"
            value={formData.contractValue}
            onChange={(e) => updateFormData('contractValue', e.target.value)}
            placeholder="5000000"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="internalNotes">Internal Notes</Label>
        <Textarea
          id="internalNotes"
          value={formData.internalNotes}
          onChange={(e) => updateFormData('internalNotes', e.target.value)}
          placeholder="Key decision maker, special requirements, etc."
          rows={4}
        />
      </div>

      <div>
        <Label>Status</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {['ACTIVE', 'INACTIVE'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => updateFormData('status', status)}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                formData.status === status
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : 'border-slate-200 hover:border-green-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
