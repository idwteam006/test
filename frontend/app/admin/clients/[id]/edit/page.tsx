'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Save, Building2, Users, MapPin, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PhoneInput } from '@/components/ui/phone-input';
import { toast } from 'sonner';

interface ClientFormData {
  companyName: string;
  taxId: string;
  industry: string;
  companySize: string;
  website: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactDesignation: string;
  secondaryContactName: string;
  secondaryContactEmail: string;
  secondaryContactPhone: string;
  secondaryContactDesignation: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  billingEmail: string;
  currency: string;
  paymentTerms: string;
  contractValue: string;
  contractStartDate: string;
  contractEndDate: string;
  accountManagerId: string;
  internalNotes: string;
}

const initialFormData: ClientFormData = {
  companyName: '',
  taxId: '',
  industry: '',
  companySize: '',
  website: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  contactDesignation: '',
  secondaryContactName: '',
  secondaryContactEmail: '',
  secondaryContactPhone: '',
  secondaryContactDesignation: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  billingEmail: '',
  currency: 'INR',
  paymentTerms: '',
  contractValue: '',
  contractStartDate: '',
  contractEndDate: '',
  accountManagerId: '',
  internalNotes: '',
};

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ClientFormData>(initialFormData);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const steps = [
    { number: 1, title: 'Basic Info', icon: Building2 },
    { number: 2, title: 'Contacts', icon: Users },
    { number: 3, title: 'Address & Billing', icon: MapPin },
    { number: 4, title: 'Additional Details', icon: FileText },
  ];

  // Load client data
  useEffect(() => {
    const loadClient = async () => {
      try {
        const response = await fetch(`/api/clients/${clientId}`);
        const data = await response.json();

        if (response.ok && data.success) {
          const client = data.client;
          setFormData({
            companyName: client.companyName || '',
            taxId: client.taxId || '',
            industry: client.industry || '',
            companySize: client.companySize || '',
            website: client.website || '',
            contactName: client.contactName || '',
            contactEmail: client.contactEmail || '',
            contactPhone: client.contactPhone || '',
            contactDesignation: client.contactDesignation || '',
            secondaryContactName: client.secondaryContactName || '',
            secondaryContactEmail: client.secondaryContactEmail || '',
            secondaryContactPhone: client.secondaryContactPhone || '',
            secondaryContactDesignation: client.secondaryContactDesignation || '',
            addressLine1: client.addressLine1 || '',
            addressLine2: client.addressLine2 || '',
            city: client.city || '',
            state: client.state || '',
            postalCode: client.postalCode || '',
            country: client.country || '',
            billingEmail: client.billingEmail || '',
            currency: client.currency || 'INR',
            paymentTerms: client.paymentTerms || '',
            contractValue: client.contractValue?.toString() || '',
            contractStartDate: client.contractStartDate?.split('T')[0] || '',
            contractEndDate: client.contractEndDate?.split('T')[0] || '',
            accountManagerId: client.accountManagerId || '',
            internalNotes: client.internalNotes || '',
          });
        } else {
          toast.error('Failed to load client data');
          router.push('/admin/clients');
        }
      } catch (error) {
        console.error('Load client error:', error);
        toast.error('Failed to load client data');
        router.push('/admin/clients');
      } finally {
        setLoading(false);
      }
    };

    loadClient();
  }, [clientId, router]);

  const handleInputChange = (field: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Basic Info - Company Name and Tax ID required
        return !!(
          formData.companyName &&
          formData.taxId &&
          formData.companyName.trim() !== '' &&
          formData.taxId.trim() !== ''
        );
      case 2: // Contacts - Name, Email, Phone required
        return !!(
          formData.contactName &&
          formData.contactEmail &&
          formData.contactPhone &&
          formData.contactName.trim() !== '' &&
          formData.contactEmail.trim() !== '' &&
          formData.contactPhone.trim() !== ''
        );
      case 3: // Address & Billing - all optional
        return true;
      case 4: // Additional Details - all optional
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

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Client updated successfully!');
        router.push(`/admin/clients/${clientId}`);
      } else {
        toast.error(data.error || 'Failed to update client', {
          description: data.details ? JSON.stringify(data.details) : undefined,
        });
      }
    } catch (error) {
      console.error('Update client error:', error);
      toast.error('Network error', {
        description: 'Please check your connection and try again',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading client data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push(`/admin/clients/${clientId}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Client Details
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Edit Client
          </h1>
          <p className="text-gray-600 mt-2">Update client information</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      currentStep >= step.number
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs mt-2 font-medium">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 transition-all ${
                      currentStep > step.number ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>{steps[currentStep - 1].title}</CardTitle>
              <CardDescription>
                {currentStep === 1 && 'Enter the basic company information'}
                {currentStep === 2 && 'Add primary and secondary contact details'}
                {currentStep === 3 && 'Provide address and billing information'}
                {currentStep === 4 && 'Add contract and additional details'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">
                        Company Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => handleInputChange('companyName', e.target.value)}
                        placeholder="Enter company name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxId">
                        Tax ID / Registration Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="taxId"
                        value={formData.taxId}
                        onChange={(e) => handleInputChange('taxId', e.target.value)}
                        placeholder="Enter tax ID"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Technology">Technology</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                          <SelectItem value="Healthcare">Healthcare</SelectItem>
                          <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="Retail">Retail</SelectItem>
                          <SelectItem value="Education">Education</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companySize">Company Size</Label>
                      <Select value={formData.companySize} onValueChange={(value) => handleInputChange('companySize', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10 employees</SelectItem>
                          <SelectItem value="11-50">11-50 employees</SelectItem>
                          <SelectItem value="51-200">51-200 employees</SelectItem>
                          <SelectItem value="201-500">201-500 employees</SelectItem>
                          <SelectItem value="501-1000">501-1000 employees</SelectItem>
                          <SelectItem value="1000+">1000+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://example.com"
                      type="url"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Contacts */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Primary Contact</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contactName">
                            Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="contactName"
                            value={formData.contactName}
                            onChange={(e) => handleInputChange('contactName', e.target.value)}
                            placeholder="Enter contact name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactDesignation">Designation</Label>
                          <Input
                            id="contactDesignation"
                            value={formData.contactDesignation}
                            onChange={(e) => handleInputChange('contactDesignation', e.target.value)}
                            placeholder="Enter designation"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contactEmail">
                            Email <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="contactEmail"
                            type="email"
                            value={formData.contactEmail}
                            onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                            placeholder="email@example.com"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactPhone">
                            Phone <span className="text-red-500">*</span>
                          </Label>
                          <PhoneInput
                            id="contactPhone"
                            value={formData.contactPhone || ''}
                            onChange={(value) => handleInputChange('contactPhone', value)}
                            placeholder="Phone number"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Secondary Contact (Optional)</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="secondaryContactName">Name</Label>
                          <Input
                            id="secondaryContactName"
                            value={formData.secondaryContactName}
                            onChange={(e) => handleInputChange('secondaryContactName', e.target.value)}
                            placeholder="Enter contact name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="secondaryContactDesignation">Designation</Label>
                          <Input
                            id="secondaryContactDesignation"
                            value={formData.secondaryContactDesignation}
                            onChange={(e) => handleInputChange('secondaryContactDesignation', e.target.value)}
                            placeholder="Enter designation"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="secondaryContactEmail">Email</Label>
                          <Input
                            id="secondaryContactEmail"
                            type="email"
                            value={formData.secondaryContactEmail}
                            onChange={(e) => handleInputChange('secondaryContactEmail', e.target.value)}
                            placeholder="email@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="secondaryContactPhone">Phone</Label>
                          <PhoneInput
                            id="secondaryContactPhone"
                            value={formData.secondaryContactPhone || ''}
                            onChange={(value) => handleInputChange('secondaryContactPhone', value)}
                            placeholder="Phone number"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Address & Billing */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Address</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="addressLine1">Address Line 1</Label>
                        <Input
                          id="addressLine1"
                          value={formData.addressLine1}
                          onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                          placeholder="Street address"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="addressLine2">Address Line 2</Label>
                        <Input
                          id="addressLine2"
                          value={formData.addressLine2}
                          onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                          placeholder="Apartment, suite, etc."
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                            placeholder="Enter city"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State / Province</Label>
                          <Input
                            id="state"
                            value={formData.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                            placeholder="Enter state"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="postalCode">Postal Code</Label>
                          <Input
                            id="postalCode"
                            value={formData.postalCode}
                            onChange={(e) => handleInputChange('postalCode', e.target.value)}
                            placeholder="Enter postal code"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country</Label>
                          <Input
                            id="country"
                            value={formData.country}
                            onChange={(e) => handleInputChange('country', e.target.value)}
                            placeholder="Enter country"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Billing Information</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="billingEmail">Billing Email</Label>
                          <Input
                            id="billingEmail"
                            type="email"
                            value={formData.billingEmail}
                            onChange={(e) => handleInputChange('billingEmail', e.target.value)}
                            placeholder="billing@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currency">Currency</Label>
                          <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="INR">INR (₹)</SelectItem>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="GBP">GBP (£)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="paymentTerms">Payment Terms</Label>
                        <Select value={formData.paymentTerms} onValueChange={(value) => handleInputChange('paymentTerms', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment terms" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NET_15">Net 15</SelectItem>
                            <SelectItem value="NET_30">Net 30</SelectItem>
                            <SelectItem value="NET_45">Net 45</SelectItem>
                            <SelectItem value="NET_60">Net 60</SelectItem>
                            <SelectItem value="IMMEDIATE">Immediate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Additional Details */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contractValue">Contract Value</Label>
                      <Input
                        id="contractValue"
                        type="number"
                        value={formData.contractValue}
                        onChange={(e) => handleInputChange('contractValue', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountManagerId">Account Manager</Label>
                      <Input
                        id="accountManagerId"
                        value={formData.accountManagerId}
                        onChange={(e) => handleInputChange('accountManagerId', e.target.value)}
                        placeholder="Enter account manager ID (optional)"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contractStartDate">Contract Start Date</Label>
                      <Input
                        id="contractStartDate"
                        type="date"
                        value={formData.contractStartDate}
                        onChange={(e) => handleInputChange('contractStartDate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contractEndDate">Contract End Date</Label>
                      <Input
                        id="contractEndDate"
                        type="date"
                        value={formData.contractEndDate}
                        onChange={(e) => handleInputChange('contractEndDate', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="internalNotes">Internal Notes</Label>
                    <Textarea
                      id="internalNotes"
                      value={formData.internalNotes}
                      onChange={(e) => handleInputChange('internalNotes', e.target.value)}
                      placeholder="Add any internal notes or comments..."
                      rows={4}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Navigation Buttons */}
        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-4">
            {currentStep < 4 ? (
              <Button
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting || !validateStep(currentStep)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update Client
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
