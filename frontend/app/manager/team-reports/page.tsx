'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  DollarSign,
  AlertTriangle,
  Download,
  Calendar,
  Activity,
  PieChart,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks, addDays } from 'date-fns';

interface TeamMember {
  userId: string;
  name: string;
  employeeId: string;
  totalHours: number;
  billableHours: number;
  overtimeHours: number;
  utilization: number;
  projectCount: number;
  status: 'high' | 'normal' | 'low';
}

interface ProjectAllocation {
  projectId: string;
  projectName: string;
  projectCode: string;
  totalHours: number;
  billableHours: number;
  teamMembers: number;
  revenue: number;
}

interface ActivityBreakdown {
  activityType: string;
  hours: number;
  percentage: number;
}

interface DailyTrend {
  date: string;
  hours: number;
  billableHours: number;
}

interface Alert {
  type: 'warning' | 'info' | 'danger';
  message: string;
  employeeId?: string;
}

export default function TeamReportsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split('T')[0],
    endDate: endOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split('T')[0],
  });
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');

  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projectAllocations, setProjectAllocations] = useState<ProjectAllocation[]>([]);
  const [activityBreakdown, setActivityBreakdown] = useState<ActivityBreakdown[]>([]);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Summary stats
  const [stats, setStats] = useState({
    totalHours: 0,
    billableHours: 0,
    utilization: 0,
    revenue: 0,
    activeMembers: 0,
    overtimeHours: 0,
    submissionRate: 0,
    avgHoursPerMember: 0,
  });

  useEffect(() => {
    fetchTeamReports();
  }, [dateRange, selectedTeamMember, selectedProject]);

  const fetchTeamReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        teamMember: selectedTeamMember,
        project: selectedProject,
      });

      const response = await fetch(`/api/manager/reports/team-summary?${params}`);
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
        setTeamMembers(data.teamMembers);
        setProjectAllocations(data.projectAllocations);
        setActivityBreakdown(data.activityBreakdown);
        setDailyTrends(data.dailyTrends);
        setAlerts(data.alerts);
      }
    } catch (error) {
      console.error('Failed to fetch team reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFilter = (type: 'week' | 'month' | 'quarter') => {
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (type) {
      case 'week':
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
        setReportType('weekly');
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        setReportType('monthly');
        break;
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        end = new Date(today.getFullYear(), quarter * 3 + 3, 0);
        setReportType('custom');
        break;
    }

    setDateRange({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    });
  };

  const handleExport = async (format: 'excel' | 'pdf' | 'csv') => {
    try {
      const params = new URLSearchParams({
        format,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        teamMember: selectedTeamMember,
        project: selectedProject,
      });

      const response = await fetch(`/api/manager/reports/export?${params}`);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `team-report-${dateRange.startDate}-to-${dateRange.endDate}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-600';
    if (utilization >= 75) return 'text-green-600';
    if (utilization >= 50) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getStatusBadge = (status: 'high' | 'normal' | 'low') => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      normal: 'bg-green-100 text-green-800',
      low: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status];
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">
            Track team performance, utilization, and project allocation
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleExport('excel')} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button onClick={() => handleExport('pdf')} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button onClick={() => handleExport('csv')} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <Alert key={idx} variant={alert.type === 'danger' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Quick Filters */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Quick Filters
              </label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={reportType === 'weekly' ? 'default' : 'outline'}
                  onClick={() => handleQuickFilter('week')}
                >
                  Week
                </Button>
                <Button
                  size="sm"
                  variant={reportType === 'monthly' ? 'default' : 'outline'}
                  onClick={() => handleQuickFilter('month')}
                >
                  Month
                </Button>
                <Button
                  size="sm"
                  variant={reportType === 'custom' ? 'default' : 'outline'}
                  onClick={() => handleQuickFilter('quarter')}
                >
                  Quarter
                </Button>
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            {/* Team Member Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Team Member
              </label>
              <select
                value={selectedTeamMember}
                onChange={(e) => setSelectedTeamMember(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="all">All Members</option>
                {teamMembers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalHours.toFixed(1)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Avg: {stats.avgHoursPerMember.toFixed(1)}h per member
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Billable Hours</p>
                <p className="text-2xl font-bold text-green-600">{stats.billableHours.toFixed(1)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.totalHours > 0 ? ((stats.billableHours / stats.totalHours) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Utilization</p>
                <p className={`text-2xl font-bold ${getUtilizationColor(stats.utilization)}`}>
                  {stats.utilization.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Target: 75-90%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overtime Hours</p>
                <p className="text-2xl font-bold text-orange-600">{stats.overtimeHours.toFixed(1)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.activeMembers} active members
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Member Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total Hours
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Billable
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Overtime
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Utilization
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Projects
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {teamMembers.map((member) => (
                  <tr key={member.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-500">{member.employeeId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {member.totalHours.toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600">
                      {member.billableHours.toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-sm text-orange-600">
                      {member.overtimeHours > 0 ? `${member.overtimeHours.toFixed(1)}h` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${getUtilizationColor(member.utilization)}`}>
                        {member.utilization.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {member.projectCount}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusBadge(member.status)}>
                        {member.status === 'high' ? 'Overutilized' :
                         member.status === 'low' ? 'Underutilized' : 'Optimal'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Project Allocations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Project Time Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projectAllocations.map((project) => (
              <div key={project.projectId} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{project.projectName}</p>
                    <p className="text-sm text-gray-500">{project.projectCode}</p>
                  </div>
                  <Badge variant="outline">{project.teamMembers} members</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-gray-500">Total Hours</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {project.totalHours.toFixed(1)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Billable</p>
                    <p className="text-lg font-semibold text-green-600">
                      {project.billableHours.toFixed(1)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Est. Revenue</p>
                    <p className="text-lg font-semibold text-blue-600">
                      ${project.revenue.toLocaleString()}
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min((project.totalHours / stats.totalHours) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Type Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activityBreakdown.map((activity) => (
              <div key={activity.activityType}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{activity.activityType}</span>
                  <span className="text-gray-600">
                    {activity.hours.toFixed(1)}h ({activity.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${activity.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Daily Hours Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2">
            {dailyTrends.map((day) => {
              const maxHours = Math.max(...dailyTrends.map((d) => d.hours), 1);
              const totalHeight = (day.hours / maxHours) * 100;
              const billableHeight = (day.billableHours / maxHours) * 100;

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col justify-end h-48 relative">
                    <div
                      className="w-full bg-gray-300 rounded-t"
                      style={{ height: `${totalHeight}%` }}
                    ></div>
                    <div
                      className="w-full bg-green-500 rounded-t absolute bottom-0"
                      style={{ height: `${billableHeight}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {format(new Date(day.date), 'EEE')}
                  </p>
                  <p className="text-xs font-medium text-gray-900">{day.hours.toFixed(1)}h</p>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-300 rounded"></div>
              <span>Total Hours</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Billable Hours</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
