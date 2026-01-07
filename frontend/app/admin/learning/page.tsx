'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  BookOpen,
  Award,
  Clock,
  TrendingUp,
  CheckCircle,
  PlayCircle,
  FileText,
  Star,
  Plus,
  Upload,
  XCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface CourseSubmission {
  id: string;
  courseTitle: string;
  courseProvider?: string;
  category: string;
  completionDate: string;
  certificateUrl?: string;
  certificateNumber?: string;
  description?: string;
  skillsLearned: string[];
  duration?: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUIRED';
  reviewedBy?: {
    name: string;
    email: string;
  };
  reviewedAt?: string;
  reviewComments?: string;
  rating?: number;
  createdAt: string;
}

const statusColors = {
  PENDING_REVIEW: 'bg-blue-500',
  APPROVED: 'bg-green-500',
  REJECTED: 'bg-red-500',
  REVISION_REQUIRED: 'bg-orange-500',
};

const categoryOptions = [
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'SOFT_SKILLS', label: 'Soft Skills' },
  { value: 'LEADERSHIP', label: 'Leadership' },
  { value: 'COMPLIANCE', label: 'Compliance' },
  { value: 'CERTIFICATION', label: 'Certification' },
  { value: 'LANGUAGE', label: 'Language' },
  { value: 'OTHER', label: 'Other' },
];

export default function AdminLearningPage() {
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<CourseSubmission[]>([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    courseTitle: '',
    courseProvider: '',
    category: '',
    completionDate: '',
    certificateUrl: '',
    certificateNumber: '',
    description: '',
    skillsLearned: '',
    duration: '',
  });

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employee/courses');
      const data = await res.json();

      if (data.success) {
        setSubmissions(data.courses);
      } else {
        toast.error(data.error || 'Failed to load course submissions');
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to load course submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.courseTitle || !formData.category || !formData.completionDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);

      const skillsArray = formData.skillsLearned
        ? formData.skillsLearned.split(',').map(s => s.trim()).filter(s => s)
        : [];

      const res = await fetch('/api/employee/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          skillsLearned: skillsArray,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Course submitted successfully for manager review!');
        setShowSubmitModal(false);
        setFormData({
          courseTitle: '',
          courseProvider: '',
          category: '',
          completionDate: '',
          certificateUrl: '',
          certificateNumber: '',
          description: '',
          skillsLearned: '',
          duration: '',
        });
        fetchSubmissions();
      } else {
        toast.error(data.error || 'Failed to submit course');
      }
    } catch (error) {
      console.error('Error submitting course:', error);
      toast.error('Failed to submit course');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'PENDING_REVIEW').length,
    approved: submissions.filter(s => s.status === 'APPROVED').length,
    avgRating: submissions.filter(s => s.rating).length > 0
      ? (submissions.reduce((sum, s) => sum + (s.rating || 0), 0) / submissions.filter(s => s.rating).length).toFixed(1)
      : 'N/A',
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Learning & Development
          </h1>
          <p className="text-slate-600 mt-2">
            Submit completed courses and certifications for manager review
          </p>
        </div>
        <Button
          onClick={() => setShowSubmitModal(true)}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Submit Course
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-purple-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-purple-600">{stats.total}</div>
              <GraduationCap className="h-8 w-8 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-blue-600">{stats.pending}</div>
              <Clock className="h-8 w-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
              <CheckCircle className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-orange-600">{stats.avgRating}</div>
              <Star className="h-8 w-8 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-600" />
            Course Submissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Submissions Yet</h3>
              <p className="text-slate-600 mb-4">
                Start by submitting your completed courses and certifications
              </p>
              <Button
                onClick={() => setShowSubmitModal(true)}
                variant="outline"
                className="border-purple-600 text-purple-600 hover:bg-purple-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Submit Your First Course
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <motion.div
                  key={submission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <Award className="h-6 w-6 text-purple-600" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">{submission.courseTitle}</h3>
                        <Badge className={`${statusColors[submission.status]} text-white`}>
                          {submission.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      {submission.courseProvider && (
                        <p className="text-sm text-slate-600 mb-2">Provider: {submission.courseProvider}</p>
                      )}

                      {submission.description && (
                        <p className="text-sm text-slate-600 mb-3">{submission.description}</p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-slate-600 mb-3">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>Category: {submission.category.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>Completed: {new Date(submission.completionDate).toLocaleDateString()}</span>
                        </div>
                        {submission.duration && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            <span>Duration: {submission.duration}</span>
                          </div>
                        )}
                      </div>

                      {submission.skillsLearned.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-slate-700 mb-1">Skills Learned:</p>
                          <div className="flex flex-wrap gap-1">
                            {submission.skillsLearned.map((skill, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {submission.status === 'APPROVED' && submission.rating && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-sm mb-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-900">
                              Manager Rating: {submission.rating}/5
                            </span>
                            {submission.reviewedBy && (
                              <span className="text-green-700">by {submission.reviewedBy.name}</span>
                            )}
                          </div>
                          {submission.reviewComments && (
                            <p className="text-green-700 mt-2">{submission.reviewComments}</p>
                          )}
                        </div>
                      )}

                      {submission.status === 'REJECTED' && submission.reviewComments && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-sm">
                          <div className="flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-red-900 mb-1">Rejection Reason:</p>
                              <p className="text-red-700">{submission.reviewComments}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {submission.status === 'REVISION_REQUIRED' && submission.reviewComments && (
                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 text-sm">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-orange-900 mb-1">Revision Required:</p>
                              <p className="text-orange-700">{submission.reviewComments}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {submission.certificateUrl && (
                      <Button
                        onClick={() => window.open(submission.certificateUrl, '_blank')}
                        variant="outline"
                        size="sm"
                        className="border-purple-600 text-purple-600 hover:bg-purple-50"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Certificate
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Course Modal */}
      <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Course Completion</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Course Title *</Label>
              <Input
                value={formData.courseTitle}
                onChange={(e) => setFormData({ ...formData, courseTitle: e.target.value })}
                placeholder="e.g., AWS Solutions Architect Certification"
              />
            </div>

            <div>
              <Label>Course Provider</Label>
              <Input
                value={formData.courseProvider}
                onChange={(e) => setFormData({ ...formData, courseProvider: e.target.value })}
                placeholder="e.g., Coursera, Udemy, Internal Training"
              />
            </div>

            <div>
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Completion Date *</Label>
              <Input
                type="date"
                value={formData.completionDate}
                onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
              />
            </div>

            <div>
              <Label>Duration</Label>
              <Input
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g., 40 hours, 3 months"
              />
            </div>

            <div>
              <Label>Certificate URL</Label>
              <Input
                value={formData.certificateUrl}
                onChange={(e) => setFormData({ ...formData, certificateUrl: e.target.value })}
                placeholder="URL to your certificate (optional)"
              />
            </div>

            <div>
              <Label>Certificate Number</Label>
              <Input
                value={formData.certificateNumber}
                onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })}
                placeholder="Certificate ID or number (optional)"
              />
            </div>

            <div>
              <Label>Skills Learned</Label>
              <Input
                value={formData.skillsLearned}
                onChange={(e) => setFormData({ ...formData, skillsLearned: e.target.value })}
                placeholder="Comma-separated list (e.g., React, TypeScript, Testing)"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of what you learned..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {submitting ? 'Submitting...' : 'Submit Course'}
              </Button>
              <Button
                onClick={() => setShowSubmitModal(false)}
                variant="outline"
                className="flex-1"
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
