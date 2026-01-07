'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Plus,
  Video,
  Users,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  ExternalLink,
  List,
  CalendarDays,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import MeetingCalendar from '@/components/meetings/MeetingCalendar';
import MeetingDetailsModal from '@/components/meetings/MeetingDetailsModal';

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
  zoomStartUrl: string | null;
  agenda: string | null;
  notes: string | null;
  actionItems: any;
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
        email: string;
        avatarUrl: string | null;
      };
    };
  }>;
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  jobTitle: string;
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
  RESCHEDULED: 'bg-orange-100 text-orange-700 border-orange-300',
};

const responseIcons = {
  ACCEPTED: <CheckCircle className="h-4 w-4 text-green-600" />,
  DECLINED: <XCircle className="h-4 w-4 text-red-600" />,
  TENTATIVE: <AlertCircle className="h-4 w-4 text-orange-600" />,
  PENDING: <Clock className="h-4 w-4 text-slate-400" />,
};

export default function ManagerMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    duration: '60', // minutes
    meetingType: 'ONE_ON_ONE',
    location: '',
    agenda: '',
    attendeeIds: [] as string[],
    createZoomMeeting: true,
  });

  useEffect(() => {
    fetchMeetings();
    fetchTeamMembers();
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

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch('/api/manager/team');
      const data = await res.json();

      if (data.success) {
        const employees = data.members?.map((member: any) => ({
          id: member.employee?.id || member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          employeeId: member.employeeId,
          jobTitle: member.employee?.jobTitle || 'N/A',
        })) || [];
        setTeamMembers(employees);

        // Auto-select all employees for group meetings by default
        const allEmployeeIds = employees.map((emp: any) => emp.id);
        setFormData(prev => ({ ...prev, attendeeIds: allEmployeeIds }));
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  const handleCreateMeeting = async () => {
    if (!formData.title || !formData.startDate || !formData.startTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.attendeeIds.length === 0) {
      toast.error('Please select at least one attendee');
      return;
    }

    setSubmitting(true);
    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(formData.duration) * 60000);

      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          meetingType: formData.meetingType,
          location: formData.location,
          agenda: formData.agenda,
          attendeeIds: formData.attendeeIds,
          createZoomMeeting: formData.createZoomMeeting,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Show warning if Zoom failed but meeting was created
        if (data.warning) {
          toast.warning(data.warning, {
            duration: 5000,
            description: 'Meeting created successfully without Zoom link',
          });
        } else {
          toast.success('Meeting created successfully!');
        }
        setShowCreateModal(false);
        resetForm();
        fetchMeetings();
      } else {
        toast.error(data.error || 'Failed to create meeting');
      }
    } catch (error) {
      toast.error('Failed to create meeting');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMeeting = async (meetingId: string, updates: any) => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Meeting updated successfully!');
        fetchMeetings();
        return data.meeting;
      } else {
        toast.error(data.error || 'Failed to update meeting');
      }
    } catch (error) {
      toast.error('Failed to update meeting');
      throw error;
    }
  };

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setShowDetailsModal(true);
  };

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

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Are you sure you want to cancel this meeting?')) {
      return;
    }

    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Meeting cancelled successfully!');
        fetchMeetings();
      } else {
        toast.error(data.error || 'Failed to cancel meeting');
      }
    } catch (error) {
      toast.error('Failed to cancel meeting');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startDate: '',
      startTime: '',
      duration: '60',
      meetingType: 'ONE_ON_ONE',
      location: '',
      agenda: '',
      attendeeIds: [],
      createZoomMeeting: true,
    });
  };

  const toggleAttendee = (employeeId: string) => {
    setFormData((prev) => ({
      ...prev,
      attendeeIds: prev.attendeeIds.includes(employeeId)
        ? prev.attendeeIds.filter((id) => id !== employeeId)
        : [...prev.attendeeIds, employeeId],
    }));
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Meetings
          </h1>
          <p className="text-slate-600 mt-2">
            Schedule and manage team meetings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-white shadow text-purple-600' : 'text-slate-600 hover:text-slate-900'}
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('calendar')}
              className={viewMode === 'calendar' ? 'bg-white shadow text-purple-600' : 'text-slate-600 hover:text-slate-900'}
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              Calendar
            </Button>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleExportCalendar}
              variant="outline"
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Calendar
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          </div>
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
              <Users className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <MeetingCalendar meetings={meetings} onMeetingClick={handleMeetingClick} />
      )}

      {/* List View - Upcoming Meetings */}
      {viewMode === 'list' && (
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">
            Upcoming Meetings ({upcomingMeetings.length})
          </h2>
        {upcomingMeetings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No upcoming meetings</h3>
              <p className="text-slate-600 mb-4">
                Schedule a meeting to connect with your team
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {upcomingMeetings.map((meeting) => (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
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
                          <Badge variant="outline" className={statusColors[meeting.status as keyof typeof statusColors]}>
                            {meeting.status}
                          </Badge>
                        </div>
                        {meeting.description && (
                          <p className="text-slate-600 mb-3">{meeting.description}</p>
                        )}

                        {/* Meeting Details */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
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
                          {meeting.location && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <MapPin className="h-4 w-4" />
                              <span>{meeting.location}</span>
                            </div>
                          )}
                          {meeting.zoomJoinUrl && (
                            <div className="flex items-center gap-2 text-sm">
                              <Video className="h-4 w-4 text-blue-600" />
                              <a
                                href={meeting.zoomJoinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                              >
                                Join Zoom Meeting
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Attendees */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-slate-700">Attendees:</span>
                          {meeting.attendees.map((attendee) => (
                            <div
                              key={attendee.id}
                              className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-full"
                            >
                              {responseIcons[attendee.responseStatus as keyof typeof responseIcons]}
                              <span className="text-xs text-slate-700">
                                {attendee.employee.user.firstName} {attendee.employee.user.lastName}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          onClick={() => handleMeetingClick(meeting)}
                          variant="outline"
                          size="sm"
                          className="border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                          View Details
                        </Button>
                        <Button
                          onClick={() => window.location.href = `/api/meetings/export?meetingId=${meeting.id}`}
                          variant="outline"
                          size="sm"
                          className="border-purple-600 text-purple-600 hover:bg-purple-50"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteMeeting(meeting.id)}
                          variant="outline"
                          size="sm"
                          className="border-red-600 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
        </div>
      )}

      {/* Meeting Details Modal */}
      {showDetailsModal && selectedMeeting && (
        <MeetingDetailsModal
          meeting={selectedMeeting}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedMeeting(null);
          }}
          onUpdate={handleUpdateMeeting}
          isOrganizer={true}
        />
      )}

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <Card className="w-full max-w-lg max-h-[90vh] flex flex-col">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg flex-shrink-0">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule New Meeting
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Weekly 1-on-1 with John"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add meeting description..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Duration (minutes)
                  </label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Meeting Type
                  </label>
                  <select
                    value={formData.meetingType}
                    onChange={(e) => setFormData({ ...formData, meetingType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="ONE_ON_ONE">1-on-1</option>
                    <option value="TEAM">Team Meeting</option>
                    <option value="DEPARTMENT">Department</option>
                    <option value="ALL_HANDS">All Hands</option>
                    <option value="INTERVIEW">Interview</option>
                    <option value="CLIENT">Client Meeting</option>
                    <option value="TRAINING">Training</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Agenda
                </label>
                <textarea
                  value={formData.agenda}
                  onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                  placeholder="Meeting agenda..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={formData.createZoomMeeting}
                    onChange={(e) =>
                      setFormData({ ...formData, createZoomMeeting: e.target.checked })
                    }
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                    <Video className="h-4 w-4" />
                    Create Zoom Meeting
                  </span>
                </label>
              </div>

              {!formData.createZoomMeeting && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Conference Room A, Building 2"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Select Attendees * ({formData.attendeeIds.length} selected)
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (formData.attendeeIds.length === teamMembers.length) {
                        setFormData({ ...formData, attendeeIds: [] });
                      } else {
                        setFormData({ ...formData, attendeeIds: teamMembers.map(m => m.id) });
                      }
                    }}
                    className="text-xs text-purple-600 hover:text-purple-700"
                  >
                    {formData.attendeeIds.length === teamMembers.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="border border-slate-300 rounded-md max-h-40 overflow-y-auto p-2">
                  {teamMembers.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.attendeeIds.includes(member.id)}
                        onChange={() => toggleAttendee(member.id)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {member.jobTitle} • {member.email}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

            </CardContent>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                disabled={submitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateMeeting}
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {submitting ? 'Creating...' : 'Schedule Meeting'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
