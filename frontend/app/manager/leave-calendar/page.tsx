'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Info,
} from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';

interface DayData {
  date: string;
  dayOfWeek: string;
  employeesOnLeave: Array<{
    employeeId: string;
    employeeName: string;
    employeeNumber: string;
    leaveType: string;
    status: string;
  }>;
  onLeaveCount: number;
  availableCount: number;
  coveragePercentage: number;
}

interface TeamMember {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  email: string;
  department?: string;
  leaveCount: number;
  totalDays: number;
  leaves: Array<{
    id: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    days: number;
    status: string;
  }>;
}

export default function TeamLeaveCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendar, setCalendar] = useState<DayData[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    teamSize: 0,
    totalRequests: 0,
    pending: 0,
    approved: 0,
    totalDays: 0,
  });
  const [coverage, setCoverage] = useState({ critical: 0, warning: 0, good: 0 });
  const [peakLeaveDays, setPeakLeaveDays] = useState<DayData[]>([]);

  useEffect(() => {
    fetchCalendar();
  }, [currentMonth]);

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      const monthStr = format(currentMonth, 'yyyy-MM');
      const response = await fetch(`/api/manager/leave/calendar?month=${monthStr}`);
      const data = await response.json();

      if (data.success) {
        setCalendar(data.calendar || []);
        setTeamMembers(data.teamMembers || []);
        setStats({
          teamSize: data.teamSize,
          ...data.stats,
        });
        setCoverage(data.coverage || { critical: 0, warning: 0, good: 0 });
        setPeakLeaveDays(data.peakLeaveDays || []);
      }
    } catch (error) {
      console.error('Failed to fetch calendar:', error);
      toast.error('Failed to load team calendar');
    } finally {
      setLoading(false);
    }
  };

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const today = () => {
    setCurrentMonth(new Date());
  };

  const getCoverageColor = (percentage: number) => {
    if (percentage < 50) return 'bg-red-100 border-red-300 text-red-800';
    if (percentage < 75) return 'bg-orange-100 border-orange-300 text-orange-800';
    return 'bg-green-100 border-green-300 text-green-800';
  };

  const getCoverageIcon = (percentage: number) => {
    if (percentage < 50) return <AlertTriangle className="h-4 w-4" />;
    if (percentage < 75) return <Info className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getLeaveTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      ANNUAL: '🌴',
      SICK: '🏥',
      PERSONAL: '🏠',
      MATERNITY: '👶',
      PATERNITY: '👨‍👧',
      UNPAID: '💼',
    };
    return icons[type] || '📅';
  };

  const isToday = (dateStr: string) => {
    return dateStr === format(new Date(), 'yyyy-MM-dd');
  };

  const isWeekend = (dayOfWeek: string) => {
    return dayOfWeek === 'Sat' || dayOfWeek === 'Sun';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Team Leave Calendar</h1>
          <p className="text-slate-600 mt-1">View team availability and leave coverage</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={today}>
            Today
          </Button>
          <div className="px-4 py-2 bg-slate-100 rounded-md font-semibold min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </div>
          <Button variant="outline" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Team Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.teamSize}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{stats.totalRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">{stats.totalDays}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Coverage Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600 mb-1">Critical Coverage</div>
                <div className="text-2xl font-bold text-red-600">{coverage.critical}</div>
                <div className="text-xs text-slate-500">&lt; 50% available</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600 mb-1">Warning Coverage</div>
                <div className="text-2xl font-bold text-orange-600">{coverage.warning}</div>
                <div className="text-xs text-slate-500">50-75% available</div>
              </div>
              <Info className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600 mb-1">Good Coverage</div>
                <div className="text-2xl font-bold text-green-600">{coverage.good}</div>
                <div className="text-xs text-slate-500">&gt; 75% available</div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Peak Leave Days */}
      {peakLeaveDays.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <TrendingDown className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900">Peak Leave Days</AlertTitle>
          <AlertDescription className="text-orange-800">
            <div className="mt-2 space-y-1">
              {peakLeaveDays.map((day) => (
                <div key={day.date} className="flex items-center gap-2">
                  <span className="font-medium">{format(new Date(day.date), 'MMM d, yyyy')}:</span>
                  <span>
                    {day.onLeaveCount} out of {stats.teamSize} on leave ({Math.round(day.coveragePercentage)}% available)
                  </span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Calendar View
          </CardTitle>
          <CardDescription>
            Color-coded by team coverage percentage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-slate-600 mt-2">Loading calendar...</p>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center font-semibold text-slate-700 py-2">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendar.map((day) => (
                <div
                  key={day.date}
                  className={`min-h-[120px] border rounded-lg p-2 ${
                    isToday(day.date) ? 'border-purple-400 border-2 bg-purple-50' : getCoverageColor(day.coveragePercentage)
                  } ${isWeekend(day.dayOfWeek) ? 'bg-opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-semibold ${isToday(day.date) ? 'text-purple-900' : 'text-slate-700'}`}>
                      {format(new Date(day.date), 'd')}
                    </span>
                    {day.onLeaveCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {day.onLeaveCount}/{stats.teamSize}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    {day.employeesOnLeave.map((emp) => (
                      <div
                        key={`${emp.employeeId}-${day.date}`}
                        className="text-xs bg-white bg-opacity-70 rounded px-1 py-0.5 truncate"
                        title={`${emp.employeeName} - ${emp.leaveType}`}
                      >
                        <span className="mr-1">{getLeaveTypeIcon(emp.leaveType)}</span>
                        <span className="font-medium">{emp.employeeName.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>

                  {day.coveragePercentage < 75 && day.onLeaveCount > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs">
                      {getCoverageIcon(day.coveragePercentage)}
                      <span>{Math.round(day.coveragePercentage)}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Member Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Member Summary
          </CardTitle>
          <CardDescription>{teamMembers.length} team members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div key={member.employeeId} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{member.employeeName}</span>
                      <Badge variant="outline" className="text-xs">
                        {member.employeeNumber}
                      </Badge>
                      {member.department && (
                        <Badge variant="outline" className="text-xs bg-blue-50">
                          {member.department}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-slate-600">{member.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-600">{member.leaveCount} requests</div>
                    <div className="text-lg font-bold text-purple-600">{member.totalDays} days</div>
                  </div>
                </div>

                {member.leaves.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {member.leaves.map((leave) => (
                      <div
                        key={leave.id}
                        className="flex items-center justify-between text-sm bg-slate-50 rounded p-2"
                      >
                        <div className="flex items-center gap-2">
                          <span>{getLeaveTypeIcon(leave.leaveType)}</span>
                          <span className="font-medium">
                            {leave.leaveType.charAt(0) + leave.leaveType.slice(1).toLowerCase()}
                          </span>
                          <span className="text-slate-600">
                            {format(new Date(leave.startDate), 'MMM d')} - {format(new Date(leave.endDate), 'MMM d')}
                          </span>
                          <span className="text-slate-600">({leave.days} days)</span>
                        </div>
                        <Badge className={leave.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                          {leave.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
