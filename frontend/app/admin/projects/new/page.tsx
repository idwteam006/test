'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Building2,
  Clock,
  DollarSign,
  FileText,
  Plus,
  X,
  Calendar,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

// Dynamically import motion to avoid SSR issues with useLayoutEffect
const MotionDiv = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.div),
  { ssr: false }
);

interface ProjectFormData {
  // Step 1: Basic Info
  name: string;
  projectCode: string;
  useCustomCode: boolean;
  customCode: string;
  clientId: string;
  projectType: string;
  department: string;
  description: string;

  // Step 2: Timeline & Management
  startDate: string;
  endDate: string;
  estimatedHours: string;
  projectManagerId: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  initialStatus: 'PLANNING' | 'ACTIVE';
  visibleToClient: boolean;
  internalProject: boolean;
  billable: boolean;

  // Step 3: Budget & Billing
  totalBudget: string;
  billingType: 'FIXED_PRICE' | 'HOURLY_RATE' | 'MILESTONE_BASED' | 'RETAINER' | 'TIME_MATERIALS';
  hourlyRate: string;
  paymentTerms: string;
  currency: string;
  trackActualCosts: boolean;
  budgetAlert: boolean;
  preventOverbudget: boolean;

  // Step 4: Team & Milestones
  teamMembers: Array<{
    userId: string;
    role: string;
    capacity: number;
    hourlyRate: number;
    isTeamLead: boolean;
    canManageTeam: boolean;
  }>;
  milestones: Array<{
    name: string;
    dueDate: string;
    invoiceAmount: string;
    description: string;
  }>;

  // Step 5: Additional Details
  technologies: string[];
  requirements: string;
  deliverables: string;
  slackChannel: string;
  autoCreateSlack: boolean;
  projectEmail: string;
  autoCreateEmail: boolean;
  tags: string[];
  internalNotes: string;
}

const initialFormData: ProjectFormData = {
  name: '',
  projectCode: '',
  useCustomCode: false,
  customCode: '',
  clientId: '',
  projectType: '',
  department: '',
  description: '',
  startDate: '',
  endDate: '',
  estimatedHours: '',
  projectManagerId: '',
  priority: 'MEDIUM',
  initialStatus: 'PLANNING',
  visibleToClient: true,
  internalProject: false,
  billable: true,
  totalBudget: '',
  billingType: 'FIXED_PRICE',
  hourlyRate: '',
  paymentTerms: 'NET_30',
  currency: 'USD',
  trackActualCosts: true,
  budgetAlert: true,
  preventOverbudget: true,
  teamMembers: [],
  milestones: [],
  technologies: [],
  requirements: '',
  deliverables: '',
  slackChannel: '',
  autoCreateSlack: true,
  projectEmail: '',
  autoCreateEmail: true,
  tags: [],
  internalNotes: '',
};

export default function CreateProjectPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Helper function to get users who can be project managers (ADMIN or MANAGER)
  const getEligibleManagers = () => users.filter(u => u.role === 'ADMIN' || u.role === 'MANAGER');

  // Ensure client-side only rendering to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const steps = [
    { number: 1, title: 'Basic Info', icon: Building2, progress: 25 },
    { number: 2, title: 'Timeline & Management', icon: Clock, progress: 50 },
    { number: 3, title: 'Budget & Billing', icon: DollarSign, progress: 75 },
    { number: 4, title: 'Additional Details', icon: FileText, progress: 100 },
  ];

  // Fetch clients and users
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch clients
        const clientsRes = await fetch('/api/clients/list');
        const clientsData = await clientsRes.json();

        if (clientsData.success) {
          console.log('Clients loaded:', clientsData.clients?.length || 0);
          setClients(clientsData.clients || []);
        } else {
          console.error('Failed to fetch clients:', clientsData.error);
          toast.error('Failed to load clients');
        }

        // Fetch users (managers and team members)
        try {
          const usersRes = await fetch('/api/users/list');
          const usersData = await usersRes.json();
          if (usersData.success) {
            console.log('Users loaded:', usersData.users?.length || 0);
            console.log('Eligible managers (ADMIN/MANAGER):', usersData.users?.filter((u: any) => u.role === 'ADMIN' || u.role === 'MANAGER').length || 0);
            setUsers(usersData.users || []);
          } else {
            console.error('Failed to fetch users:', usersData.error);
            toast.error('Failed to load users');
          }
        } catch (error) {
          console.error('Users API error:', error);
          toast.error('Failed to load users');
        }
      } catch (error) {
        console.error('Fetch data error:', error);
        toast.error('Failed to load data');
      }
    };
    fetchData();
  }, []);

  // Auto-generate project code - only on client side
  useEffect(() => {
    if (!formData.useCustomCode && !formData.projectCode) {
      const year = new Date().getFullYear();
      const nextNumber = '001'; // In real app, fetch next available number
      setFormData((prev) => ({ ...prev, projectCode: `PROJ-${year}-${nextNumber}` }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (field: keyof ProjectFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Pure validation function - does NOT update state (safe to call in render)
  const getStepErrors = (step: number): Record<string, string> => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.name.trim()) errors.name = 'Project name is required';
        if (!formData.clientId) errors.clientId = 'Client is required';
        if (!formData.projectType) errors.projectType = 'Project type is required';
        if (!formData.department) errors.department = 'Department is required';
        if (!formData.description.trim()) errors.description = 'Description is required';
        if (formData.description.length > 2000) errors.description = 'Description must be under 2000 characters';
        break;
      case 2:
        if (!formData.startDate) errors.startDate = 'Start date is required';
        if (!formData.endDate) errors.endDate = 'End date is required';
        if (formData.startDate && formData.endDate) {
          const start = new Date(formData.startDate);
          const end = new Date(formData.endDate);
          if (end <= start) {
            errors.endDate = 'End date must be after start date';
          }
        }
        if (!formData.projectManagerId) errors.projectManagerId = 'Project manager is required';
        if (formData.estimatedHours && parseFloat(formData.estimatedHours) <= 0) {
          errors.estimatedHours = 'Estimated hours must be positive';
        }
        break;
      case 3:
        if (!formData.totalBudget) errors.totalBudget = 'Budget is required';
        if (formData.totalBudget && parseFloat(formData.totalBudget) <= 0) {
          errors.totalBudget = 'Budget must be a positive number';
        }
        if (!formData.billingType) errors.billingType = 'Billing type is required';
        if (!formData.currency) errors.currency = 'Currency is required';
        if (formData.billingType === 'HOURLY_RATE' && formData.hourlyRate && parseFloat(formData.hourlyRate) <= 0) {
          errors.hourlyRate = 'Hourly rate must be positive';
        }
        break;
      case 4:
        // Optional step - no required fields
        break;
    }

    return errors;
  };

  // Check if step is valid (safe to call in render - no state updates)
  const isStepValid = (step: number): boolean => {
    return Object.keys(getStepErrors(step)).length === 0;
  };

  // Validate and update error state (only call on user action, not in render)
  const validateStep = (step: number): boolean => {
    const errors = getStepErrors(step);
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
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

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const response = await fetch('/api/projects/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Draft saved successfully');
      }
    } catch (error) {
      toast.error('Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Project created successfully!', {
          description: `Project ${formData.projectCode} has been created`,
        });
        router.push(`/admin/projects/${data.project.projectId}`);
      } else {
        toast.error('Failed to create project', {
          description: data.error || 'Please try again',
        });
      }
    } catch (error) {
      console.error('Create project error:', error);
      toast.error('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const currentStepData = steps[currentStep - 1];

  // Show loading state during SSR/hydration to prevent React error #301
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/projects')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Create New Project
          </h1>
          <p className="text-gray-600 mt-2">
            Step {currentStep} of 4: {currentStepData.title}
          </p>
        </div>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-medium text-gray-700">
                {currentStepData.progress}%
              </span>
            </div>
            <Progress value={currentStepData.progress} className="h-3" />

            <div className="flex items-center justify-between mt-6">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        currentStep >= step.number
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {currentStep > step.number ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <step.icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className="text-xs mt-2 text-center font-medium hidden md:block">
                      {step.title}
                    </span>
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
          </CardContent>
        </Card>

        {/* Form Content */}
        <MotionDiv
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <currentStepData.icon className="w-6 h-6 text-purple-600" />
                {currentStepData.title}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && 'Enter the basic project information'}
                {currentStep === 2 && 'Define timeline and project management details'}
                {currentStep === 3 && 'Set budget and billing information'}
                {currentStep === 4 && 'Add technical details and additional information'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Project Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="E-commerce Platform Development"
                      required
                      className={validationErrors.name ? 'border-red-500' : ''}
                    />
                    {validationErrors.name && (
                      <p className="text-xs text-red-500">{validationErrors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Project Code</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        value={formData.useCustomCode ? formData.customCode : formData.projectCode}
                        onChange={(e) =>
                          handleInputChange(
                            formData.useCustomCode ? 'customCode' : 'projectCode',
                            e.target.value
                          )
                        }
                        disabled={!formData.useCustomCode}
                        placeholder="PROJ-2025-001"
                      />
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="customCode"
                          checked={formData.useCustomCode}
                          onCheckedChange={(checked) =>
                            handleInputChange('useCustomCode', checked)
                          }
                        />
                        <Label htmlFor="customCode" className="text-sm">
                          Custom code
                        </Label>
                      </div>
                    </div>
                    {!formData.useCustomCode && (
                      <p className="text-xs text-gray-500">
                        Auto-generated: {formData.projectCode}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client">
                      Client <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.clientId} onValueChange={(value) => handleInputChange('clientId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={clients.length === 0 ? "No clients available" : "Select Client"} />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">
                            No clients found. Create one first.
                          </div>
                        ) : (
                          clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.companyName}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => router.push('/admin/clients/new')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Client
                    </Button>
                    {clients.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {clients.length} client{clients.length !== 1 ? 's' : ''} available
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="projectType">
                        Project Type <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.projectType} onValueChange={(value) => handleInputChange('projectType', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WEB_APP">Web Application Development</SelectItem>
                          <SelectItem value="MOBILE_APP">Mobile App Development</SelectItem>
                          <SelectItem value="WEBSITE">Website Design & Development</SelectItem>
                          <SelectItem value="UI_UX">UI/UX Design</SelectItem>
                          <SelectItem value="CONSULTING">Software Consulting</SelectItem>
                          <SelectItem value="MARKETING">Digital Marketing</SelectItem>
                          <SelectItem value="MAINTENANCE">Maintenance & Support</SelectItem>
                          <SelectItem value="CUSTOM">Custom Software</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department">
                        Department <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ENGINEERING">Engineering</SelectItem>
                          <SelectItem value="DESIGN">Design</SelectItem>
                          <SelectItem value="MARKETING">Marketing</SelectItem>
                          <SelectItem value="SALES">Sales</SelectItem>
                          <SelectItem value="SUPPORT">Support</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">
                      Project Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Build a full-featured e-commerce platform with..."
                      rows={6}
                      required
                      className={validationErrors.description ? 'border-red-500' : ''}
                    />
                    <p className={`text-xs ${formData.description.length > 2000 ? 'text-red-500' : 'text-gray-500'}`}>
                      Character count: {formData.description.length}/2000
                    </p>
                    {validationErrors.description && (
                      <p className="text-xs text-red-500">{validationErrors.description}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Timeline & Management */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">
                        Start Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                        required
                        className={validationErrors.startDate ? 'border-red-500' : ''}
                      />
                      {validationErrors.startDate && (
                        <p className="text-xs text-red-500">{validationErrors.startDate}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endDate">
                        End Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => handleInputChange('endDate', e.target.value)}
                        required
                        className={validationErrors.endDate ? 'border-red-500' : ''}
                      />
                      {validationErrors.endDate && (
                        <p className="text-xs text-red-500">{validationErrors.endDate}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimatedHours">Estimated Hours</Label>
                    <Input
                      id="estimatedHours"
                      type="number"
                      value={formData.estimatedHours}
                      onChange={(e) => handleInputChange('estimatedHours', e.target.value)}
                      placeholder="800"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="projectManager">
                      Project Manager <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.projectManagerId} onValueChange={(value) => handleInputChange('projectManagerId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={getEligibleManagers().length === 0 ? "No managers available" : "Select Project Manager"} />
                      </SelectTrigger>
                      <SelectContent>
                        {getEligibleManagers().length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">
                            No managers or admins found. Please create a user with manager or admin role first.
                          </div>
                        ) : (
                          getEligibleManagers().map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName} ({user.role}) - {user.employee?.employeeNumber || user.email}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {getEligibleManagers().length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {getEligibleManagers().length} manager{getEligibleManagers().length !== 1 ? 's' : ''} available
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Project Priority</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((priority) => (
                        <Button
                          key={priority}
                          variant={formData.priority === priority ? 'default' : 'outline'}
                          onClick={() => handleInputChange('priority', priority)}
                          className={formData.priority === priority ? 'bg-purple-600' : ''}
                        >
                          {priority}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Initial Status</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={formData.initialStatus === 'PLANNING' ? 'default' : 'outline'}
                        onClick={() => handleInputChange('initialStatus', 'PLANNING')}
                        className={formData.initialStatus === 'PLANNING' ? 'bg-purple-600' : ''}
                      >
                        Planning
                      </Button>
                      <Button
                        variant={formData.initialStatus === 'ACTIVE' ? 'default' : 'outline'}
                        onClick={() => handleInputChange('initialStatus', 'ACTIVE')}
                        className={formData.initialStatus === 'ACTIVE' ? 'bg-purple-600' : ''}
                      >
                        Active
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Project Visibility</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="visibleToClient"
                          checked={formData.visibleToClient}
                          onCheckedChange={(checked) =>
                            handleInputChange('visibleToClient', checked)
                          }
                        />
                        <Label htmlFor="visibleToClient" className="text-sm font-normal">
                          Visible to client in portal
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="internalProject"
                          checked={formData.internalProject}
                          onCheckedChange={(checked) =>
                            handleInputChange('internalProject', checked)
                          }
                        />
                        <Label htmlFor="internalProject" className="text-sm font-normal">
                          Internal project (no client access)
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="billable"
                          checked={formData.billable}
                          onCheckedChange={(checked) => handleInputChange('billable', checked)}
                        />
                        <Label htmlFor="billable" className="text-sm font-normal">
                          Billable project
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Budget & Billing */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalBudget">
                      Total Budget <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">₹</SelectItem>
                          <SelectItem value="USD">$</SelectItem>
                          <SelectItem value="EUR">€</SelectItem>
                          <SelectItem value="GBP">£</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="totalBudget"
                        type="number"
                        value={formData.totalBudget}
                        onChange={(e) => handleInputChange('totalBudget', e.target.value)}
                        placeholder="2500000"
                        className={`flex-1 ${validationErrors.totalBudget ? 'border-red-500' : ''}`}
                        required
                      />
                    </div>
                    {validationErrors.totalBudget && (
                      <p className="text-xs text-red-500">{validationErrors.totalBudget}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Billing Type <span className="text-red-500">*</span></Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {[
                        { value: 'FIXED_PRICE', label: 'Fixed Price' },
                        { value: 'HOURLY_RATE', label: 'Hourly Rate' },
                        { value: 'MILESTONE_BASED', label: 'Milestone-based' },
                        { value: 'RETAINER', label: 'Retainer (Monthly)' },
                        { value: 'TIME_MATERIALS', label: 'Time & Materials' },
                      ].map((type) => (
                        <Button
                          key={type.value}
                          variant={formData.billingType === type.value ? 'default' : 'outline'}
                          onClick={() => handleInputChange('billingType', type.value)}
                          className={formData.billingType === type.value ? 'bg-purple-600' : ''}
                        >
                          {type.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {formData.billingType === 'HOURLY_RATE' && (
                    <div className="space-y-2">
                      <Label htmlFor="hourlyRate">Hourly Rate</Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        value={formData.hourlyRate}
                        onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                        placeholder="2000"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">Payment Terms</Label>
                    <Select value={formData.paymentTerms} onValueChange={(value) => handleInputChange('paymentTerms', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NET_15">Net 15 days</SelectItem>
                        <SelectItem value="NET_30">Net 30 days</SelectItem>
                        <SelectItem value="NET_45">Net 45 days</SelectItem>
                        <SelectItem value="NET_60">Net 60 days</SelectItem>
                        <SelectItem value="NET_90">Net 90 days</SelectItem>
                        <SelectItem value="ADVANCE">Advance Payment</SelectItem>
                        <SelectItem value="MILESTONE">Milestone-based</SelectItem>
                        <SelectItem value="IMMEDIATE">Immediate Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>Cost Tracking</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="trackActualCosts"
                          checked={formData.trackActualCosts}
                          onCheckedChange={(checked) =>
                            handleInputChange('trackActualCosts', checked)
                          }
                        />
                        <Label htmlFor="trackActualCosts" className="text-sm font-normal">
                          Track actual costs
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="budgetAlert"
                          checked={formData.budgetAlert}
                          onCheckedChange={(checked) => handleInputChange('budgetAlert', checked)}
                        />
                        <Label htmlFor="budgetAlert" className="text-sm font-normal">
                          Alert when 80% budget used
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="preventOverbudget"
                          checked={formData.preventOverbudget}
                          onCheckedChange={(checked) =>
                            handleInputChange('preventOverbudget', checked)
                          }
                        />
                        <Label htmlFor="preventOverbudget" className="text-sm font-normal">
                          Prevent over-budget without approval
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Additional Details */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="requirements">Requirements</Label>
                    <Textarea
                      id="requirements"
                      value={formData.requirements}
                      onChange={(e) => handleInputChange('requirements', e.target.value)}
                      placeholder="Functional and non-functional requirements..."
                      rows={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deliverables">Deliverables</Label>
                    <Textarea
                      id="deliverables"
                      value={formData.deliverables}
                      onChange={(e) => handleInputChange('deliverables', e.target.value)}
                      placeholder="List of deliverables..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="internalNotes">Internal Notes</Label>
                    <Textarea
                      id="internalNotes"
                      value={formData.internalNotes}
                      onChange={(e) => handleInputChange('internalNotes', e.target.value)}
                      placeholder="Internal notes and comments..."
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="slackChannel">Slack Channel</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="slackChannel"
                          value={formData.slackChannel}
                          onChange={(e) => handleInputChange('slackChannel', e.target.value)}
                          placeholder="#project-name"
                        />
                        <Checkbox
                          id="autoCreateSlack"
                          checked={formData.autoCreateSlack}
                          onCheckedChange={(checked) =>
                            handleInputChange('autoCreateSlack', checked)
                          }
                        />
                      </div>
                      <Label htmlFor="autoCreateSlack" className="text-xs text-gray-500">
                        Auto-create channel
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="projectEmail">Project Email</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="projectEmail"
                          value={formData.projectEmail}
                          onChange={(e) => handleInputChange('projectEmail', e.target.value)}
                          placeholder="project@company.com"
                        />
                        <Checkbox
                          id="autoCreateEmail"
                          checked={formData.autoCreateEmail}
                          onCheckedChange={(checked) =>
                            handleInputChange('autoCreateEmail', checked)
                          }
                        />
                      </div>
                      <Label htmlFor="autoCreateEmail" className="text-xs text-gray-500">
                        Auto-create email
                      </Label>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </MotionDiv>

        {/* Navigation Buttons */}
        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveDraft} disabled={savingDraft}>
              <Save className="w-4 h-4 mr-2" />
              {savingDraft ? 'Saving...' : 'Save as Draft'}
            </Button>

            {currentStep < 4 ? (
              <Button
                onClick={nextStep}
                disabled={!isStepValid(currentStep)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading || !isStepValid(currentStep)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Create Project
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
