'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, Upload, Check, FileText, IdCard, Home, X, CloudUpload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PhoneInput } from '@/components/ui/phone-input';
import { toast } from 'sonner';

// Step 1: Personal Information
function Step1PersonalInfo({ formData, onChange }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Please provide your personal details. Fields marked with * are required.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            required
            disabled
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="middleName">Middle Name</Label>
          <Input
            id="middleName"
            placeholder="Optional"
            value={formData.middleName}
            onChange={(e) => onChange('middleName', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
            required
            disabled
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="preferredName">Preferred Name</Label>
          <Input
            id="preferredName"
            placeholder="How should we call you?"
            value={formData.preferredName}
            onChange={(e) => onChange('preferredName', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth * (Minimum age: 20 years)</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => onChange('dateOfBirth', e.target.value)}
            max={(() => {
              const today = new Date();
              const maxDate = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
              return maxDate.toISOString().split('T')[0];
            })()}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="gender">Gender *</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => onChange('gender', value)}
            required
          >
            <SelectTrigger>
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
          <Label htmlFor="bloodGroup">Blood Group</Label>
          <Input
            id="bloodGroup"
            placeholder="e.g., O+, A-, B+"
            value={formData.bloodGroup}
            onChange={(e) => onChange('bloodGroup', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="personalEmail">Personal Email</Label>
          <Input
            id="personalEmail"
            type="email"
            placeholder="personal@example.com"
            value={formData.personalEmail}
            onChange={(e) => onChange('personalEmail', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="personalPhone">Personal Phone *</Label>
          <PhoneInput
            id="personalPhone"
            value={formData.personalPhone || ''}
            onChange={(value) => onChange('personalPhone', value)}
            placeholder="9876543210"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="alternatePhone">Alternate Phone</Label>
        <PhoneInput
          id="alternatePhone"
          value={formData.alternatePhone || ''}
          onChange={(value) => onChange('alternatePhone', value)}
          placeholder="Optional alternate number"
        />
      </div>
    </div>
  );
}

// Step 2: Address Information
function Step2AddressInfo({ formData, onChange }: any) {
  const handleAddressChange = (type: 'current' | 'permanent', field: string, value: string) => {
    const address = formData[`${type}Address`] || {};
    onChange(`${type}Address`, { ...address, [field]: value });
  };

  const handleSameAsCurrentChange = (checked: boolean) => {
    onChange('sameAsCurrentAddress', checked);
    if (checked) {
      onChange('permanentAddress', formData.currentAddress);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Address Information</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Please provide your current and permanent address details.
        </p>
      </div>

      {/* Current Address */}
      <div className="space-y-4">
        <h4 className="font-medium">Current Address *</h4>

        <div className="space-y-2">
          <Label htmlFor="currentStreet">Street Address</Label>
          <Input
            id="currentStreet"
            placeholder="House No, Street Name"
            value={formData.currentAddress?.street || ''}
            onChange={(e) => handleAddressChange('current', 'street', e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currentCity">City</Label>
            <Input
              id="currentCity"
              placeholder="City"
              value={formData.currentAddress?.city || ''}
              onChange={(e) => handleAddressChange('current', 'city', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentState">State</Label>
            <Input
              id="currentState"
              placeholder="State"
              value={formData.currentAddress?.state || ''}
              onChange={(e) => handleAddressChange('current', 'state', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currentPincode">Pincode</Label>
            <Input
              id="currentPincode"
              placeholder="123456"
              value={formData.currentAddress?.pincode || ''}
              onChange={(e) => handleAddressChange('current', 'pincode', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentCountry">Country</Label>
            <Input
              id="currentCountry"
              placeholder="India"
              value={formData.currentAddress?.country || ''}
              onChange={(e) => handleAddressChange('current', 'country', e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      {/* Same as Current Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="sameAsCurrentAddress"
          checked={formData.sameAsCurrentAddress}
          onCheckedChange={handleSameAsCurrentChange}
        />
        <Label htmlFor="sameAsCurrentAddress" className="cursor-pointer">
          Permanent address is same as current address
        </Label>
      </div>

      {/* Permanent Address */}
      {!formData.sameAsCurrentAddress && (
        <div className="space-y-4">
          <h4 className="font-medium">Permanent Address *</h4>

          <div className="space-y-2">
            <Label htmlFor="permanentStreet">Street Address</Label>
            <Input
              id="permanentStreet"
              placeholder="House No, Street Name"
              value={formData.permanentAddress?.street || ''}
              onChange={(e) => handleAddressChange('permanent', 'street', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="permanentCity">City</Label>
              <Input
                id="permanentCity"
                placeholder="City"
                value={formData.permanentAddress?.city || ''}
                onChange={(e) => handleAddressChange('permanent', 'city', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="permanentState">State</Label>
              <Input
                id="permanentState"
                placeholder="State"
                value={formData.permanentAddress?.state || ''}
                onChange={(e) => handleAddressChange('permanent', 'state', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="permanentPincode">Pincode</Label>
              <Input
                id="permanentPincode"
                placeholder="123456"
                value={formData.permanentAddress?.pincode || ''}
                onChange={(e) => handleAddressChange('permanent', 'pincode', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="permanentCountry">Country</Label>
              <Input
                id="permanentCountry"
                placeholder="India"
                value={formData.permanentAddress?.country || ''}
                onChange={(e) => handleAddressChange('permanent', 'country', e.target.value)}
                required
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Step 3: Professional Information
function Step3ProfessionalInfo({ formData, onChange }: any) {
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Common skills database
  const commonSkills = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'C++', 'C#',
    'HTML', 'CSS', 'Angular', 'Vue.js', 'Next.js', 'Express.js', 'Django', 'Flask',
    'SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'AWS', 'Azure', 'GCP',
    'Docker', 'Kubernetes', 'Git', 'CI/CD', 'REST API', 'GraphQL', 'Microservices',
    'Agile', 'Scrum', 'Project Management', 'Leadership', 'Communication', 'Problem Solving',
    'Data Analysis', 'Machine Learning', 'AI', 'Deep Learning', 'TensorFlow', 'PyTorch',
    'UI/UX Design', 'Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'Product Design',
    'Marketing', 'SEO', 'Content Writing', 'Social Media', 'Sales', 'Customer Service',
    'Accounting', 'Finance', 'Business Analysis', 'Data Science', 'DevOps', 'Testing',
  ];

  const handleSkillInputChange = (value: string) => {
    if (value.trim().length > 0) {
      const filtered = commonSkills.filter(skill =>
        skill.toLowerCase().includes(value.toLowerCase()) &&
        !(formData.skills || []).includes(skill)
      ).slice(0, 8);
      setSkillSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSkillSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const addSkill = (skill: string, inputElement?: HTMLInputElement) => {
    if (skill && !(formData.skills || []).includes(skill)) {
      onChange('skills', [...(formData.skills || []), skill]);
      if (inputElement) {
        inputElement.value = '';
      }
      setShowSuggestions(false);
      setSkillSuggestions([]);
      toast.success('Skill added');
    } else if ((formData.skills || []).includes(skill)) {
      toast.info('Skill already added');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Professional Information</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Tell us about your educational background and work experience.
        </p>
      </div>

      {/* Education */}
      <div className="space-y-4">
        <h4 className="font-medium">Education</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="highestQualification">Highest Qualification *</Label>
            <Input
              id="highestQualification"
              placeholder="e.g., Bachelor's in Computer Science"
              value={formData.highestQualification}
              onChange={(e) => onChange('highestQualification', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="university">University/Institution *</Label>
            <Input
              id="university"
              placeholder="University name"
              value={formData.university}
              onChange={(e) => onChange('university', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="yearOfPassing">Year of Passing *</Label>
          <Select
            value={formData.yearOfPassing?.toString()}
            onValueChange={(value) => onChange('yearOfPassing', parseInt(value))}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Work Experience */}
      <div className="space-y-4">
        <h4 className="font-medium">Work Experience</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="yearsOfExperience">Years of Experience *</Label>
            <Select
              value={formData.yearsOfExperience?.toString()}
              onValueChange={(value) => onChange('yearsOfExperience', parseInt(value))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Fresher</SelectItem>
                {Array.from({ length: 50 }, (_, i) => i + 1).map((years) => (
                  <SelectItem key={years} value={years.toString()}>
                    {years} {years === 1 ? 'Year' : 'Years'}
                  </SelectItem>
                ))}
                <SelectItem value="50">50+ Years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="previousCompany">Previous Company</Label>
            <Input
              id="previousCompany"
              placeholder="Company name"
              value={formData.previousCompany}
              onChange={(e) => onChange('previousCompany', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Skills & Expertise</Label>
          <div className="space-y-3">
            <div className="relative">
              <div className="flex gap-2">
                <Input
                  id="skill-input"
                  placeholder="Start typing to see suggestions (e.g. React, Python, Design)"
                  onChange={(e) => handleSkillInputChange(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.currentTarget as HTMLInputElement;
                      const skillValue = input.value.trim();
                      addSkill(skillValue, input);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding suggestions to allow clicking on them
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  onFocus={(e) => handleSkillInputChange(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const input = document.getElementById('skill-input') as HTMLInputElement;
                    const skillValue = input?.value.trim();
                    addSkill(skillValue, input);
                  }}
                >
                  + Add
                </Button>
              </div>

              {/* Auto-suggest dropdown */}
              {showSuggestions && skillSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  {skillSuggestions.map((skill, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="w-full text-left px-4 py-2 hover:bg-primary/10 transition-colors text-sm border-b last:border-b-0"
                      onClick={() => {
                        const input = document.getElementById('skill-input') as HTMLInputElement;
                        addSkill(skill, input);
                      }}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-slate-50">
              {formData.skills && formData.skills.length > 0 ? (
                formData.skills.map((skill: string, idx: number) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-slate-200 transition-colors"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => {
                        const updatedSkills = (formData.skills || []).filter((s: string) => s !== skill);
                        onChange('skills', updatedSkills);
                        toast.success('Skill removed');
                      }}
                      className="ml-1 hover:text-red-600 transition-colors text-lg leading-none"
                    >
                      ×
                    </button>
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-slate-500">No skills added yet. Use the input above to add skills.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="space-y-4">
        <h4 className="font-medium">Professional Links</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
            <Input
              id="linkedinUrl"
              type="url"
              placeholder="https://linkedin.com/in/username"
              value={formData.linkedinUrl}
              onChange={(e) => onChange('linkedinUrl', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="githubUrl">GitHub Profile</Label>
            <Input
              id="githubUrl"
              type="url"
              placeholder="https://github.com/username"
              value={formData.githubUrl}
              onChange={(e) => onChange('githubUrl', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="space-y-4">
        <h4 className="font-medium">Emergency Contact</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="emergencyContactName">Contact Name *</Label>
            <Input
              id="emergencyContactName"
              placeholder="Full name"
              value={formData.emergencyContactName}
              onChange={(e) => onChange('emergencyContactName', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergencyRelationship">Relationship *</Label>
            <Input
              id="emergencyRelationship"
              placeholder="e.g., Spouse, Parent"
              value={formData.emergencyRelationship}
              onChange={(e) => onChange('emergencyRelationship', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="emergencyPhone">Phone Number *</Label>
            <PhoneInput
              id="emergencyPhone"
              value={formData.emergencyPhone || ''}
              onChange={(value) => onChange('emergencyPhone', value)}
              placeholder="Phone number"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergencyAlternatePhone">Alternate Phone</Label>
            <PhoneInput
              id="emergencyAlternatePhone"
              value={formData.emergencyAlternatePhone || ''}
              onChange={(value) => onChange('emergencyAlternatePhone', value)}
              placeholder="Phone number"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 4: Documents & Declarations
function Step4DocumentsDeclarations({ formData, onChange, token }: any) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});

  const validateFile = (file: File, field: string): string | null => {
    // File size validation (10MB max for all documents)
    const maxSize = 10;
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }

    // File type validation - now accepting JPG, PDF, and Word documents
    const allowedTypes: {[key: string]: string[]} = {
      resumeUrl: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
      photoIdUrl: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
      addressProofUrl: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
      cancelledChequeUrl: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
      educationCertsUrl: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
      experienceLettersUrl: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
      panCardUrl: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
      aadhaarCardUrl: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
    };

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (field in allowedTypes && extension && !allowedTypes[field].includes(extension)) {
      return `Only ${allowedTypes[field].join(', ').toUpperCase()} files are allowed`;
    }

    return null;
  };

  const handleFileUpload = async (field: string, file: File) => {
    // Validate file
    const error = validateFile(file, field);
    if (error) {
      toast.error(error);
      return;
    }

    setUploading(field);
    setUploadProgress({...uploadProgress, [field]: 0});

    try {
      // Create form data with file and token
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('token', token);

      // All onboarding documents use EMPLOYEE_DOCUMENT category
      uploadFormData.append('category', 'EMPLOYEE_DOCUMENT');

      // Add description for better categorization in S3
      let description = field.replace('Url', '').replace(/([A-Z])/g, ' $1').trim();
      uploadFormData.append('description', description);

      // Simulate progress (since fetch doesn't support progress events easily)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[field] || 0;
          if (current < 90) {
            return {...prev, [field]: current + 10};
          }
          return prev;
        });
      }, 200);

      // Upload to S3
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      clearInterval(progressInterval);
      setUploadProgress({...uploadProgress, [field]: 100});

      const data = await response.json();

      if (data.success) {
        onChange(field, data.data.fileUrl);
        toast.success(`${file.name} uploaded successfully`);
      } else {
        toast.error(data.error || 'Failed to upload file');
        setUploadProgress({...uploadProgress, [field]: 0});
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('An error occurred while uploading file');
      setUploadProgress({...uploadProgress, [field]: 0});
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Documents & Declarations</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Upload required documents and complete the declarations.
        </p>
      </div>

      {/* Required Documents */}
      <div className="space-y-6">
        <div>
          <h4 className="text-lg font-semibold mb-2">Required Documents</h4>
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              Upload clear, valid documents. Accepted formats: PDF, DOC, DOCX, JPG, PNG. Max file size: 10MB. All required documents must be uploaded to proceed.
            </AlertDescription>
          </Alert>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Resume */}
          <Card className={`relative overflow-hidden transition-all duration-300 ${
            formData.resumeUrl
              ? 'border-2 border-green-500 shadow-[0_2px_8px_rgba(34,197,94,0.1),0_4px_16px_rgba(34,197,94,0.15),0_8px_24px_rgba(34,197,94,0.2)]'
              : uploading === 'resumeUrl'
              ? 'border-2 border-primary shadow-[0_2px_8px_rgba(99,102,241,0.1),0_4px_16px_rgba(99,102,241,0.15),0_8px_24px_rgba(99,102,241,0.2)]'
              : 'border hover:border-primary/50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.08)]'
          }`}>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                {/* Icon */}
                <div className={`relative p-4 rounded-full transition-all ${
                  formData.resumeUrl
                    ? 'bg-green-100 ring-4 ring-green-50'
                    : 'bg-primary/10 ring-4 ring-primary/5'
                }`}>
                  {formData.resumeUrl ? (
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  ) : (
                    <FileText className="h-8 w-8 text-primary" />
                  )}
                  {!formData.resumeUrl && (
                    <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                      *
                    </div>
                  )}
                </div>

                {/* Title & Info */}
                <div className="space-y-1.5">
                  <h5 className="font-semibold text-base">Resume/CV</h5>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    <Badge variant="secondary" className="text-xs">PDF</Badge>
                    <Badge variant="secondary" className="text-xs">DOC</Badge>
                    <Badge variant="secondary" className="text-xs">DOCX</Badge>
                    <Badge variant="secondary" className="text-xs">JPG</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Max 10MB</p>
                </div>

                {/* Upload Button */}
                {!formData.resumeUrl && !uploading && (
                  <label htmlFor="resumeUrl" className="w-full cursor-pointer">
                    <Button variant="outline" className="w-full gap-2" asChild>
                      <div>
                        <CloudUpload className="h-4 w-4" />
                        Choose File
                      </div>
                    </Button>
                    <Input
                      id="resumeUrl"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload('resumeUrl', e.target.files[0])}
                      disabled={uploading === 'resumeUrl'}
                      className="hidden"
                    />
                  </label>
                )}

                {/* Progress */}
                {uploading === 'resumeUrl' && uploadProgress.resumeUrl !== undefined && (
                  <div className="w-full space-y-2">
                    <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300 relative overflow-hidden"
                        style={{width: `${uploadProgress.resumeUrl}%`}}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Uploading... {uploadProgress.resumeUrl}%</span>
                    </div>
                  </div>
                )}

                {/* Success */}
                {formData.resumeUrl && (
                  <div className="w-full">
                    <Badge variant="default" className="w-full bg-green-600 hover:bg-green-700 justify-center gap-2 py-2">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Uploaded Successfully
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Photo ID */}
          <Card className={`relative overflow-hidden transition-all duration-300 ${
            formData.photoIdUrl
              ? 'border-2 border-green-500 shadow-[0_2px_8px_rgba(34,197,94,0.1),0_4px_16px_rgba(34,197,94,0.15),0_8px_24px_rgba(34,197,94,0.2)]'
              : uploading === 'photoIdUrl'
              ? 'border-2 border-primary shadow-[0_2px_8px_rgba(99,102,241,0.1),0_4px_16px_rgba(99,102,241,0.15),0_8px_24px_rgba(99,102,241,0.2)]'
              : 'border hover:border-primary/50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.08)]'
          }`}>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`relative p-4 rounded-full transition-all ${
                  formData.photoIdUrl
                    ? 'bg-green-100 ring-4 ring-green-50'
                    : 'bg-primary/10 ring-4 ring-primary/5'
                }`}>
                  {formData.photoIdUrl ? (
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  ) : (
                    <IdCard className="h-8 w-8 text-primary" />
                  )}
                  {!formData.photoIdUrl && (
                    <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                      *
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h5 className="font-semibold text-base">Photo ID</h5>
                  <p className="text-xs text-muted-foreground">Aadhar/Passport/DL</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    <Badge variant="secondary" className="text-xs">PDF</Badge>
                    <Badge variant="secondary" className="text-xs">DOC</Badge>
                    <Badge variant="secondary" className="text-xs">JPG</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Max 10MB</p>
                </div>

                {!formData.photoIdUrl && !uploading && (
                  <label htmlFor="photoIdUrl" className="w-full cursor-pointer">
                    <Button variant="outline" className="w-full gap-2" asChild>
                      <div>
                        <CloudUpload className="h-4 w-4" />
                        Choose File
                      </div>
                    </Button>
                    <Input
                      id="photoIdUrl"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload('photoIdUrl', e.target.files[0])}
                      disabled={uploading === 'photoIdUrl'}
                      className="hidden"
                    />
                  </label>
                )}

                {uploading === 'photoIdUrl' && uploadProgress.photoIdUrl !== undefined && (
                  <div className="w-full space-y-2">
                    <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300 relative overflow-hidden"
                        style={{width: `${uploadProgress.photoIdUrl}%`}}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Uploading... {uploadProgress.photoIdUrl}%</span>
                    </div>
                  </div>
                )}

                {formData.photoIdUrl && (
                  <div className="w-full">
                    <Badge variant="default" className="w-full bg-green-600 hover:bg-green-700 justify-center gap-2 py-2">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Uploaded Successfully
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address Proof */}
          <Card className={`relative overflow-hidden transition-all duration-300 ${
            formData.addressProofUrl
              ? 'border-2 border-green-500 shadow-[0_2px_8px_rgba(34,197,94,0.1),0_4px_16px_rgba(34,197,94,0.15),0_8px_24px_rgba(34,197,94,0.2)]'
              : uploading === 'addressProofUrl'
              ? 'border-2 border-primary shadow-[0_2px_8px_rgba(99,102,241,0.1),0_4px_16px_rgba(99,102,241,0.15),0_8px_24px_rgba(99,102,241,0.2)]'
              : 'border hover:border-primary/50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.08)]'
          }`}>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`relative p-4 rounded-full transition-all ${
                  formData.addressProofUrl
                    ? 'bg-green-100 ring-4 ring-green-50'
                    : 'bg-primary/10 ring-4 ring-primary/5'
                }`}>
                  {formData.addressProofUrl ? (
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  ) : (
                    <Home className="h-8 w-8 text-primary" />
                  )}
                  {!formData.addressProofUrl && (
                    <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                      *
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h5 className="font-semibold text-base">Address Proof</h5>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    <Badge variant="secondary" className="text-xs">PDF</Badge>
                    <Badge variant="secondary" className="text-xs">DOC</Badge>
                    <Badge variant="secondary" className="text-xs">JPG</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Max 10MB</p>
                </div>

                {!formData.addressProofUrl && !uploading && (
                  <label htmlFor="addressProofUrl" className="w-full cursor-pointer">
                    <Button variant="outline" className="w-full gap-2" asChild>
                      <div>
                        <CloudUpload className="h-4 w-4" />
                        Choose File
                      </div>
                    </Button>
                    <Input
                      id="addressProofUrl"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload('addressProofUrl', e.target.files[0])}
                      disabled={uploading === 'addressProofUrl'}
                      className="hidden"
                    />
                  </label>
                )}

                {uploading === 'addressProofUrl' && uploadProgress.addressProofUrl !== undefined && (
                  <div className="w-full space-y-2">
                    <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300 relative overflow-hidden"
                        style={{width: `${uploadProgress.addressProofUrl}%`}}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Uploading... {uploadProgress.addressProofUrl}%</span>
                    </div>
                  </div>
                )}

                {formData.addressProofUrl && (
                  <div className="w-full">
                    <Badge variant="default" className="w-full bg-green-600 hover:bg-green-700 justify-center gap-2 py-2">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Uploaded Successfully
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bank Details (Optional) */}
      <div className="space-y-4">
        <h4 className="font-medium">Bank Details (Optional)</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="accountHolderName">Account Holder Name</Label>
            <Input
              id="accountHolderName"
              placeholder="As per bank records"
              value={formData.accountHolderName}
              onChange={(e) => onChange('accountHolderName', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              placeholder="Account number"
              value={formData.accountNumber}
              onChange={(e) => onChange('accountNumber', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              placeholder="Bank name"
              value={formData.bankName}
              onChange={(e) => onChange('bankName', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ifscCode">IFSC Code</Label>
            <Input
              id="ifscCode"
              placeholder="IFSC code"
              value={formData.ifscCode}
              onChange={(e) => onChange('ifscCode', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchName">Branch Name</Label>
            <Input
              id="branchName"
              placeholder="Branch name"
              value={formData.branchName}
              onChange={(e) => onChange('branchName', e.target.value)}
            />
          </div>
        </div>

        <div className={`border-2 border-dashed rounded-lg p-4 transition-all ${
          formData.cancelledChequeUrl
            ? 'border-green-500 bg-green-50/50'
            : uploading === 'cancelledChequeUrl'
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-primary hover:bg-gray-50'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-full flex-shrink-0 ${
              formData.cancelledChequeUrl
                ? 'bg-green-100'
                : 'bg-primary/10'
            }`}>
              {formData.cancelledChequeUrl ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <FileText className="h-5 w-5 text-primary" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Cancelled Cheque (Optional)</p>
              <p className="text-xs text-muted-foreground">PDF, DOC, JPG • Max 10MB</p>
            </div>

            {!formData.cancelledChequeUrl && !uploading && (
              <label htmlFor="cancelledChequeUrl" className="cursor-pointer flex-shrink-0">
                <div className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors">
                  Choose File
                </div>
                <Input
                  id="cancelledChequeUrl"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload('cancelledChequeUrl', e.target.files[0])}
                  disabled={uploading === 'cancelledChequeUrl'}
                  className="hidden"
                />
              </label>
            )}

            {formData.cancelledChequeUrl && (
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium flex-shrink-0">
                <CheckCircle2 className="h-4 w-4" />
                <span>Uploaded</span>
              </div>
            )}
          </div>

          {uploading === 'cancelledChequeUrl' && uploadProgress.cancelledChequeUrl !== undefined && (
            <div className="mt-4 space-y-2">
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{width: `${uploadProgress.cancelledChequeUrl}%`}}
                />
              </div>
              <p className="text-xs text-muted-foreground">Uploading... {uploadProgress.cancelledChequeUrl}%</p>
            </div>
          )}
        </div>
      </div>

      {/* Declarations */}
      <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium">Declarations *</h4>

        <div className="space-y-3">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="informationAccurate"
              checked={formData.informationAccurate}
              onCheckedChange={(checked) => onChange('informationAccurate', checked)}
              required
            />
            <Label htmlFor="informationAccurate" className="cursor-pointer text-sm">
              I hereby declare that all the information provided above is true and accurate to the best of my knowledge.
            </Label>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="agreeToPolocies"
              checked={formData.agreeToPolocies}
              onCheckedChange={(checked) => onChange('agreeToPolocies', checked)}
              required
            />
            <Label htmlFor="agreeToPolocies" className="cursor-pointer text-sm">
              I agree to abide by the company's policies, rules, and regulations.
            </Label>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="consentVerification"
              checked={formData.consentVerification}
              onCheckedChange={(checked) => onChange('consentVerification', checked)}
              required
            />
            <Label htmlFor="consentVerification" className="cursor-pointer text-sm">
              I consent to background verification and reference checks as deemed necessary by the company.
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [inviteData, setInviteData] = useState<any>(null);

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
    profilePhotoUrl: '',
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
    { number: 1, title: 'Personal Info', component: Step1PersonalInfo },
    { number: 2, title: 'Address', component: Step2AddressInfo },
    { number: 3, title: 'Professional', component: Step3ProfessionalInfo },
    { number: 4, title: 'Documents', component: Step4DocumentsDeclarations },
  ];

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

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      // Clean up empty optional fields to avoid validation errors
      const submitData = {
        ...formData,
        token,
        // Keep date as YYYY-MM-DD format (API now accepts it)
        personalEmail: formData.personalEmail || undefined,
        linkedinUrl: formData.linkedinUrl || undefined,
        githubUrl: formData.githubUrl || undefined,
        profilePhotoUrl: formData.profilePhotoUrl || undefined,
        cancelledChequeUrl: formData.cancelledChequeUrl || undefined,
      };

      const response = await fetch('/api/onboard/submit-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Onboarding submitted successfully!');
        toast.info('HR will review your information and approve your access.');
        router.push('/onboard/success');
      } else {
        toast.error(data.error || 'Failed to submit onboarding');
        // Show validation errors if available
        if (data.errors) {
          data.errors.forEach((err: any) => {
            toast.error(`${err.field}: ${err.message}`);
          });
        }
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading your onboarding...</p>
        </div>
      </div>
    );
  }

  const CurrentStepComponent = steps[currentStep - 1].component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="relative z-10 min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto py-6 sm:py-8 lg:py-12">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-block mb-6">
              <div className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-3">
                  Welcome Aboard!
                </h1>
              </div>
              <div className="h-1 w-32 mx-auto bg-gradient-to-r from-primary via-purple-600 to-primary rounded-full"></div>
            </div>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Complete your onboarding with <span className="font-semibold text-foreground">{inviteData?.tenant.name}</span>
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8 sm:mb-12">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.08)]">
              <div className="flex justify-between items-start">
                {steps.map((step, index) => (
                  <div key={step.number} className="flex flex-col items-center" style={{ flex: index < steps.length - 1 ? '1 1 0%' : '0 0 auto' }}>
                    <div className="flex items-center w-full">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full font-semibold text-sm sm:text-base transition-all duration-300 ${
                            currentStep >= step.number
                              ? 'bg-gradient-to-br from-primary to-purple-600 text-white shadow-[0_2px_8px_rgba(99,102,241,0.3),0_4px_16px_rgba(147,51,234,0.2)]'
                              : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                          }`}
                        >
                          {currentStep > step.number ? (
                            <CheckCircle2 className="h-6 w-6 sm:h-7 sm:w-7" />
                          ) : (
                            <span>{step.number}</span>
                          )}
                        </div>
                        <p className={`text-xs sm:text-sm font-medium mt-3 whitespace-nowrap transition-colors ${
                          currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
                        }`}>{step.title}</p>
                      </div>
                      {step.number < steps.length && (
                        <div
                          className={`h-0.5 sm:h-1 flex-1 rounded-full transition-all duration-500 ${
                            currentStep > step.number
                              ? 'bg-gradient-to-r from-primary to-purple-600'
                              : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form Card */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Card className="border-0 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.08),0_16px_48px_rgba(0,0,0,0.12)] bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50/50 to-white/50 backdrop-blur-sm pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    {steps[currentStep - 1].title}
                  </CardTitle>
                  <CardDescription className="mt-2 text-base">
                    Step {currentStep} of {steps.length} • Take your time and fill in accurate information
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="hidden sm:flex text-lg px-4 py-2">
                  {currentStep}/{steps.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <CurrentStepComponent formData={formData} onChange={handleChange} token={token} />

              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-10 pt-8 border-t">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="flex-1 shadow-sm hover:shadow-md transition-shadow"
                    onClick={handlePrevious}
                    disabled={submitting}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </Button>
                )}

                {currentStep < steps.length ? (
                  <Button
                    type="button"
                    size="lg"
                    className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
                    onClick={handleNext}
                  >
                    Next Step
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit for Review'
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
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
