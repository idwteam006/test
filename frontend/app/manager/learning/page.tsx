'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Star,
  FileText,
  User,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface CourseSubmission {
  id: string;
  employee: {
    id: string;
    name: string;
    email: string;
  };
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

export default function ManagerLearningPage() {
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<CourseSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<CourseSubmission[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseSubmission | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const [reviewData, setReviewData] = useState({
    status: '',
    reviewComments: '',
    rating: '',
  });

  useEffect(() => {
    fetchSubmissions();
  }, []);

  useEffect(() => {
    filterSubmissions();
  }, [submissions, statusFilter]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/manager/courses');
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

  const filterSubmissions = () => {
    if (statusFilter === 'all') {
      setFilteredSubmissions(submissions);
    } else {
      setFilteredSubmissions(submissions.filter(s => s.status === statusFilter));
    }
  };

  const handleReview = (course: CourseSubmission) => {
    setSelectedCourse(course);
    setReviewData({
      status: '',
      reviewComments: '',
      rating: '',
    });
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!selectedCourse || !reviewData.status) {
      toast.error('Please select a review status');
      return;
    }

    try {
      setReviewing(true);

      const res = await fetch('/api/manager/courses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          status: reviewData.status,
          reviewComments: reviewData.reviewComments || undefined,
          rating: reviewData.rating ? parseInt(reviewData.rating) : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Course ${reviewData.status.toLowerCase().replace('_', ' ')} successfully!`);
        setShowReviewModal(false);
        setSelectedCourse(null);
        fetchSubmissions();
      } else {
        toast.error(data.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setReviewing(false);
    }
  };

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'PENDING_REVIEW').length,
    approved: submissions.filter(s => s.status === 'APPROVED').length,
    rejected: submissions.filter(s => s.status === 'REJECTED').length,
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          Team Learning & Development
        </h1>
        <p className="text-slate-600 mt-2">
          Review and approve course completions from your team members
        </p>
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

        <Card className="border-l-4 border-l-red-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
              <XCircle className="h-8 w-8 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-slate-600" />
            <Label>Filter by Status:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Submissions</SelectItem>
                <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="REVISION_REQUIRED">Revision Required</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Submissions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-600" />
            Course Submissions ({filteredSubmissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Submissions Found</h3>
              <p className="text-slate-600">
                {statusFilter === 'all'
                  ? 'Your team members haven\'t submitted any courses yet'
                  : `No submissions with status: ${statusFilter.replace('_', ' ')}`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((submission) => (
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

                      <div className="flex items-center gap-2 text-sm text-slate-700 mb-3">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{submission.employee.name}</span>
                        <span className="text-slate-500">({submission.employee.email})</span>
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
                            <Clock className="h-4 w-4" />
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

                      {submission.status !== 'PENDING_REVIEW' && submission.reviewComments && (
                        <div className={`p-3 rounded-lg border text-sm ${
                          submission.status === 'APPROVED'
                            ? 'bg-green-50 border-green-200'
                            : submission.status === 'REJECTED'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-orange-50 border-orange-200'
                        }`}>
                          <p className="font-medium mb-1">Review Comments:</p>
                          <p>{submission.reviewComments}</p>
                          {submission.rating && (
                            <p className="mt-2">
                              <Star className="h-4 w-4 inline text-yellow-500 fill-yellow-500" />
                              {' '}Rating: {submission.rating}/5
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {submission.certificateUrl && (
                        <Button
                          onClick={() => window.open(submission.certificateUrl, '_blank')}
                          variant="outline"
                          size="sm"
                          className="border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Certificate
                        </Button>
                      )}
                      {submission.status === 'PENDING_REVIEW' && (
                        <Button
                          onClick={() => handleReview(submission)}
                          size="sm"
                          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                        >
                          Review
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Course Submission</DialogTitle>
          </DialogHeader>

          {selectedCourse && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">{selectedCourse.courseTitle}</h3>
                <p className="text-sm text-slate-600">
                  Submitted by: {selectedCourse.employee.name}
                </p>
              </div>

              <div>
                <Label>Review Decision *</Label>
                <Select value={reviewData.status} onValueChange={(value) => setReviewData({ ...reviewData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select review status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPROVED">Approve</SelectItem>
                    <SelectItem value="REJECTED">Reject</SelectItem>
                    <SelectItem value="REVISION_REQUIRED">Request Revision</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reviewData.status === 'APPROVED' && (
                <div>
                  <Label>Rating (1-5)</Label>
                  <Select value={reviewData.rating} onValueChange={(value) => setReviewData({ ...reviewData, rating: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 - Excellent</SelectItem>
                      <SelectItem value="4">4 - Very Good</SelectItem>
                      <SelectItem value="3">3 - Good</SelectItem>
                      <SelectItem value="2">2 - Fair</SelectItem>
                      <SelectItem value="1">1 - Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Comments</Label>
                <Textarea
                  value={reviewData.reviewComments}
                  onChange={(e) => setReviewData({ ...reviewData, reviewComments: e.target.value })}
                  placeholder="Add your review comments..."
                  rows={4}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={submitReview}
                  disabled={reviewing}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  {reviewing ? 'Submitting...' : 'Submit Review'}
                </Button>
                <Button
                  onClick={() => setShowReviewModal(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={reviewing}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
