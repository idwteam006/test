'use client';

import { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Edit2,
  Save,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';

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
      };
    };
  }>;
}

interface MeetingDetailsModalProps {
  meeting: Meeting | null;
  onClose: () => void;
  onUpdate?: (meetingId: string, updates: any) => void;
  isOrganizer?: boolean;
}

const responseIcons = {
  ACCEPTED: <CheckCircle className="h-4 w-4 text-green-600" />,
  DECLINED: <XCircle className="h-4 w-4 text-red-600" />,
  TENTATIVE: <AlertCircle className="h-4 w-4 text-orange-600" />,
  PENDING: <Clock className="h-4 w-4 text-slate-400" />,
};

const statusColors = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-slate-100 text-slate-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function MeetingDetailsModal({
  meeting,
  onClose,
  onUpdate,
  isOrganizer = false,
}: MeetingDetailsModalProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(meeting?.notes || '');
  const [actionItems, setActionItems] = useState<string[]>(
    meeting?.actionItems ? (Array.isArray(meeting.actionItems) ? meeting.actionItems : []) : []
  );
  const [newActionItem, setNewActionItem] = useState('');
  const [saving, setSaving] = useState(false);

  if (!meeting) return null;

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await onUpdate?.(meeting.id, { notes, actionItems });
      setIsEditingNotes(false);
      toast.success('Notes saved successfully');
    } catch (error) {
      toast.error('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleAddActionItem = () => {
    if (newActionItem.trim()) {
      setActionItems([...actionItems, newActionItem.trim()]);
      setNewActionItem('');
    }
  };

  const handleRemoveActionItem = (index: number) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl my-8">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{meeting.title}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white">
                  {meeting.meetingType.replace('_', ' ')}
                </Badge>
                <Badge className={statusColors[meeting.status as keyof typeof statusColors]}>
                  {meeting.status}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Description */}
          {meeting.description && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
              <p className="text-slate-600">{meeting.description}</p>
            </div>
          )}

          {/* Meeting Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Date</p>
                <p className="text-sm font-medium text-slate-900">
                  {format(new Date(meeting.startTime), 'PPP')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Time</p>
                <p className="text-sm font-medium text-slate-900">
                  {format(new Date(meeting.startTime), 'p')} -{' '}
                  {format(new Date(meeting.endTime), 'p')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Organizer</p>
                <p className="text-sm font-medium text-slate-900">
                  {meeting.organizer.user.firstName} {meeting.organizer.user.lastName}
                </p>
              </div>
            </div>

            {meeting.location && (
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  {meeting.zoomJoinUrl ? (
                    <Video className="h-5 w-5 text-orange-600" />
                  ) : (
                    <MapPin className="h-5 w-5 text-orange-600" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Location</p>
                  <p className="text-sm font-medium text-slate-900">{meeting.location}</p>
                </div>
              </div>
            )}
          </div>

          {/* Zoom Link */}
          {meeting.zoomJoinUrl && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Video className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Zoom Meeting</p>
                    <p className="text-xs text-blue-700">Join the video conference</p>
                  </div>
                </div>
                <a
                  href={meeting.zoomJoinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Join Meeting
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}

          {/* Agenda */}
          {meeting.agenda && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Agenda
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{meeting.agenda}</p>
              </div>
            </div>
          )}

          {/* Attendees */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Attendees ({meeting.attendees.length})
            </h3>
            <div className="space-y-2">
              {meeting.attendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-200 w-10 h-10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-slate-700">
                        {attendee.employee.user.firstName[0]}
                        {attendee.employee.user.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {attendee.employee.user.firstName} {attendee.employee.user.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{attendee.employee.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {responseIcons[attendee.responseStatus as keyof typeof responseIcons]}
                    <span className="text-xs text-slate-600">{attendee.responseStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes (Organizer Only) */}
          {isOrganizer && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Meeting Notes
                </h3>
                {!isEditingNotes && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              {isEditingNotes ? (
                <div className="space-y-3">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add meeting notes..."
                    rows={6}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />

                  {/* Action Items */}
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Action Items</p>
                    <div className="space-y-2 mb-2">
                      {actionItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => {
                              const updated = [...actionItems];
                              updated[index] = e.target.value;
                              setActionItems(updated);
                            }}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveActionItem(index)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newActionItem}
                        onChange={(e) => setNewActionItem(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddActionItem()}
                        placeholder="Add action item..."
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <Button onClick={handleAddActionItem} variant="outline" size="sm">
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingNotes(false);
                        setNotes(meeting.notes || '');
                        setActionItems(meeting.actionItems || []);
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveNotes}
                      disabled={saving}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {saving ? 'Saving...' : 'Save Notes'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-lg">
                  {notes ? (
                    <div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap mb-3">{notes}</p>
                      {actionItems.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-2">Action Items:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {actionItems.map((item, index) => (
                              <li key={index} className="text-sm text-slate-600">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No notes added yet</p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
