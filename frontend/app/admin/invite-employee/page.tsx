'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { COMMON_DESIGNATIONS, getDesignationsByDepartment } from '@/lib/form-data';

interface Department {
  id: string;
  name: string;
}

interface Manager {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return 'Admin';
    case 'MANAGER':
      return 'Manager';
    case 'HR':
      return 'HR';
    default:
      return role;
  }
};

export default function AdminInviteEmployeePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [filteredDesignations, setFilteredDesignations] = useState<string[]>(COMMON_DESIGNATIONS);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    departmentId: '',
    designation: '',
    joiningDate: '',
    managerId: '',
    employeeId: '',
    workLocation: '',
    employmentType: 'FULL_TIME',
  });
  const [customDesignation, setCustomDesignation] = useState('');

  // Fetch departments and managers
  useEffect(() => {
    const fetchData = async () => {
      setFetchError(null);
      try {
        // Fetch departments
        const deptResponse = await fetch('/api/admin/departments');
        if (!deptResponse.ok) {
          throw new Error('Failed to load departments');
        }
        const deptData = await deptResponse.json();
        setDepartments(deptData.data || []);

        // Fetch users with managerial roles (ADMIN, MANAGER, and HR)
        const managerResponse = await fetch('/api/admin/employees?role=ADMIN,MANAGER,HR');
        if (!managerResponse.ok) {
          throw new Error('Failed to load managers');
        }
        const managerData = await managerResponse.json();
        setManagers(managerData.data || []);

        // Pre-select manager from URL query param (from org-chart "Add Report")
        const managerIdFromUrl = searchParams.get('managerId');
        if (managerIdFromUrl && managerData.data?.some((m: Manager) => m.id === managerIdFromUrl)) {
          setFormData((prev) => ({ ...prev, managerId: managerIdFromUrl }));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load form data';
        setFetchError(message);
        toast.error(message);
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, [searchParams]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Name validation
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }

    // Department validation
    if (!formData.departmentId) {
      errors.departmentId = 'Please select a department';
    }

    // Designation validation
    if (!formData.designation && !customDesignation.trim()) {
      errors.designation = 'Please select or enter a designation';
    }

    // Joining date validation
    if (!formData.joiningDate) {
      errors.joiningDate = 'Joining date is required';
    }

    // Manager validation
    if (!formData.managerId) {
      errors.managerId = 'Please select a reporting manager';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    setLoading(true);

    try {
      // Use custom designation if provided, otherwise use selected designation
      const submitData = {
        ...formData,
        designation: customDesignation.trim() || formData.designation,
      };

      const response = await fetch('/api/hr/invite-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Employee invited successfully!');
        toast.info(`Invitation sent to ${formData.email}`);
        router.push('/admin/onboarding');
      } else {
        toast.error(data.error || 'Failed to invite employee', {
          description: data.details || undefined,
        });
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }

    // When department changes, update designation options
    if (field === 'departmentId') {
      const selectedDept = departments.find(d => d.id === value);
      if (selectedDept) {
        const designations = getDesignationsByDepartment(selectedDept.name);
        setFilteredDesignations(designations);
        // Clear designation and custom designation when department changes
        setFormData((prev) => ({ ...prev, designation: '' }));
        setCustomDesignation('');
      }
    }

    // When designation changes from dropdown, clear custom designation
    if (field === 'designation') {
      setCustomDesignation('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="relative z-10 min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto py-6 sm:py-8">
          {/* Back Button */}
          <Button
            variant="outline"
            size="lg"
            className="mb-6 shadow-sm hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Card className="border-0 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.08),0_16px_48px_rgba(0,0,0,0.12)] bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50/50 to-white/50 backdrop-blur-sm pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-primary to-purple-600 rounded-xl shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                      Invite New Employee
                    </CardTitle>
                    <CardDescription className="mt-1.5 text-base">
                      Fill in the employee details to send an onboarding invitation
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            <CardContent className="p-6 sm:p-8">
              {/* Fetch Error Banner */}
              {fetchError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">{fetchError}</p>
                    <p className="text-xs text-red-600 mt-1">Please refresh the page or try again later.</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Business Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john.doe@company.com"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className={validationErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                      {validationErrors.email && (
                        <p className="text-xs text-red-500">{validationErrors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="employeeId">Employee ID (Optional)</Label>
                      <Input
                        id="employeeId"
                        placeholder="EMP-XXX-001"
                        value={formData.employeeId}
                        onChange={(e) => handleChange('employeeId', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave blank to auto-generate
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                        className={validationErrors.firstName ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                      {validationErrors.firstName && (
                        <p className="text-xs text-red-500">{validationErrors.firstName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                        className={validationErrors.lastName ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                      {validationErrors.lastName && (
                        <p className="text-xs text-red-500">{validationErrors.lastName}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Job Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Job Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department">Department *</Label>
                      <Select
                        value={formData.departmentId}
                        onValueChange={(value) => handleChange('departmentId', value)}
                      >
                        <SelectTrigger className={validationErrors.departmentId ? 'border-red-500 focus:ring-red-500' : ''}>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {validationErrors.departmentId && (
                        <p className="text-xs text-red-500">{validationErrors.departmentId}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="designation">Role/Designation *</Label>
                      <Select
                        value={formData.designation}
                        onValueChange={(value) => handleChange('designation', value)}
                        disabled={!formData.departmentId || !!customDesignation.trim()}
                      >
                        <SelectTrigger className={validationErrors.designation && !customDesignation.trim() ? 'border-red-500 focus:ring-red-500' : ''}>
                          <SelectValue placeholder={formData.departmentId ? "Select designation" : "Select department first"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {filteredDesignations.map((designation) => (
                            <SelectItem key={designation} value={designation}>
                              {designation}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative">
                        <Input
                          placeholder="Or type custom designation"
                          value={customDesignation}
                          onChange={(e) => {
                            setCustomDesignation(e.target.value);
                            // Clear dropdown selection when typing custom
                            if (e.target.value.trim()) {
                              setFormData((prev) => ({ ...prev, designation: '' }));
                              // Clear designation validation error when typing custom
                              if (validationErrors.designation) {
                                setValidationErrors((prev) => {
                                  const updated = { ...prev };
                                  delete updated.designation;
                                  return updated;
                                });
                              }
                            }
                          }}
                          className="mt-2"
                          disabled={!formData.departmentId}
                        />
                        {customDesignation.trim() && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Custom designation will be used: &quot;{customDesignation.trim()}&quot;
                          </p>
                        )}
                        {validationErrors.designation && !customDesignation.trim() && (
                          <p className="text-xs text-red-500 mt-1">{validationErrors.designation}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="joiningDate">Joining Date *</Label>
                      <Input
                        id="joiningDate"
                        type="date"
                        value={formData.joiningDate}
                        onChange={(e) => handleChange('joiningDate', e.target.value)}
                        className={validationErrors.joiningDate ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                      {validationErrors.joiningDate && (
                        <p className="text-xs text-red-500">{validationErrors.joiningDate}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="employmentType">Employment Type *</Label>
                      <Select
                        value={formData.employmentType}
                        onValueChange={(value) => handleChange('employmentType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FULL_TIME">Full Time</SelectItem>
                          <SelectItem value="PART_TIME">Part Time</SelectItem>
                          <SelectItem value="CONTRACT">Contract</SelectItem>
                          <SelectItem value="INTERN">Intern</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manager">Reporting Manager *</Label>
                      <Select
                        value={formData.managerId}
                        onValueChange={(value) => handleChange('managerId', value)}
                      >
                        <SelectTrigger className={validationErrors.managerId ? 'border-red-500 focus:ring-red-500' : ''}>
                          <SelectValue placeholder="Select manager" />
                        </SelectTrigger>
                        <SelectContent>
                          {managers.map((manager) => (
                            <SelectItem key={manager.id} value={manager.id}>
                              {manager.firstName} {manager.lastName} ({getRoleLabel(manager.role)}) - {manager.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {validationErrors.managerId && (
                        <p className="text-xs text-red-500">{validationErrors.managerId}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="workLocation">Work Location</Label>
                      <Input
                        id="workLocation"
                        placeholder="Headquarters, Remote, etc."
                        value={formData.workLocation}
                        onChange={(e) => handleChange('workLocation', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-1">Invitation Process</p>
                      <p className="text-sm text-blue-700">
                        An invitation email with a secure link will be sent to{' '}
                        <span className="font-semibold">{formData.email || 'the employee'}</span>.
                        The link expires in 7 days. The employee will complete their profile through the onboarding form.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="flex-1 shadow-sm hover:shadow-md transition-shadow"
                    onClick={() => router.back()}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Sending Invitation...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
    </div>
  );
}
