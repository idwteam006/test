'use client';

import { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  Building2,
  Mail,
  Phone,
  Briefcase,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  MessageSquare,
  ClipboardCheck,
  FileText,
  Send,
  ChevronRight,
  Star,
  ThumbsUp,
  ThumbsDown,
  Save,
  Monitor,
  DollarSign,
  Users,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ExitRequest {
  id: string;
  resignationDate: string;
  lastWorkingDate: string;
  reason: string;
  reasonCategory: string;
  personalEmail?: string;
  personalPhone?: string;
  noticePeriodDays: number;
  noticePeriodWaived: boolean;
  waiverReason?: string;
  status: string;
  remarks?: string;
  finalSettlementAmount?: number;
  createdAt: string;
  employee: {
    id: string;
    employeeNumber: string;
    jobTitle: string;
    startDate: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    department: {
      id: string;
      name: string;
    };
    manager?: {
      user: {
        firstName: string;
        lastName: string;
      };
    };
  };
  exitInterview?: {
    id: string;
    overallExperience?: number;
    managementRating?: number;
    workEnvironmentRating?: number;
    growthOpportunities?: number;
    compensationRating?: number;
    wouldRecommend?: boolean;
    wouldRejoin?: boolean;
    reasonForLeaving?: string;
    whatCouldImprove?: string;
    bestPartOfJob?: string;
    suggestions?: string;
    additionalComments?: string;
    isCompleted: boolean;
    conductedAt?: string;
  };
  clearanceTasks: {
    id: string;
    department: string;
    taskName: string;
    description?: string;
    status: string;
    completedAt?: string;
    completedBy?: string;
    notes?: string;
  }[];
  knowledgeTransfers: {
    id: string;
    title: string;
    description?: string;
    assignedToId?: string;
    status: string;
    completedAt?: string;
  }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDING_MANAGER: { label: 'Pending Manager', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  MANAGER_APPROVED: { label: 'Manager Approved', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  MANAGER_REJECTED: { label: 'Manager Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
  HR_PROCESSING: { label: 'HR Processing', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  CLEARANCE_PENDING: { label: 'Clearance Pending', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  CLEARANCE_COMPLETED: { label: 'Clearance Done', color: 'text-teal-700', bgColor: 'bg-teal-100' },
  COMPLETED: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  WITHDRAWN: { label: 'Withdrawn', color: 'text-gray-500', bgColor: 'bg-gray-100' },
};

const CLEARANCE_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  COMPLETED: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  NOT_APPLICABLE: { label: 'N/A', color: 'text-gray-500', bgColor: 'bg-gray-100' },
};

const DEPARTMENT_ICONS: Record<string, any> = {
  IT: Monitor,
  FINANCE: DollarSign,
  ADMIN: Building2,
  HR: Users,
  SECURITY: Shield,
};

const REASON_CATEGORIES: Record<string, { label: string; icon: string }> = {
  BETTER_OPPORTUNITY: { label: 'Better Opportunity', icon: '🚀' },
  HIGHER_EDUCATION: { label: 'Higher Education', icon: '📚' },
  RELOCATION: { label: 'Relocation', icon: '🏠' },
  PERSONAL_REASONS: { label: 'Personal Reasons', icon: '👤' },
  HEALTH_ISSUES: { label: 'Health Issues', icon: '🏥' },
  CAREER_CHANGE: { label: 'Career Change', icon: '🔄' },
  COMPENSATION: { label: 'Compensation', icon: '💰' },
  WORK_ENVIRONMENT: { label: 'Work Environment', icon: '🏢' },
  MANAGEMENT_ISSUES: { label: 'Management Issues', icon: '👔' },
  RETIREMENT: { label: 'Retirement', icon: '🌴' },
  OTHER: { label: 'Other', icon: '📝' },
};

export default function ExitRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exitRequest, setExitRequest] = useState<ExitRequest | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [savingInterview, setSavingInterview] = useState(false);
  const [savingClearance, setSavingClearance] = useState<string | null>(null);

  // Exit Interview Form State
  const [interviewForm, setInterviewForm] = useState({
    overallExperience: 3,
    managementRating: 3,
    workEnvironmentRating: 3,
    growthOpportunities: 3,
    compensationRating: 3,
    wouldRecommend: false,
    wouldRejoin: false,
    reasonForLeaving: '',
    whatCouldImprove: '',
    bestPartOfJob: '',
    suggestions: '',
    additionalComments: '',
    isCompleted: false,
  });

  useEffect(() => {
    fetchExitRequest();
  }, [id]);

  const fetchExitRequest = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/hr/exit/${id}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setExitRequest(data.data);
        // Initialize interview form with existing data
        if (data.data.exitInterview) {
          setInterviewForm({
            overallExperience: data.data.exitInterview.overallExperience || 3,
            managementRating: data.data.exitInterview.managementRating || 3,
            workEnvironmentRating: data.data.exitInterview.workEnvironmentRating || 3,
            growthOpportunities: data.data.exitInterview.growthOpportunities || 3,
            compensationRating: data.data.exitInterview.compensationRating || 3,
            wouldRecommend: data.data.exitInterview.wouldRecommend || false,
            wouldRejoin: data.data.exitInterview.wouldRejoin || false,
            reasonForLeaving: data.data.exitInterview.reasonForLeaving || '',
            whatCouldImprove: data.data.exitInterview.whatCouldImprove || '',
            bestPartOfJob: data.data.exitInterview.bestPartOfJob || '',
            suggestions: data.data.exitInterview.suggestions || '',
            additionalComments: data.data.exitInterview.additionalComments || '',
            isCompleted: data.data.exitInterview.isCompleted || false,
          });
        }
      } else {
        toast.error(data.error || 'Failed to load exit request');
        router.push('/hr/exit-management');
      }
    } catch (error) {
      console.error('Fetch exit request error:', error);
      toast.error('Failed to load exit request');
    } finally {
      setLoading(false);
    }
  };

  const saveExitInterview = async (markComplete: boolean = false) => {
    setSavingInterview(true);
    try {
      const response = await fetch(`/api/hr/exit/${id}/interview`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...interviewForm,
          isCompleted: markComplete ? true : interviewForm.isCompleted,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(markComplete ? 'Exit interview completed' : 'Interview saved');
        fetchExitRequest();
      } else {
        toast.error(data.error || 'Failed to save interview');
      }
    } catch (error) {
      console.error('Save interview error:', error);
      toast.error('Network error');
    } finally {
      setSavingInterview(false);
    }
  };

  const updateClearanceTask = async (taskId: string, status: string, notes?: string) => {
    setSavingClearance(taskId);
    try {
      const response = await fetch(`/api/hr/exit/${id}/clearance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status, notes }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Clearance task updated');
        fetchExitRequest();
      } else {
        toast.error(data.error || 'Failed to update task');
      }
    } catch (error) {
      console.error('Update clearance error:', error);
      toast.error('Network error');
    } finally {
      setSavingClearance(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateTenure = (startDate: string) => {
    const start = new Date(startDate);
    const end = new Date();
    const years = Math.floor((end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const months = Math.floor(((end.getTime() - start.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));

    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''} ${months > 0 ? `${months} month${months > 1 ? 's' : ''}` : ''}`;
    }
    return `${months} month${months !== 1 ? 's' : ''}`;
  };

  const RatingStars = ({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !disabled && onChange(star)}
          disabled={disabled}
          className={`transition-colors ${disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        >
          <Star
            className={`w-6 h-6 ${
              star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!exitRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <p className="text-gray-600">Exit request not found</p>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[exitRequest.status];
  const clearanceCompleted = exitRequest.clearanceTasks.filter(t => t.status === 'COMPLETED').length;
  const clearanceTotal = exitRequest.clearanceTasks.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Link href="/hr/exit-management">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Exit Management
            </Button>
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl">
                {exitRequest.employee.user.firstName[0]}{exitRequest.employee.user.lastName[0]}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {exitRequest.employee.user.firstName} {exitRequest.employee.user.lastName}
                </h1>
                <p className="text-gray-600">
                  {exitRequest.employee.jobTitle} • {exitRequest.employee.department.name}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={`${statusConfig.bgColor} ${statusConfig.color}`}>
                    {statusConfig.label}
                  </Badge>
                  <Badge variant="outline">
                    {REASON_CATEGORIES[exitRequest.reasonCategory]?.icon}{' '}
                    {REASON_CATEGORIES[exitRequest.reasonCategory]?.label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview">
                <FileText className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="interview">
                <MessageSquare className="w-4 h-4 mr-2" />
                Exit Interview
                {exitRequest.exitInterview && !exitRequest.exitInterview.isCompleted && (
                  <Badge className="ml-2 bg-amber-500 text-white">Pending</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="clearance">
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Clearance
                <Badge className="ml-2 bg-purple-600">{clearanceCompleted}/{clearanceTotal}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Employee Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-purple-600" />
                      Employee Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Employee ID</p>
                        <p className="font-medium">{exitRequest.employee.employeeNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Department</p>
                        <p className="font-medium">{exitRequest.employee.department.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Position</p>
                        <p className="font-medium">{exitRequest.employee.jobTitle}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Manager</p>
                        <p className="font-medium">
                          {exitRequest.employee.manager
                            ? `${exitRequest.employee.manager.user.firstName} ${exitRequest.employee.manager.user.lastName}`
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Join Date</p>
                        <p className="font-medium">{formatDate(exitRequest.employee.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Tenure</p>
                        <p className="font-medium">{calculateTenure(exitRequest.employee.startDate)}</p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-500 mb-2">Contact Information</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span>{exitRequest.employee.user.email}</span>
                        </div>
                        {exitRequest.personalEmail && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>{exitRequest.personalEmail} (Personal)</span>
                          </div>
                        )}
                        {exitRequest.personalPhone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{exitRequest.personalPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Exit Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-purple-600" />
                      Exit Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Resignation Date</p>
                        <p className="font-medium">{formatDate(exitRequest.resignationDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Last Working Date</p>
                        <p className="font-medium">{formatDate(exitRequest.lastWorkingDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Notice Period</p>
                        <p className="font-medium">
                          {exitRequest.noticePeriodDays} days
                          {exitRequest.noticePeriodWaived && (
                            <Badge className="ml-2 bg-amber-100 text-amber-700">Waived</Badge>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Request Date</p>
                        <p className="font-medium">{formatDate(exitRequest.createdAt)}</p>
                      </div>
                    </div>

                    {exitRequest.noticePeriodWaived && exitRequest.waiverReason && (
                      <div>
                        <p className="text-sm text-gray-500">Waiver Reason</p>
                        <p className="text-sm mt-1 p-2 bg-amber-50 rounded">{exitRequest.waiverReason}</p>
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-500 mb-2">Reason for Leaving</p>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm">{exitRequest.reason}</p>
                      </div>
                    </div>

                    {exitRequest.finalSettlementAmount !== undefined && exitRequest.finalSettlementAmount !== null && (
                      <div className="border-t pt-4">
                        <p className="text-sm text-gray-500">Final Settlement</p>
                        <p className="text-xl font-bold text-green-600">
                          ${exitRequest.finalSettlementAmount.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Timeline */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-purple-600" />
                      Exit Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      {[
                        { key: 'PENDING_MANAGER', label: 'Manager Review' },
                        { key: 'MANAGER_APPROVED', label: 'HR Processing' },
                        { key: 'CLEARANCE_PENDING', label: 'Clearance' },
                        { key: 'CLEARANCE_COMPLETED', label: 'Settlement' },
                        { key: 'COMPLETED', label: 'Completed' },
                      ].map((step, index) => {
                        const statusOrder = ['PENDING_MANAGER', 'MANAGER_APPROVED', 'HR_PROCESSING', 'CLEARANCE_PENDING', 'CLEARANCE_COMPLETED', 'COMPLETED'];
                        const currentIndex = statusOrder.indexOf(exitRequest.status);
                        const stepIndex = statusOrder.indexOf(step.key);
                        const isCompleted = stepIndex < currentIndex || (stepIndex === currentIndex && exitRequest.status === 'COMPLETED');
                        const isCurrent = step.key === exitRequest.status ||
                          (exitRequest.status === 'HR_PROCESSING' && step.key === 'MANAGER_APPROVED');

                        return (
                          <div key={step.key} className="flex items-center flex-1">
                            <div className="flex flex-col items-center flex-1">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  isCompleted
                                    ? 'bg-green-500 text-white'
                                    : isCurrent
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-200 text-gray-500'
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle className="w-5 h-5" />
                                ) : (
                                  <span className="text-sm font-medium">{index + 1}</span>
                                )}
                              </div>
                              <p className={`text-xs mt-2 text-center ${isCurrent ? 'font-medium text-purple-600' : 'text-gray-500'}`}>
                                {step.label}
                              </p>
                            </div>
                            {index < 4 && (
                              <div
                                className={`h-1 flex-1 mx-2 ${
                                  stepIndex < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Exit Interview Tab */}
            <TabsContent value="interview">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-purple-600" />
                      Exit Interview
                    </div>
                    {exitRequest.exitInterview?.isCompleted && (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Conduct the exit interview to gather feedback from the departing employee
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {/* Ratings Section */}
                    <div>
                      <h3 className="font-semibold mb-4">Experience Ratings</h3>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <Label>Overall Experience</Label>
                          <div className="mt-2">
                            <RatingStars
                              value={interviewForm.overallExperience}
                              onChange={(v) => setInterviewForm({ ...interviewForm, overallExperience: v })}
                              disabled={exitRequest.exitInterview?.isCompleted}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Management</Label>
                          <div className="mt-2">
                            <RatingStars
                              value={interviewForm.managementRating}
                              onChange={(v) => setInterviewForm({ ...interviewForm, managementRating: v })}
                              disabled={exitRequest.exitInterview?.isCompleted}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Work Environment</Label>
                          <div className="mt-2">
                            <RatingStars
                              value={interviewForm.workEnvironmentRating}
                              onChange={(v) => setInterviewForm({ ...interviewForm, workEnvironmentRating: v })}
                              disabled={exitRequest.exitInterview?.isCompleted}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Growth Opportunities</Label>
                          <div className="mt-2">
                            <RatingStars
                              value={interviewForm.growthOpportunities}
                              onChange={(v) => setInterviewForm({ ...interviewForm, growthOpportunities: v })}
                              disabled={exitRequest.exitInterview?.isCompleted}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Compensation & Benefits</Label>
                          <div className="mt-2">
                            <RatingStars
                              value={interviewForm.compensationRating}
                              onChange={(v) => setInterviewForm({ ...interviewForm, compensationRating: v })}
                              disabled={exitRequest.exitInterview?.isCompleted}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Yes/No Questions */}
                    <div className="border-t pt-6">
                      <h3 className="font-semibold mb-4">Recommendations</h3>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <Label>Would you recommend this company to others?</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant={interviewForm.wouldRecommend ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => !exitRequest.exitInterview?.isCompleted && setInterviewForm({ ...interviewForm, wouldRecommend: true })}
                              disabled={exitRequest.exitInterview?.isCompleted}
                              className={interviewForm.wouldRecommend ? 'bg-green-600 hover:bg-green-700' : ''}
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant={!interviewForm.wouldRecommend ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => !exitRequest.exitInterview?.isCompleted && setInterviewForm({ ...interviewForm, wouldRecommend: false })}
                              disabled={exitRequest.exitInterview?.isCompleted}
                              className={!interviewForm.wouldRecommend ? 'bg-red-600 hover:bg-red-700' : ''}
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <Label>Would you consider rejoining in the future?</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant={interviewForm.wouldRejoin ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => !exitRequest.exitInterview?.isCompleted && setInterviewForm({ ...interviewForm, wouldRejoin: true })}
                              disabled={exitRequest.exitInterview?.isCompleted}
                              className={interviewForm.wouldRejoin ? 'bg-green-600 hover:bg-green-700' : ''}
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant={!interviewForm.wouldRejoin ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => !exitRequest.exitInterview?.isCompleted && setInterviewForm({ ...interviewForm, wouldRejoin: false })}
                              disabled={exitRequest.exitInterview?.isCompleted}
                              className={!interviewForm.wouldRejoin ? 'bg-red-600 hover:bg-red-700' : ''}
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Open Questions */}
                    <div className="border-t pt-6">
                      <h3 className="font-semibold mb-4">Detailed Feedback</h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="reasonForLeaving">Primary reason for leaving</Label>
                          <Textarea
                            id="reasonForLeaving"
                            value={interviewForm.reasonForLeaving}
                            onChange={(e) => setInterviewForm({ ...interviewForm, reasonForLeaving: e.target.value })}
                            placeholder="Please describe your main reason for leaving..."
                            rows={3}
                            className="mt-1"
                            disabled={exitRequest.exitInterview?.isCompleted}
                          />
                        </div>
                        <div>
                          <Label htmlFor="bestPartOfJob">What was the best part of your job?</Label>
                          <Textarea
                            id="bestPartOfJob"
                            value={interviewForm.bestPartOfJob}
                            onChange={(e) => setInterviewForm({ ...interviewForm, bestPartOfJob: e.target.value })}
                            placeholder="What did you enjoy most about working here..."
                            rows={3}
                            className="mt-1"
                            disabled={exitRequest.exitInterview?.isCompleted}
                          />
                        </div>
                        <div>
                          <Label htmlFor="whatCouldImprove">What could the company improve?</Label>
                          <Textarea
                            id="whatCouldImprove"
                            value={interviewForm.whatCouldImprove}
                            onChange={(e) => setInterviewForm({ ...interviewForm, whatCouldImprove: e.target.value })}
                            placeholder="Your suggestions for improvement..."
                            rows={3}
                            className="mt-1"
                            disabled={exitRequest.exitInterview?.isCompleted}
                          />
                        </div>
                        <div>
                          <Label htmlFor="suggestions">Any suggestions for management?</Label>
                          <Textarea
                            id="suggestions"
                            value={interviewForm.suggestions}
                            onChange={(e) => setInterviewForm({ ...interviewForm, suggestions: e.target.value })}
                            placeholder="Suggestions for management or leadership..."
                            rows={3}
                            className="mt-1"
                            disabled={exitRequest.exitInterview?.isCompleted}
                          />
                        </div>
                        <div>
                          <Label htmlFor="additionalComments">Additional comments</Label>
                          <Textarea
                            id="additionalComments"
                            value={interviewForm.additionalComments}
                            onChange={(e) => setInterviewForm({ ...interviewForm, additionalComments: e.target.value })}
                            placeholder="Any other feedback you'd like to share..."
                            rows={3}
                            className="mt-1"
                            disabled={exitRequest.exitInterview?.isCompleted}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {!exitRequest.exitInterview?.isCompleted && (
                      <div className="border-t pt-6 flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() => saveExitInterview(false)}
                          disabled={savingInterview}
                        >
                          {savingInterview ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Save Draft
                        </Button>
                        <Button
                          onClick={() => saveExitInterview(true)}
                          disabled={savingInterview}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {savingInterview ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Complete Interview
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Clearance Tab */}
            <TabsContent value="clearance">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="w-5 h-5 text-purple-600" />
                      Clearance Tasks
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {clearanceCompleted} of {clearanceTotal} completed
                      </span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${clearanceTotal > 0 ? (clearanceCompleted / clearanceTotal) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Track and manage clearance tasks across departments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {exitRequest.clearanceTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No clearance tasks created yet</p>
                      <p className="text-sm text-gray-400">Start clearance process to create tasks</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {exitRequest.clearanceTasks.map((task) => {
                        const DeptIcon = DEPARTMENT_ICONS[task.department] || Building2;
                        const statusConfig = CLEARANCE_STATUS_CONFIG[task.status];

                        return (
                          <div
                            key={task.id}
                            className={`p-4 rounded-lg border ${
                              task.status === 'COMPLETED' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${
                                  task.status === 'COMPLETED' ? 'bg-green-100' : 'bg-gray-100'
                                }`}>
                                  <DeptIcon className={`w-5 h-5 ${
                                    task.status === 'COMPLETED' ? 'text-green-600' : 'text-gray-600'
                                  }`} />
                                </div>
                                <div>
                                  <h4 className="font-medium">{task.taskName}</h4>
                                  <p className="text-sm text-gray-500">{task.department} Department</p>
                                  {task.description && (
                                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                                  )}
                                  {task.completedAt && (
                                    <p className="text-xs text-gray-400 mt-2">
                                      Completed on {formatDate(task.completedAt)}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge className={`${statusConfig.bgColor} ${statusConfig.color}`}>
                                  {statusConfig.label}
                                </Badge>
                                {task.status !== 'COMPLETED' && task.status !== 'NOT_APPLICABLE' && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateClearanceTask(task.id, 'COMPLETED')}
                                    disabled={savingClearance === task.id}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    {savingClearance === task.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <>
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Complete
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Knowledge Transfer Section */}
              {exitRequest.knowledgeTransfers.length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-600" />
                      Knowledge Transfer
                    </CardTitle>
                    <CardDescription>
                      Track handover of responsibilities and documentation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {exitRequest.knowledgeTransfers.map((transfer) => (
                        <div
                          key={transfer.id}
                          className="p-4 rounded-lg border bg-white"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{transfer.title}</h4>
                              {transfer.description && (
                                <p className="text-sm text-gray-600 mt-1">{transfer.description}</p>
                              )}
                            </div>
                            <Badge className={
                              transfer.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }>
                              {transfer.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
