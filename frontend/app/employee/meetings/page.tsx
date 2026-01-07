'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Video,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  User,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  meetingType: string;
  status: string;
  zoomJoinUrl: string | null;
  agenda: string | null;
  notes: string | null;
  organizer: {
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  attendees: Array<{
    id: string;
    responseStatus: string;
    employee: {
      user: {
        firstName: string;
        lastName: string;
      };
    };
  }>;
}

const meetingTypeColors = {
  ONE_ON_ONE: 'bg-purple-500',
  TEAM: 'bg-blue-500',
  DEPARTMENT: 'bg-green-500',
  ALL_HANDS: 'bg-orange-500',
  INTERVIEW: 'bg-pink-500',
  CLIENT: 'bg-cyan-500',
  TRAINING: 'bg-yellow-500',
  OTHER: 'bg-slate-500',
};

const statusColors = {
  SCHEDULED: 'bg-blue-100 text-blue-700 border-blue-300',
  IN_PROGRESS: 'bg-green-100 text-green-700 border-green-300',
  COMPLETED: 'bg-slate-100 text-slate-700 border-slate-300',
  CANCELLED: 'bg-red-100 text-red-700 border-red-300',
};

export default function EmployeeMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/meetings');
      const data = await res.json();

      if (data.success) {
        setMeetings(data.meetings);
      } else {
        toast.error(data.error || 'Failed to fetch meetings');
      }
    } catch (error) {
      toast.error('Failed to fetch meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (meetingId: string, response: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE') => {
    setResponding(meetingId);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Meeting ${response.toLowerCase()}`);
        fetchMeetings();
      } else {
        toast.error(data.error || 'Failed to respond');
      }
    } catch (error) {
      toast.error('Failed to respond to meeting');
    } finally {
      setResponding(null);
    }
  };

  const upcomingMeetings = meetings.filter(
    (m) => new Date(m.startTime) > new Date() && m.status === 'SCHEDULED'
  );
  const pastMeetings = meetings.filter(
    (m) => new Date(m.startTime) <= new Date() || m.status === 'COMPLETED'
  );

  const stats = {
    total: meetings.length,
    upcoming: upcomingMeetings.length,
    thisWeek: upcomingMeetings.filter((m) => {
      const diff = new Date(m.startTime).getTime() - new Date().getTime();
      return diff < 7 * 24 * 60 * 60 * 1000;
    }).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const handleExportCalendar = async () => {
    try {
      toast.info('Preparing calendar export...');

      const response = await fetch('/api/meetings/export');

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'zenora_meetings.ics';

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Calendar exported successfully!');
    } catch (error) {
      toast.error('Failed to export calendar');
      console.error('Export error:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              My Meetings
            </h1>
            <p className="text-slate-600 mt-2">
              View and manage your scheduled meetings
            </p>
          </div>
          <Button
            onClick={handleExportCalendar}
            variant="outline"
            className="border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Calendar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-purple-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Meetings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-purple-600">{stats.total}</div>
              <Calendar className="h-8 w-8 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-blue-600">{stats.upcoming}</div>
              <Clock className="h-8 w-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-green-600">{stats.thisWeek}</div>
              <User className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Meetings */}
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">
          Upcoming Meetings ({upcomingMeetings.length})
        </h2>
        {upcomingMeetings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No upcoming meetings</h3>
              <p className="text-slate-600">
                You don't have any scheduled meetings at the moment
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {upcomingMeetings.map((meeting) => {
              const myAttendance = meeting.attendees.find(
                (a) => a.employee.user.firstName && a.employee.user.lastName
              );
              const myResponse = myAttendance?.responseStatus || 'PENDING';

              return (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-slate-900">{meeting.title}</h3>
                            <Badge
                              className={`${
                                meetingTypeColors[meeting.meetingType as keyof typeof meetingTypeColors]
                              } text-white`}
                            >
                              {meeting.meetingType.replace('_', ' ')}
                            </Badge>
                          </div>
                          {meeting.description && (
                            <p className="text-slate-600 mb-3">{meeting.description}</p>
                          )}

                          {/* Meeting Details */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Calendar className="h-4 w-4" />
                              <span>{format(new Date(meeting.startTime), 'PPP')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Clock className="h-4 w-4" />
                              <span>
                                {format(new Date(meeting.startTime), 'p')} -{' '}
                                {format(new Date(meeting.endTime), 'p')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <User className="h-4 w-4" />
                              <span>
                                Organized by {meeting.organizer.user.firstName}{' '}
                                {meeting.organizer.user.lastName}
                              </span>
                            </div>
                            {meeting.location && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <MapPin className="h-4 w-4" />
                                <span>{meeting.location}</span>
                              </div>
                            )}
                          </div>

                          {meeting.agenda && (
                            <div className="bg-slate-50 p-3 rounded-lg mb-4">
                              <p className="text-sm font-medium text-slate-700 mb-1">Agenda:</p>
                              <p className="text-sm text-slate-600">{meeting.agenda}</p>
                            </div>
                          )}

                          {/* Response Status */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-700">Your response:</span>
                            {myResponse === 'PENDING' ? (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleRespond(meeting.id, 'ACCEPTED')}
                                  disabled={responding === meeting.id}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  onClick={() => handleRespond(meeting.id, 'TENTATIVE')}
                                  disabled={responding === meeting.id}
                                  size="sm"
                                  variant="outline"
                                  className="border-orange-600 text-orange-600 hover:bg-orange-50"
                                >
                                  <AlertCircle className="h-4 w-4 mr-1" />
                                  Maybe
                                </Button>
                                <Button
                                  onClick={() => handleRespond(meeting.id, 'DECLINED')}
                                  disabled={responding === meeting.id}
                                  size="sm"
                                  variant="outline"
                                  className="border-red-600 text-red-600 hover:bg-red-50"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Decline
                                </Button>
                              </div>
                            ) : (
                              <Badge
                                variant="outline"
                                className={
                                  myResponse === 'ACCEPTED'
                                    ? 'bg-green-50 text-green-700 border-green-300'
                                    : myResponse === 'DECLINED'
                                      ? 'bg-red-50 text-red-700 border-red-300'
                                      : 'bg-orange-50 text-orange-700 border-orange-300'
                                }
                              >
                                {myResponse === 'ACCEPTED' && <CheckCircle className="h-3 w-3 mr-1" />}
                                {myResponse === 'DECLINED' && <XCircle className="h-3 w-3 mr-1" />}
                                {myResponse === 'TENTATIVE' && <AlertCircle className="h-3 w-3 mr-1" />}
                                {myResponse}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                        {meeting.zoomJoinUrl && (
                          <a
                            href={meeting.zoomJoinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            <Video className="h-4 w-4" />
                            Join Zoom Meeting
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        <Button
                          onClick={() => window.location.href = `/api/meetings/export?meetingId=${meeting.id}`}
                          variant="outline"
                          size="sm"
                          className="border-purple-200 text-purple-700 hover:bg-purple-50"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Export
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Meetings */}
      {pastMeetings.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">
            Past Meetings ({pastMeetings.length})
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {pastMeetings.slice(0, 5).map((meeting) => (
              <Card key={meeting.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{meeting.title}</h3>
                      <p className="text-sm text-slate-600">
                        {format(new Date(meeting.startTime), 'PPP p')}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusColors[meeting.status as keyof typeof statusColors]}>
                      {meeting.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
