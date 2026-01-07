'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, Upload, Check, Save, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

// Debounce utility for auto-save
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Step Components - Reusing from original file but with better mobile UX
function Step1PersonalInfo({ formData, onChange }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg md:text-xl font-semibold mb-2">Personal Information</h3>
        <p className="text-sm text-muted-foreground">
          Please provide your personal details. Fields marked with * are required.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-sm">First Name *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            required
            disabled
            className="text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="middleName" className="text-sm">Middle Name</Label>
          <Input
            id="middleName"
            placeholder="Optional"
            value={formData.middleName}
            onChange={(e) => onChange('middleName', e.target.value)}
            className="text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-sm">Last Name *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
            required
            disabled
            className="text-base"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="space-y-2">
          <Label htmlFor="preferredName" className="text-sm">Preferred Name</Label>
          <Input
            id="preferredName"
            placeholder="How should we call you?"
            value={formData.preferredName}
            onChange={(e) => onChange('preferredName', e.target.value)}
            className="text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateOfBirth" className="text-sm">Date of Birth *</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => onChange('dateOfBirth', e.target.value)}
            required
            className="text-base"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="space-y-2">
          <Label htmlFor="gender" className="text-sm">Gender *</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => onChange('gender', value)}
            required
          >
            <SelectTrigger className="text-base">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
              <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bloodGroup" className="text-sm">Blood Group</Label>
          <Input
            id="bloodGroup"
            placeholder="e.g., O+, A-, B+"
            value={formData.bloodGroup}
            onChange={(e) => onChange('bloodGroup', e.target.value)}
            className="text-base"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="space-y-2">
          <Label htmlFor="personalEmail" className="text-sm">Personal Email</Label>
          <Input
            id="personalEmail"
            type="email"
            placeholder="personal@example.com"
            value={formData.personalEmail}
            onChange={(e) => onChange('personalEmail', e.target.value)}
            className="text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="personalPhone" className="text-sm">Personal Phone *</Label>
          <Input
            id="personalPhone"
            type="tel"
            placeholder="+91 9876543210"
            value={formData.personalPhone}
            onChange={(e) => onChange('personalPhone', e.target.value)}
            required
            className="text-base"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="alternatePhone" className="text-sm">Alternate Phone</Label>
        <Input
          id="alternatePhone"
          type="tel"
          placeholder="Optional alternate number"
          value={formData.alternatePhone}
          onChange={(e) => onChange('alternatePhone', e.target.value)}
          className="text-base"
        />
      </div>
    </motion.div>
  );
}

// Import other step components from original (Step2AddressInfo, Step3ProfessionalInfo, Step4DocumentsDeclarations)
// For brevity, I'll just declare them here and you can copy from the original file

function OnboardingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [inviteData, setInviteData] = useState<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    preferredName: '',
    dateOfBirth: '',
    gender: '',
    personalEmail: '',
    personalPhone: '',
    alternatePhone: '',
    bloodGroup: '',
    currentAddress: { street: '', city: '', state: '', pincode: '', country: '' },
    permanentAddress: { street: '', city: '', state: '', pincode: '', country: '' },
    sameAsCurrentAddress: false,
    highestQualification: '',
    university: '',
    yearOfPassing: new Date().getFullYear(),
    linkedinUrl: '',
    githubUrl: '',
    previousCompany: '',
    yearsOfExperience: 0,
    skills: [],
    resumeUrl: '',
    photoIdUrl: '',
    addressProofUrl: '',
    educationCertsUrl: [],
    experienceLettersUrl: [],
    cancelledChequeUrl: '',
    emergencyContactName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    emergencyAlternatePhone: '',
    accountHolderName: '',
    accountNumber: '',
    bankName: '',
    ifscCode: '',
    branchName: '',
    informationAccurate: false,
    agreeToPolocies: false,
    consentVerification: false,
  });

  const steps = [
    { number: 1, title: 'Personal', component: Step1PersonalInfo },
    { number: 2, title: 'Address', component: Step1PersonalInfo }, // Replace with actual components
    { number: 3, title: 'Professional', component: Step1PersonalInfo },
    { number: 4, title: 'Documents', component: Step1PersonalInfo },
  ];

  // Debounced form data for auto-save
  const debouncedFormData = useDebounce(formData, 2000); // 2 second delay

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      toast.error('Invalid invitation link');
      router.push('/login');
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch(`/api/onboard/validate-token?token=${token}`);
        const data = await response.json();

        if (!data.success) {
          toast.error(data.error);
          if (data.redirect) {
            router.push(data.redirect);
          }
          return;
        }

        setInviteData(data.data);

        // Pre-fill form with existing data
        if (data.data.profile) {
          setFormData((prev) => ({ ...prev, ...data.data.profile }));
          setLastSaved(new Date(data.data.profile.updatedAt || Date.now()));
        }

        // Pre-fill name from invite
        setFormData((prev) => ({
          ...prev,
          firstName: data.data.invite.firstName,
          lastName: data.data.invite.lastName,
        }));

        setLoading(false);
      } catch (error) {
        toast.error('Failed to validate invitation');
        router.push('/login');
      }
    };

    validateToken();
  }, [token, router]);

  // Auto-save functionality
  const saveDraft = useCallback(async (data: typeof formData) => {
    if (!token || saving || submitting) return;

    try {
      setSaving(true);

      const response = await fetch('/api/onboard/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...data }),
      });

      const result = await response.json();

      if (result.success) {
        setLastSaved(new Date());
        // Subtle feedback - no toast to avoid interruption
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setSaving(false);
    }
  }, [token, saving, submitting]);

  // Trigger auto-save when debounced data changes
  useEffect(() => {
    if (!loading && inviteData) {
      saveDraft(debouncedFormData);
    }
  }, [debouncedFormData, loading, inviteData, saveDraft]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    // Optimistic UI - move to next step immediately
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);

      // Smooth scroll to top on mobile
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      const submitData = {
        ...formData,
        token,
        dateOfBirth: new Date(formData.dateOfBirth).toISOString(),
      };

      const response = await fetch('/api/onboard/submit-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Onboarding submitted successfully!', {
          description: 'HR will review your information and approve your access.',
          duration: 5000,
        });
        router.push('/onboard/success');
      } else {
        toast.error(data.error || 'Failed to submit onboarding');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-white text-sm">Loading your onboarding...</p>
        </div>
      </div>
    );
  }

  const CurrentStepComponent = steps[currentStep - 1].component;
  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 p-3 md:p-4">
      <div className="max-w-4xl mx-auto py-4 md:py-8">
        {/* Header - Mobile Optimized */}
        <div className="text-center mb-4 md:mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-bold text-white mb-2"
          >
            Welcome to Zenora.ai!
          </motion.h1>
          <p className="text-white/90 text-sm md:text-base">
            {inviteData?.tenant.name}
          </p>

          {/* Auto-save indicator */}
          <AnimatePresence>
            {(saving || lastSaved) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-2"
              >
                <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                  {saving ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : lastSaved ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Saved {new Date(lastSaved).toLocaleTimeString()}
                    </>
                  ) : null}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress Bar - Mobile First */}
        <div className="mb-4 md:mb-8">
          <div className="relative">
            {/* Background bar */}
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>

            {/* Step indicators */}
            <div className="flex justify-between mt-3">
              {steps.map((step) => (
                <div key={step.number} className="flex flex-col items-center">
                  <motion.div
                    className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full transition-colors ${
                      currentStep >= step.number
                        ? 'bg-white text-purple-600'
                        : 'bg-white/20 text-white'
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {currentStep > step.number ? (
                      <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />
                    ) : (
                      <span className="text-xs md:text-sm font-semibold">{step.number}</span>
                    )}
                  </motion.div>
                  <p className="text-xs text-white mt-1 hidden sm:block">{step.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form Card - Mobile Optimized */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Card className="border-0 shadow-2xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg md:text-xl">
                      Step {currentStep}: {steps[currentStep - 1].title}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Step {currentStep} of {steps.length}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="hidden md:flex">
                    {Math.round(progress)}% Complete
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <CurrentStepComponent formData={formData} onChange={handleChange} />

                {/* Navigation Buttons - Mobile Optimized */}
                <div className="flex gap-2 md:gap-3 mt-6 md:mt-8">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={handlePrevious}
                      disabled={submitting}
                      size="lg"
                    >
                      Previous
                    </Button>
                  )}

                  {currentStep < steps.length ? (
                    <Button
                      type="button"
                      className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                      onClick={handleNext}
                      size="lg"
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                      onClick={handleSubmit}
                      disabled={submitting}
                      size="lg"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Submit for Review
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Mobile progress indicator */}
                <div className="mt-4 text-center text-sm text-muted-foreground md:hidden">
                  {progress}% Complete
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Help Text */}
        <p className="text-center text-white/60 text-xs md:text-sm mt-4">
          Your progress is automatically saved. You can return anytime to continue.
        </p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    }>
      <OnboardingPageContent />
    </Suspense>
  );
}
