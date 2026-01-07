'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserMinus,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Send,
  X,
  HelpCircle,
  ChevronRight,
  Building2,
  ClipboardCheck,
  MessageSquare,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface ExitRequest {
  id: string;
  resignationDate: string;
  lastWorkingDate: string;
  reason: string;
  reasonCategory: string;
  status: string;
  noticePeriodDays: number;
  noticePeriodWaived: boolean;
  remarks?: string;
  exitInterview?: {
    isCompleted: boolean;
  };
  clearanceTasks?: Array<{
    id: string;
    status: string;
    department: string;
  }>;
}

const REASON_CATEGORIES = [
  { value: 'BETTER_OPPORTUNITY', label: 'Better Opportunity', icon: '🚀' },
  { value: 'HIGHER_EDUCATION', label: 'Higher Education', icon: '📚' },
  { value: 'RELOCATION', label: 'Relocation', icon: '🏠' },
  { value: 'PERSONAL_REASONS', label: 'Personal Reasons', icon: '👤' },
  { value: 'HEALTH_ISSUES', label: 'Health Issues', icon: '🏥' },
  { value: 'CAREER_CHANGE', label: 'Career Change', icon: '🔄' },
  { value: 'COMPENSATION', label: 'Compensation', icon: '💰' },
  { value: 'WORK_ENVIRONMENT', label: 'Work Environment', icon: '🏢' },
  { value: 'MANAGEMENT_ISSUES', label: 'Management Issues', icon: '👔' },
  { value: 'RETIREMENT', label: 'Retirement', icon: '🌴' },
  { value: 'OTHER', label: 'Other', icon: '📝' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING_MANAGER: { label: 'Pending Manager Approval', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  MANAGER_APPROVED: { label: 'Manager Approved', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  MANAGER_REJECTED: { label: 'Manager Rejected', color: 'bg-red-100 text-red-700', icon: X },
  HR_PROCESSING: { label: 'HR Processing', color: 'bg-purple-100 text-purple-700', icon: Building2 },
  CLEARANCE_PENDING: { label: 'Clearance In Progress', color: 'bg-orange-100 text-orange-700', icon: ClipboardCheck },
  CLEARANCE_COMPLETED: { label: 'Clearance Completed', color: 'bg-teal-100 text-teal-700', icon: CheckCircle },
  COMPLETED: { label: 'Exit Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  WITHDRAWN: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-700', icon: X },
};

export default function EmployeeResignationPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exitRequest, setExitRequest] = useState<ExitRequest | null>(null);
  const [noticePeriodDays, setNoticePeriodDays] = useState(30);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    reason: '',
    reasonCategory: '',
    lastWorkingDate: '',
    personalEmail: '',
    personalPhone: '',
  });

  useEffect(() => {
    fetchResignationStatus();
  }, []);

  const fetchResignationStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/employee/resignation');
      const data = await response.json();

      if (response.ok && data.success) {
        setExitRequest(data.data.exitRequest);
        setNoticePeriodDays(data.data.noticePeriodDays || 30);

        // Set minimum last working date
        if (!formData.lastWorkingDate) {
          const minDate = new Date();
          minDate.setDate(minDate.getDate() + (data.data.noticePeriodDays || 30));
          setFormData(prev => ({
            ...prev,
            lastWorkingDate: minDate.toISOString().split('T')[0],
          }));
        }
      } else {
        toast.error(data.error || 'Failed to load resignation status');
      }
    } catch (error) {
      console.error('Fetch resignation status error:', error);
      toast.error('Failed to load resignation status');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.reason || !formData.reasonCategory || !formData.lastWorkingDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/employee/resignation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Resignation submitted successfully');
        setIsSubmitDialogOpen(false);
        fetchResignationStatus();
      } else {
        toast.error(data.error || 'Failed to submit resignation');
      }
    } catch (error) {
      console.error('Submit resignation error:', error);
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/employee/resignation', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Resignation withdrawn successfully');
        setIsWithdrawDialogOpen(false);
        setExitRequest(null);
      } else {
        toast.error(data.error || 'Failed to withdraw resignation');
      }
    } catch (error) {
      console.error('Withdraw resignation error:', error);
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateDaysRemaining = (lastDate: string) => {
    const today = new Date();
    const last = new Date(lastDate);
    return Math.ceil((last.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getClearanceProgress = () => {
    if (!exitRequest?.clearanceTasks) return { completed: 0, total: 0, percentage: 0 };
    const total = exitRequest.clearanceTasks.length;
    const completed = exitRequest.clearanceTasks.filter(
      t => t.status === 'COMPLETED' || t.status === 'NOT_APPLICABLE'
    ).length;
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  // Show existing resignation request
  if (exitRequest) {
    const statusConfig = STATUS_CONFIG[exitRequest.status] || STATUS_CONFIG.PENDING_MANAGER;
    const StatusIcon = statusConfig.icon;
    const daysRemaining = calculateDaysRemaining(exitRequest.lastWorkingDate);
    const clearanceProgress = getClearanceProgress();

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-gray-900">Resignation Status</h1>
            <p className="text-gray-600 mt-2">Track your resignation request progress</p>
          </motion.div>

          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <Badge className={`${statusConfig.color} text-sm px-3 py-1`}>
                    <StatusIcon className="w-4 h-4 mr-2" />
                    {statusConfig.label}
                  </Badge>
                  {['PENDING_MANAGER', 'MANAGER_APPROVED'].includes(exitRequest.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsWithdrawDialogOpen(true)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Withdraw Request
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-500">Resignation Date</p>
                    <p className="text-lg font-semibold">{formatDate(exitRequest.resignationDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Working Date</p>
                    <p className="text-lg font-semibold">{formatDate(exitRequest.lastWorkingDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Days Remaining</p>
                    <p className={`text-lg font-semibold ${daysRemaining <= 7 ? 'text-red-600' : ''}`}>
                      {daysRemaining > 0 ? `${daysRemaining} days` : 'Completed'}
                    </p>
                  </div>
                </div>

                {exitRequest.noticePeriodWaived && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-700">
                      <AlertTriangle className="w-4 h-4 inline mr-2" />
                      Notice period waived/shortened. Original notice period: {exitRequest.noticePeriodDays} days
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Reason */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Reason for Leaving</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="mb-3">
                  {REASON_CATEGORIES.find(r => r.value === exitRequest.reasonCategory)?.icon}{' '}
                  {REASON_CATEGORIES.find(r => r.value === exitRequest.reasonCategory)?.label}
                </Badge>
                <p className="text-gray-700">{exitRequest.reason}</p>
                {exitRequest.remarks && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Manager/HR Remarks:</p>
                    <p className="text-gray-700">{exitRequest.remarks}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Clearance Progress */}
          {['CLEARANCE_PENDING', 'CLEARANCE_COMPLETED', 'COMPLETED'].includes(exitRequest.status) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-purple-600" />
                    Clearance Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>{clearanceProgress.completed} of {clearanceProgress.total} tasks completed</span>
                      <span className="font-semibold">{clearanceProgress.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-purple-600 h-3 rounded-full transition-all"
                        style={{ width: `${clearanceProgress.percentage}%` }}
                      />
                    </div>
                  </div>

                  {exitRequest.clearanceTasks && (
                    <div className="space-y-2">
                      {exitRequest.clearanceTasks.map(task => (
                        <div
                          key={task.id}
                          className={`flex items-center justify-between p-2 rounded ${
                            task.status === 'COMPLETED' ? 'bg-green-50' :
                            task.status === 'NOT_APPLICABLE' ? 'bg-gray-50' :
                            task.status === 'IN_PROGRESS' ? 'bg-blue-50' : 'bg-yellow-50'
                          }`}
                        >
                          <span className="text-sm">{task.department}</span>
                          <Badge variant="outline" className="text-xs">
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Exit Interview */}
          {exitRequest.exitInterview && !exitRequest.exitInterview.isCompleted &&
           ['CLEARANCE_PENDING', 'HR_PROCESSING'].includes(exitRequest.status) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="mb-6 border-purple-200 bg-purple-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <MessageSquare className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">Exit Interview Pending</h3>
                      <p className="text-sm text-gray-600">
                        HR will schedule your exit interview soon. Your feedback is valuable to us.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Withdraw Dialog */}
        <AlertDialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Withdraw Resignation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to withdraw your resignation request? This action will cancel your exit process.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleWithdraw}
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Withdraw'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Show resignation form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900">Submit Resignation</h1>
          <p className="text-gray-600 mt-2">
            Please fill out the form below to submit your resignation request
          </p>
        </motion.div>

        {/* Notice Period Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800">Notice Period</h3>
                  <p className="text-sm text-amber-700">
                    Your notice period is <strong>{noticePeriodDays} days</strong>.
                    Your last working date should be at least {noticePeriodDays} days from today.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Resignation Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Resignation Details</CardTitle>
              <CardDescription>
                Please provide the following information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Reason Category */}
              <div>
                <Label>Reason for Leaving *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {REASON_CATEGORIES.map(category => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, reasonCategory: category.value }))}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        formData.reasonCategory === category.value
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xl">{category.icon}</span>
                      <p className="text-sm font-medium mt-1">{category.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Detailed Reason */}
              <div>
                <Label htmlFor="reason">Detailed Explanation *</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Please provide a detailed explanation for your resignation..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              {/* Last Working Date */}
              <div>
                <Label htmlFor="lastWorkingDate">Proposed Last Working Date *</Label>
                <Input
                  id="lastWorkingDate"
                  type="date"
                  value={formData.lastWorkingDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastWorkingDate: e.target.value }))}
                  min={new Date(Date.now() + noticePeriodDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum date based on {noticePeriodDays}-day notice period
                </p>
              </div>

              {/* Personal Contact */}
              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Personal Contact (Optional)</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Provide personal contact details for future correspondence after your exit.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="personalEmail">Personal Email</Label>
                    <Input
                      id="personalEmail"
                      type="email"
                      value={formData.personalEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, personalEmail: e.target.value }))}
                      placeholder="your.email@personal.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="personalPhone">Personal Phone</Label>
                    <Input
                      id="personalPhone"
                      type="tel"
                      value={formData.personalPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, personalPhone: e.target.value }))}
                      placeholder="+1 234 567 8900"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => window.history.back()}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setIsSubmitDialogOpen(true)}
                  disabled={!formData.reason || !formData.reasonCategory || !formData.lastWorkingDate}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Resignation
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Resignation</DialogTitle>
            <DialogDescription>
              Please review your resignation details before submitting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500">Reason Category</span>
              <span className="font-medium">
                {REASON_CATEGORIES.find(r => r.value === formData.reasonCategory)?.label}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500">Last Working Date</span>
              <span className="font-medium">{formatDate(formData.lastWorkingDate)}</span>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-700">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                This action will notify your manager and HR. Make sure all details are correct.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Confirm & Submit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
