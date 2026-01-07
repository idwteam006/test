'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  User,
  MapPin,
  Briefcase,
  FileText,
  AlertCircle,
  Mail,
  Phone,
  Calendar,
  Building,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ReviewOnboardingPage() {
  const router = useRouter();
  const params = useParams();
  const inviteId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [submission, setSubmission] = useState<any>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const response = await fetch(`/api/hr/onboarding/pending?status=SUBMITTED`);
        const data = await response.json();

        if (data.success) {
          const found = data.data.find((s: any) => s.invite.id === inviteId);
          if (found) {
            setSubmission(found);
          } else {
            toast.error('Submission not found');
            router.push('/hr/onboarding');
          }
        }
      } catch (error) {
        toast.error('Failed to fetch submission');
        router.push('/hr/onboarding');
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [inviteId, router]);

  const handleApprove = async () => {
    setApproving(true);

    try {
      const response = await fetch('/api/hr/onboarding/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Onboarding approved successfully!');
        toast.info('Employee has been activated and notified via email.');
        router.push('/hr/onboarding');
      } else {
        toast.error(data.error || 'Failed to approve onboarding');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setApproving(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!feedback || feedback.length < 10) {
      toast.error('Please provide detailed feedback (at least 10 characters)');
      return;
    }

    setRequesting(true);

    try {
      const response = await fetch('/api/hr/onboarding/request-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, feedback }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Changes requested successfully!');
        toast.info('Employee will be notified via email.');
        router.push('/hr/onboarding');
      } else {
        toast.error(data.error || 'Failed to request changes');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setRequesting(false);
      setShowRejectDialog(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!submission) {
    return null;
  }

  const { invite, user, profile } = submission;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 p-4">
      <div className="max-w-5xl mx-auto py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-4 text-white hover:bg-white/10"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Onboarding
        </Button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Review Onboarding: {invite.firstName} {invite.lastName}
          </h1>
          <p className="text-white/90">Employee ID: {user.employeeId}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleApprove}
            disabled={approving || requesting}
          >
            {approving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve Onboarding
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="flex-1 bg-white/10 text-white border-white/20 hover:bg-white/20"
            onClick={() => setShowRejectDialog(true)}
            disabled={approving || requesting}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Request Changes
          </Button>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card className="border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{invite.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Employee ID</Label>
                <p className="font-medium">{user.employeeId}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Department</Label>
                <p className="font-medium">{user.department.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Designation</Label>
                <p className="font-medium">{invite.designation}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Employment Type</Label>
                <Badge>{invite.employmentType.replace('_', ' ')}</Badge>
              </div>
              <div>
                <Label className="text-muted-foreground">Joining Date</Label>
                <p className="font-medium">{formatDate(invite.joiningDate)}</p>
              </div>
              {invite.workLocation && (
                <div>
                  <Label className="text-muted-foreground">Work Location</Label>
                  <p className="font-medium">{invite.workLocation}</p>
                </div>
              )}
              {user.manager && (
                <div>
                  <Label className="text-muted-foreground">Reporting Manager</Label>
                  <p className="font-medium">
                    {user.manager.firstName} {user.manager.lastName}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal Information */}
          {profile && (
            <>
              <Card className="border-0 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p className="font-medium">
                      {invite.firstName} {profile.middleName || ''} {invite.lastName}
                    </p>
                  </div>
                  {profile.preferredName && (
                    <div>
                      <Label className="text-muted-foreground">Preferred Name</Label>
                      <p className="font-medium">{profile.preferredName}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Date of Birth</Label>
                    <p className="font-medium">{formatDate(profile.dateOfBirth)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Gender</Label>
                    <p className="font-medium">{profile.gender}</p>
                  </div>
                  {profile.bloodGroup && (
                    <div>
                      <Label className="text-muted-foreground">Blood Group</Label>
                      <p className="font-medium">{profile.bloodGroup}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Personal Phone</Label>
                    <p className="font-medium">{profile.personalPhone}</p>
                  </div>
                  {profile.personalEmail && (
                    <div>
                      <Label className="text-muted-foreground">Personal Email</Label>
                      <p className="font-medium">{profile.personalEmail}</p>
                    </div>
                  )}
                  {profile.alternatePhone && (
                    <div>
                      <Label className="text-muted-foreground">Alternate Phone</Label>
                      <p className="font-medium">{profile.alternatePhone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card className="border-0 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Address Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground font-semibold">Current Address</Label>
                    {profile.currentAddress && (
                      <p className="font-medium mt-1">
                        {profile.currentAddress.street}, {profile.currentAddress.city},{' '}
                        {profile.currentAddress.state} - {profile.currentAddress.pincode},{' '}
                        {profile.currentAddress.country}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground font-semibold">Permanent Address</Label>
                    {profile.sameAsCurrentAddress ? (
                      <p className="font-medium text-muted-foreground mt-1">Same as current address</p>
                    ) : profile.permanentAddress ? (
                      <p className="font-medium mt-1">
                        {profile.permanentAddress.street}, {profile.permanentAddress.city},{' '}
                        {profile.permanentAddress.state} - {profile.permanentAddress.pincode},{' '}
                        {profile.permanentAddress.country}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              {/* Professional Information */}
              <Card className="border-0 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Professional Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Highest Qualification</Label>
                    <p className="font-medium">{profile.highestQualification}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">University</Label>
                    <p className="font-medium">{profile.university}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Year of Passing</Label>
                    <p className="font-medium">{profile.yearOfPassing}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Years of Experience</Label>
                    <p className="font-medium">{profile.yearsOfExperience} years</p>
                  </div>
                  {profile.previousCompany && (
                    <div>
                      <Label className="text-muted-foreground">Previous Company</Label>
                      <p className="font-medium">{profile.previousCompany}</p>
                    </div>
                  )}
                  {profile.skills && profile.skills.length > 0 && (
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground">Skills</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {profile.skills.map((skill: string, index: number) => (
                          <Badge key={index} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {profile.linkedinUrl && (
                    <div>
                      <Label className="text-muted-foreground">LinkedIn</Label>
                      <a
                        href={profile.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        View Profile
                      </a>
                    </div>
                  )}
                  {profile.githubUrl && (
                    <div>
                      <Label className="text-muted-foreground">GitHub</Label>
                      <a
                        href={profile.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        View Profile
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card className="border-0 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Emergency Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{profile.emergencyContactName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Relationship</Label>
                    <p className="font-medium">{profile.emergencyRelationship}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{profile.emergencyPhone}</p>
                  </div>
                  {profile.emergencyAlternatePhone && (
                    <div>
                      <Label className="text-muted-foreground">Alternate Phone</Label>
                      <p className="font-medium">{profile.emergencyAlternatePhone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Documents */}
              <Card className="border-0 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Resume/CV</Label>
                    <a
                      href={profile.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline block"
                    >
                      View Document
                    </a>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Photo ID</Label>
                    <a
                      href={profile.photoIdUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline block"
                    >
                      View Document
                    </a>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Address Proof</Label>
                    <a
                      href={profile.addressProofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline block"
                    >
                      View Document
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Bank Details (if provided) */}
              {profile.accountNumber && (
                <Card className="border-0 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Bank Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Account Holder Name</Label>
                      <p className="font-medium">{profile.accountHolderName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Account Number</Label>
                      <p className="font-medium">{profile.accountNumber}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Bank Name</Label>
                      <p className="font-medium">{profile.bankName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">IFSC Code</Label>
                      <p className="font-medium">{profile.ifscCode}</p>
                    </div>
                    {profile.branchName && (
                      <div>
                        <Label className="text-muted-foreground">Branch</Label>
                        <p className="font-medium">{profile.branchName}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Declarations */}
              <Card className="border-0 shadow-2xl bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    <CheckCircle2 className="h-5 w-5" />
                    Declarations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <p className="text-sm">Information accuracy confirmed</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <p className="text-sm">Company policies agreed</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <p className="text-sm">Background verification consent provided</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Request Changes Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Changes</DialogTitle>
              <DialogDescription>
                Provide feedback for the employee to update their onboarding information.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="feedback">Feedback *</Label>
                <Textarea
                  id="feedback"
                  placeholder="Please specify what needs to be changed and why..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={5}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum 10 characters required
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(false)}
                disabled={requesting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestChanges}
                disabled={requesting || feedback.length < 10}
              >
                {requesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Feedback'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
