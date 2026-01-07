'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Video, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addWeeks,
  addMonths,
  subWeeks,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  startOfDay,
} from 'date-fns';

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  meetingType: string;
  location: string | null;
  zoomJoinUrl: string | null;
  organizer: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  attendees: Array<{
    responseStatus: string;
    employee: {
      user: {
        firstName: string;
        lastName: string;
      };
    };
  }>;
}

interface MeetingCalendarProps {
  meetings: Meeting[];
  onMeetingClick?: (meeting: Meeting) => void;
  view?: 'week' | 'month';
}

const meetingTypeColors = {
  ONE_ON_ONE: 'bg-purple-500 border-purple-600',
  TEAM: 'bg-blue-500 border-blue-600',
  DEPARTMENT: 'bg-green-500 border-green-600',
  ALL_HANDS: 'bg-orange-500 border-orange-600',
  INTERVIEW: 'bg-pink-500 border-pink-600',
  CLIENT: 'bg-cyan-500 border-cyan-600',
  TRAINING: 'bg-yellow-500 border-yellow-600',
  OTHER: 'bg-slate-500 border-slate-600',
};

export default function MeetingCalendar({
  meetings,
  onMeetingClick,
  view: initialView = 'week',
}: MeetingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>(initialView);

  const handlePrevious = () => {
    if (view === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (view === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getDaysInView = () => {
    if (view === 'week') {
      return eachDayOfInterval({
        start: startOfWeek(currentDate, { weekStartsOn: 1 }), // Monday
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      });
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

      return eachDayOfInterval({
        start: calendarStart,
        end: calendarEnd,
      });
    }
  };

  const getMeetingsForDay = (day: Date) => {
    return meetings.filter((meeting) => {
      const meetingDate = startOfDay(parseISO(meeting.startTime));
      return isSameDay(meetingDate, day);
    });
  };

  const days = getDaysInView();
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Card>
      <CardContent className="p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-900">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView('week')}
                className={view === 'week' ? 'bg-purple-50 border-purple-600 text-purple-700' : ''}
              >
                Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView('month')}
                className={view === 'month' ? 'bg-purple-50 border-purple-600 text-purple-700' : ''}
              >
                Month
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleToday}>
              <CalendarIcon className="h-4 w-4 mr-1" />
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className={`grid ${view === 'week' ? 'grid-cols-7' : 'grid-cols-7'} gap-2`}>
          {/* Day Headers */}
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-slate-600 py-2 border-b border-slate-200"
            >
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {days.map((day, index) => {
            const dayMeetings = getMeetingsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);

            return (
              <div
                key={index}
                className={`min-h-32 p-2 border border-slate-200 rounded-lg ${
                  isDayToday ? 'bg-purple-50 border-purple-300' : 'bg-white'
                } ${!isCurrentMonth && view === 'month' ? 'opacity-30' : ''}`}
              >
                {/* Day Number */}
                <div
                  className={`text-sm font-semibold mb-2 ${
                    isDayToday
                      ? 'bg-purple-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
                      : 'text-slate-700'
                  }`}
                >
                  {format(day, 'd')}
                </div>

                {/* Meetings for this day */}
                <div className="space-y-1">
                  {dayMeetings.slice(0, view === 'week' ? 10 : 3).map((meeting) => (
                    <div
                      key={meeting.id}
                      onClick={() => onMeetingClick?.(meeting)}
                      className={`${
                        meetingTypeColors[meeting.meetingType as keyof typeof meetingTypeColors]
                      } text-white text-xs p-1.5 rounded cursor-pointer hover:opacity-90 transition-opacity border-l-2`}
                    >
                      <div className="font-semibold truncate">{meeting.title}</div>
                      <div className="flex items-center gap-1 mt-0.5 text-white/90">
                        <span>{format(parseISO(meeting.startTime), 'h:mm a')}</span>
                        {meeting.zoomJoinUrl && <Video className="h-3 w-3" />}
                        {!meeting.zoomJoinUrl && meeting.location && <MapPin className="h-3 w-3" />}
                      </div>
                    </div>
                  ))}
                  {dayMeetings.length > (view === 'week' ? 10 : 3) && (
                    <div className="text-xs text-slate-500 text-center">
                      +{dayMeetings.length - (view === 'week' ? 10 : 3)} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <p className="text-sm font-medium text-slate-700 mb-2">Meeting Types:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(meetingTypeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${color.split(' ')[0]}`}></div>
                <span className="text-xs text-slate-600">{type.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
