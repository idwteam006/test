'use client';

import { useState } from 'react';
import { Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TimesheetEntry {
  id: string;
  status: string;
  description: string;
  hoursWorked: number;
}

interface SubmissionWorkflowProps {
  entries: TimesheetEntry[];
  weekStart: Date;
  weekEnd: Date;
  totalHours: number;
  onSubmitSuccess: () => void;
}

export default function SubmissionWorkflow({
  entries,
  weekStart,
  weekEnd,
  totalHours,
  onSubmitSuccess,
}: SubmissionWorkflowProps) {
  const [submitting, setSubmitting] = useState(false);

  const draftEntries = entries.filter((e) => e.status === 'DRAFT');
  const submittedEntries = entries.filter((e) => e.status === 'SUBMITTED');
  const approvedEntries = entries.filter((e) => e.status === 'APPROVED');
  const rejectedEntries = entries.filter((e) => e.status === 'REJECTED');

  const canSubmit = draftEntries.length > 0 && !submitting;
  const hasSubmitted = submittedEntries.length > 0 || approvedEntries.length > 0;

  const handleSubmit = async () => {
    // Validation
    const errors: string[] = [];

    if (draftEntries.length === 0) {
      errors.push('No entries to submit');
    }

    if (totalHours === 0) {
      errors.push('Total hours cannot be zero');
    }

    const invalidEntries = draftEntries.filter((e) => !e.description || e.description.length < 10);
    if (invalidEntries.length > 0) {
      errors.push(`${invalidEntries.length} entries have invalid descriptions`);
    }

    if (errors.length > 0) {
      toast.error('Cannot submit week', {
        description: errors.join('. '),
      });
      return;
    }

    // Confirm
    const confirmed = confirm(
      `Submit ${draftEntries.length} entries (${totalHours.toFixed(1)} hours) for approval?\n\nOnce submitted, you cannot edit these entries.`
    );

    if (!confirmed) return;

    setSubmitting(true);
    try {
      const entryIds = draftEntries.map((e) => e.id);

      const response = await fetch('/api/employee/timesheets/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryIds,
          weekStart: format(weekStart, 'yyyy-MM-dd'),
          weekEnd: format(weekEnd, 'yyyy-MM-dd'),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Week submitted for approval!', {
          description: `${entryIds.length} entries submitted`,
        });
        onSubmitSuccess();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to submit week:', error);
      toast.error(error.message || 'Failed to submit week');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-purple-200">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Status Summary */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Week Submission</h3>
            <div className="flex gap-2">
              {draftEntries.length > 0 && (
                <Badge variant="outline" className="bg-slate-100">
                  <Clock className="h-3 w-3 mr-1" />
                  {draftEntries.length} Draft
                </Badge>
              )}
              {submittedEntries.length > 0 && (
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                  <Send className="h-3 w-3 mr-1" />
                  {submittedEntries.length} Submitted
                </Badge>
              )}
              {approvedEntries.length > 0 && (
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {approvedEntries.length} Approved
                </Badge>
              )}
              {rejectedEntries.length > 0 && (
                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                  <XCircle className="h-3 w-3 mr-1" />
                  {rejectedEntries.length} Rejected
                </Badge>
              )}
            </div>
          </div>

          {/* Submission Status */}
          {hasSubmitted ? (
            <Alert className="border-blue-200 bg-blue-50">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900">Week Submitted</AlertTitle>
              <AlertDescription className="text-blue-800">
                {submittedEntries.length > 0 && `${submittedEntries.length} entries pending approval. `}
                {approvedEntries.length > 0 && `${approvedEntries.length} entries approved. `}
                You'll be notified when your manager reviews your timesheet.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>Ready to Submit</AlertTitle>
              <AlertDescription>
                You have {draftEntries.length} draft entries totaling {totalHours.toFixed(1)} hours.
                Submit your week for manager approval.
              </AlertDescription>
            </Alert>
          )}

          {/* Rejected Entries Alert */}
          {rejectedEntries.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-900">Entries Rejected</AlertTitle>
              <AlertDescription className="text-red-800">
                {rejectedEntries.length} entries were rejected by your manager.
                Please review, update, and resubmit them.
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {hasSubmitted ? 'Resubmit Week' : 'Submit Week for Approval'}
              </>
            )}
          </Button>

          {!canSubmit && (
            <p className="text-xs text-center text-slate-500">
              {entries.length === 0
                ? 'Add time entries to submit'
                : 'All entries have been submitted'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
