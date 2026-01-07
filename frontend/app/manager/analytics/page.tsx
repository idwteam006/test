'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  CheckCircle2,
  Target,
  Calendar,
  DollarSign,
  Activity,
  Award,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { format, subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface TeamSummary {
  stats: {
    totalHours: number;
    billableHours: number;
    utilization: number;
    revenue: number;
    activeMembers: number;
    overtimeHours: number;
    avgHoursPerMember: number;
  };
  teamMembers: Array<{
    userId: string;
    name: string;
    totalHours: number;
    billableHours: number;
    utilization: number;
    overtimeHours: number;
    projectCount: number;
    status: string;
  }>;
  projectAllocations: Array<{
    projectId: string;
    projectName: string;
    totalHours: number;
    billableHours: number;
    revenue: number;
    teamMembers: number;
  }>;
}

interface PerformanceData {
  teamSize: number;
  data: Array<{
    employee: {
      id: string;
      user: {
        firstName: string;
        lastName: string;
      };
      jobTitle: string;
    };
    metrics: {
      coursesCompleted: number;
      tasksCompleted: number;
      tasksInProgress: number;
      projectsCompleted: number;
      projectsActive: number;
      goalsCompleted: number;
      performanceScore: number;
    };
  }>;
}

export default function ManagerAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');
  const [teamSummary, setTeamSummary] = useState<TeamSummary | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case 'week':
        return {
          startDate: startOfWeek(now).toISOString().split('T')[0],
          endDate: endOfWeek(now).toISOString().split('T')[0],
        };
      case 'month':
        return {
          startDate: startOfMonth(now).toISOString().split('T')[0],
          endDate: endOfMonth(now).toISOString().split('T')[0],
        };
      case 'quarter':
        return {
          startDate: subMonths(now, 3).toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0],
        };
      case 'year':
        return {
          startDate: subMonths(now, 12).toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0],
        };
      default:
        return {
          startDate: subWeeks(now, 1).toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0],
        };
    }
  };

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();

      // Fetch team summary (timesheet-based analytics)
      const summaryResponse = await fetch(
        `/api/manager/reports/team-summary?startDate=${startDate}&endDate=${endDate}`
      );
      const summaryData = await summaryResponse.json();

      if (summaryData.success) {
        setTeamSummary(summaryData);
      }

      // Fetch performance analytics
      const performanceResponse = await fetch('/api/manager/performance/analytics');
      const performanceResult = await performanceResponse.json();

      if (performanceResult.success) {
        setPerformanceData(performanceResult);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const teamMetrics = {
    totalMembers: teamSummary?.stats.activeMembers || 0,
    activeMembers: teamSummary?.stats.activeMembers || 0,
    onLeave: 0, // TODO: Fetch from leave API
    avgUtilization: Math.round(teamSummary?.stats.utilization || 0),
    utilizationChange: 0, // TODO: Calculate from historical data
  };

  const productivityMetrics = {
    tasksCompleted: performanceData?.data.reduce((sum, p) => sum + p.metrics.tasksCompleted, 0) || 0,
    tasksInProgress: performanceData?.data.reduce((sum, p) => sum + p.metrics.tasksInProgress, 0) || 0,
    tasksPending: 0,
    avgCompletionTime: 0,
    completionRate: 0,
    completionRateChange: 0,
  };

  const timeMetrics = {
    totalHours: Math.round(teamSummary?.stats.totalHours || 0),
    billableHours: Math.round(teamSummary?.stats.billableHours || 0),
    nonBillableHours: Math.round((teamSummary?.stats.totalHours || 0) - (teamSummary?.stats.billableHours || 0)),
    overtimeHours: Math.round(teamSummary?.stats.overtimeHours || 0),
    avgHoursPerMember: Math.round((teamSummary?.stats.avgHoursPerMember || 0) * 10) / 10,
    billablePercentage: Math.round(
      ((teamSummary?.stats.billableHours || 0) / (teamSummary?.stats.totalHours || 1)) * 100
    ),
  };

  const projectMetrics = {
    activeProjects: performanceData?.data.reduce((sum, p) => sum + p.metrics.projectsActive, 0) || 0,
    completedProjects: performanceData?.data.reduce((sum, p) => sum + p.metrics.projectsCompleted, 0) || 0,
    onTrack: teamSummary?.projectAllocations?.length || 0,
    atRisk: 0,
    avgProjectProgress: 0,
  };

  const performanceMetrics = {
    teamEfficiency: Math.round(teamSummary?.stats.utilization || 0),
    qualityScore: 0,
    customerSatisfaction: 0,
    onTimeDelivery: 0,
  };

  // Top performers based on performance score
  const topPerformers = (performanceData?.data || [])
    .sort((a, b) => b.metrics.performanceScore - a.metrics.performanceScore)
    .slice(0, 4)
    .map((p) => ({
      name: `${p.employee.user.firstName} ${p.employee.user.lastName}`,
      tasksCompleted: p.metrics.tasksCompleted,
      efficiency: p.metrics.performanceScore,
      hours: teamSummary?.teamMembers.find((m) => m.name === `${p.employee.user.firstName} ${p.employee.user.lastName}`)?.totalHours || 0,
    }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Team Analytics</h1>
          <p className="text-slate-600 mt-1">Comprehensive insights into team performance and metrics</p>
        </div>
        <div className="flex gap-2">
          {['week', 'month', 'quarter', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Team Size</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{teamMetrics.totalMembers}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-green-100 text-green-700">{teamMetrics.activeMembers} Active</Badge>
                  {teamMetrics.onLeave > 0 && (
                    <Badge className="bg-yellow-100 text-yellow-700">{teamMetrics.onLeave} On Leave</Badge>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Avg Utilization</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{teamMetrics.avgUtilization}%</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-sm text-slate-600">This {timeRange}</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Tasks Completed</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{productivityMetrics.tasksCompleted}</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-sm text-slate-600">{productivityMetrics.tasksInProgress} in progress</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Hours</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{timeMetrics.totalHours}h</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-sm text-slate-600">{timeMetrics.billablePercentage}% billable</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="productivity" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="time">Time Tracking</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Productivity Tab */}
        <TabsContent value="productivity" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Task Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Completed</span>
                    <span className="font-semibold">{productivityMetrics.tasksCompleted} tasks</span>
                  </div>
                  <Progress
                    value={productivityMetrics.tasksCompleted > 0 ? 80 : 0}
                    className="h-2 bg-slate-200"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">In Progress</span>
                    <span className="font-semibold">{productivityMetrics.tasksInProgress} tasks</span>
                  </div>
                  <Progress
                    value={productivityMetrics.tasksInProgress > 0 ? 15 : 0}
                    className="h-2 bg-slate-200"
                  />
                </div>
                {productivityMetrics.tasksPending > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Pending</span>
                      <span className="font-semibold">{productivityMetrics.tasksPending} tasks</span>
                    </div>
                    <Progress value={5} className="h-2 bg-slate-200" />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-600" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topPerformers.length > 0 ? (
                  <div className="space-y-4">
                    {topPerformers.map((performer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{performer.name}</p>
                            <p className="text-xs text-slate-600">{performer.tasksCompleted} tasks completed</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">{performer.efficiency}%</p>
                          <p className="text-xs text-slate-600">score</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">No performance data available yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Time Tracking Tab */}
        <TabsContent value="time" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Billable Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-green-600">{timeMetrics.billableHours}h</p>
                <p className="text-sm text-slate-600 mt-2">{timeMetrics.billablePercentage}% of total hours</p>
                <Progress value={timeMetrics.billablePercentage} className="h-2 mt-4" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Non-Billable Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-slate-600">{timeMetrics.nonBillableHours}h</p>
                <p className="text-sm text-slate-600 mt-2">{100 - timeMetrics.billablePercentage}% of total hours</p>
                <Progress value={100 - timeMetrics.billablePercentage} className="h-2 mt-4" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Overtime Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-orange-600">{timeMetrics.overtimeHours}h</p>
                <p className="text-sm text-slate-600 mt-2">Across all team members</p>
                <div className="mt-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-sm text-slate-600">Monitor workload balance</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Average Hours Per Member</CardTitle>
              <CardDescription>This {timeRange}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-5xl font-bold text-slate-900">{timeMetrics.avgHoursPerMember}</p>
                  <p className="text-slate-600 mt-2">hours per {timeRange === 'week' ? 'week' : 'period'} per member</p>
                </div>
                <div className="text-right">
                  <Badge className={timeMetrics.avgHoursPerMember <= 45 ? "bg-green-100 text-green-700 text-lg px-4 py-2" : "bg-yellow-100 text-yellow-700 text-lg px-4 py-2"}>
                    {timeMetrics.avgHoursPerMember <= 45 ? 'Within Target' : 'High Workload'}
                  </Badge>
                  <p className="text-sm text-slate-600 mt-2">Target: 40 hours/week</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600">Active Projects</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{projectMetrics.activeProjects}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600">On Track</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{projectMetrics.onTrack}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600">At Risk</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">{projectMetrics.atRisk}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600">Completed</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{projectMetrics.completedProjects}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project Allocations */}
          {teamSummary && teamSummary.projectAllocations && teamSummary.projectAllocations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Project Allocations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamSummary.projectAllocations.map((project, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{project.projectName}</p>
                        <p className="text-xs text-slate-600">{project.teamMembers} team members</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">{Math.round(project.totalHours)}h</p>
                        <p className="text-xs text-slate-600">{Math.round(project.billableHours)}h billable</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-5xl font-bold text-slate-900">{performanceMetrics.teamEfficiency}%</span>
                  <Badge className={performanceMetrics.teamEfficiency >= 80 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                    {performanceMetrics.teamEfficiency >= 80 ? 'Good' : 'Needs Improvement'}
                  </Badge>
                </div>
                <Progress value={performanceMetrics.teamEfficiency} className="h-3" />
                <p className="text-sm text-slate-600 mt-4">
                  Based on team utilization metrics
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                {teamSummary && teamSummary.teamMembers && teamSummary.teamMembers.length > 0 ? (
                  <div className="space-y-2">
                    {teamSummary.teamMembers.slice(0, 5).map((member, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <span className="text-sm font-medium text-slate-900">{member.name}</span>
                        <Badge className={
                          member.status === 'high' ? 'bg-green-100 text-green-700' :
                          member.status === 'low' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }>
                          {Math.round(member.utilization)}% util
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">No team members found</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
