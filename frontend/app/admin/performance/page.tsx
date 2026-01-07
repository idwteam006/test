'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  TrendingUp,
  Award,
  Target,
  CheckCircle,
  BookOpen,
  Briefcase,
  Users,
  Clock,
  Star,
  Trophy,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EmployeePerformance {
  employee: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      avatarUrl: string | null;
    };
    jobTitle: string;
  };
  metrics: {
    coursesCompleted: number;
    coursesApproved: number;
    coursesPending: number;
    averageCourseRating: number;
    certificationsEarned: number;
    skillsAcquired: string[];
    totalLearningHours: number;
    tasksCompleted: number;
    tasksInProgress: number;
    projectsCompleted: number;
    projectsActive: number;
    goalsCompleted: number;
    goalsInProgress: number;
    goalsOverdue: number;
    meetingsAttended: number;
    meetingResponseRate: number;
    performanceScore: number;
  };
  period: string;
}

export default function ManagerPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<EmployeePerformance[]>([]);
  const [period, setPeriod] = useState('Q1 2025');
  const [teamSize, setTeamSize] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeePerformance | null>(null);

  useEffect(() => {
    fetchPerformanceData();
  }, [period]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/manager/performance/analytics?period=${period}`);
      const data = await res.json();

      if (data.success) {
        setPerformanceData(data.data);
        setTeamSize(data.teamSize);
      } else {
        toast.error(data.error || 'Failed to fetch performance data');
      }
    } catch (error) {
      toast.error('Failed to fetch performance data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
      </div>
    );
  }

  // Calculate team averages
  const teamAverages = {
    performanceScore: performanceData.length > 0
      ? Math.round(performanceData.reduce((sum, emp) => sum + emp.metrics.performanceScore, 0) / performanceData.length)
      : 0,
    tasksCompleted: performanceData.reduce((sum, emp) => sum + emp.metrics.tasksCompleted, 0),
    projectsCompleted: performanceData.reduce((sum, emp) => sum + emp.metrics.projectsCompleted, 0),
    coursesApproved: performanceData.reduce((sum, emp) => sum + emp.metrics.coursesApproved, 0),
    certificationsEarned: performanceData.reduce((sum, emp) => sum + emp.metrics.certificationsEarned, 0),
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-blue-50 border-blue-200';
    if (score >= 40) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Team Performance Analytics
            </h1>
            <p className="mt-2 text-slate-600">
              Auto-calculated from real work data: Learning, Tasks, Projects & Goals
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="Q1 2025">Q1 2025</option>
              <option value="Q4 2024">Q4 2024</option>
              <option value="Q3 2024">Q3 2024</option>
              <option value="Annual 2024">Annual 2024</option>
            </select>
          </div>
        </div>

        {/* Team Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{teamSize}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Avg Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getScoreColor(teamAverages.performanceScore)}`}>
                {teamAverages.performanceScore}
              </div>
              <p className="text-xs text-slate-500 mt-1">out of 100</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Tasks Done
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{teamAverages.tasksCompleted}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{teamAverages.projectsCompleted}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Certifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{teamAverages.certificationsEarned}</div>
            </CardContent>
          </Card>
        </div>

        {/* Employee Performance Cards */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Team Members Performance</h2>

          {performanceData.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No team members found</p>
                <p className="text-slate-400 text-sm mt-2">
                  Team members will appear here once they are assigned to you
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {performanceData.map((emp, index) => (
                <motion.div
                  key={emp.employee.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`border-2 ${getScoreBg(emp.metrics.performanceScore)}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        {/* Employee Info */}
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            {emp.employee.user.avatarUrl ? (
                              <img
                                src={emp.employee.user.avatarUrl}
                                alt={`${emp.employee.user.firstName} ${emp.employee.user.lastName}`}
                                className="h-16 w-16 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center text-white text-2xl font-bold">
                                {emp.employee.user.firstName[0]}{emp.employee.user.lastName[0]}
                              </div>
                            )}
                            {index < 3 && (
                              <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 flex items-center justify-center">
                                <Trophy className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </div>

                          <div>
                            <h3 className="text-xl font-bold text-slate-900">
                              {emp.employee.user.firstName} {emp.employee.user.lastName}
                            </h3>
                            <p className="text-sm text-slate-600">{emp.employee.jobTitle}</p>
                            <p className="text-xs text-slate-500">{emp.employee.user.email}</p>
                          </div>
                        </div>

                        {/* Performance Score */}
                        <div className="text-center">
                          <div className={`text-5xl font-bold ${getScoreColor(emp.metrics.performanceScore)}`}>
                            {emp.metrics.performanceScore}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Performance Score</p>
                          {index === 0 && (
                            <Badge className="mt-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white">
                              Top Performer
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200">
                        {/* Learning */}
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                            <BookOpen className="h-4 w-4 text-purple-600" />
                            Learning
                          </div>
                          <div className="space-y-1">
                            <div className="text-2xl font-bold text-purple-600">
                              {emp.metrics.coursesApproved}
                            </div>
                            <p className="text-xs text-slate-500">Courses Approved</p>
                            <p className="text-xs text-slate-500">
                              ⭐ {emp.metrics.averageCourseRating.toFixed(1)} avg rating
                            </p>
                            <p className="text-xs text-slate-500">
                              🎓 {emp.metrics.certificationsEarned} certifications
                            </p>
                            <p className="text-xs text-slate-500">
                              ⏱️ {emp.metrics.totalLearningHours}h learning
                            </p>
                          </div>
                        </div>

                        {/* Tasks */}
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            Tasks
                          </div>
                          <div className="space-y-1">
                            <div className="text-2xl font-bold text-green-600">
                              {emp.metrics.tasksCompleted}
                            </div>
                            <p className="text-xs text-slate-500">Completed</p>
                            <p className="text-xs text-slate-500">
                              {emp.metrics.tasksInProgress} in progress
                            </p>
                          </div>
                        </div>

                        {/* Projects */}
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                            <Briefcase className="h-4 w-4 text-blue-600" />
                            Projects
                          </div>
                          <div className="space-y-1">
                            <div className="text-2xl font-bold text-blue-600">
                              {emp.metrics.projectsCompleted}
                            </div>
                            <p className="text-xs text-slate-500">Completed</p>
                            <p className="text-xs text-slate-500">
                              {emp.metrics.projectsActive} active
                            </p>
                          </div>
                        </div>

                        {/* Goals */}
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                            <Target className="h-4 w-4 text-orange-600" />
                            Goals
                          </div>
                          <div className="space-y-1">
                            <div className="text-2xl font-bold text-orange-600">
                              {emp.metrics.goalsCompleted}
                            </div>
                            <p className="text-xs text-slate-500">Completed</p>
                            <p className="text-xs text-slate-500">
                              {emp.metrics.goalsInProgress} in progress
                            </p>
                            {emp.metrics.goalsOverdue > 0 && (
                              <p className="text-xs text-red-500">
                                {emp.metrics.goalsOverdue} overdue
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Skills Acquired */}
                      {emp.metrics.skillsAcquired.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <p className="text-sm font-medium text-slate-700 mb-2">
                            Skills Acquired ({emp.metrics.skillsAcquired.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {emp.metrics.skillsAcquired.slice(0, 10).map((skill, idx) => (
                              <Badge key={idx} variant="outline" className="bg-white">
                                {skill}
                              </Badge>
                            ))}
                            {emp.metrics.skillsAcquired.length > 10 && (
                              <Badge variant="outline" className="bg-slate-100">
                                +{emp.metrics.skillsAcquired.length - 10} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* View Details Button */}
                      <div className="mt-4 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEmployee(emp)}
                          className="border-purple-200 text-purple-700 hover:bg-purple-50"
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View Detailed Analytics
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  📊 Auto-Calculated Performance System
                </h3>
                <p className="text-sm text-slate-600">
                  Performance scores are automatically calculated from real work data:
                </p>
                <ul className="text-sm text-slate-600 mt-2 space-y-1 list-disc list-inside">
                  <li><strong>Learning (30%):</strong> Approved courses, certifications, avg ratings</li>
                  <li><strong>Tasks (25%):</strong> Completed tasks and quality</li>
                  <li><strong>Projects (25%):</strong> Project completions and contributions</li>
                  <li><strong>Goals (15%):</strong> Goals achieved vs set</li>
                  <li><strong>Engagement (5%):</strong> Meeting attendance and participation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Modal */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-4">
              <div className="relative">
                {selectedEmployee?.employee.user.avatarUrl ? (
                  <img
                    src={selectedEmployee.employee.user.avatarUrl}
                    alt={`${selectedEmployee.employee.user.firstName} ${selectedEmployee.employee.user.lastName}`}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center text-white font-bold">
                    {selectedEmployee?.employee.user.firstName[0]}{selectedEmployee?.employee.user.lastName[0]}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {selectedEmployee?.employee.user.firstName} {selectedEmployee?.employee.user.lastName}
                </h2>
                <p className="text-sm text-slate-600 font-normal">{selectedEmployee?.employee.jobTitle}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedEmployee && (
            <div className="space-y-6 mt-4">
              {/* Overall Performance Score */}
              <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Overall Performance Score</p>
                      <div className={`text-6xl font-bold ${getScoreColor(selectedEmployee.metrics.performanceScore)}`}>
                        {selectedEmployee.metrics.performanceScore}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Period: {selectedEmployee.period}</p>
                    </div>
                    <div className="h-32 w-32 rounded-full border-8 flex items-center justify-center"
                      style={{
                        borderColor: selectedEmployee.metrics.performanceScore >= 80 ? '#10b981' :
                          selectedEmployee.metrics.performanceScore >= 60 ? '#3b82f6' :
                          selectedEmployee.metrics.performanceScore >= 40 ? '#f97316' : '#ef4444'
                      }}>
                      <TrendingUp className="h-12 w-12 text-slate-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Learning Metrics */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                      Learning & Development (30%)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Courses Completed:</span>
                      <span className="font-bold text-purple-600">{selectedEmployee.metrics.coursesCompleted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Courses Approved:</span>
                      <span className="font-bold text-green-600">{selectedEmployee.metrics.coursesApproved}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Courses Pending:</span>
                      <span className="font-bold text-orange-600">{selectedEmployee.metrics.coursesPending}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Avg Course Rating:</span>
                      <span className="font-bold text-yellow-600 flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-500" />
                        {selectedEmployee.metrics.averageCourseRating.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Certifications:</span>
                      <span className="font-bold text-indigo-600 flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        {selectedEmployee.metrics.certificationsEarned}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Total Learning Hours:</span>
                      <span className="font-bold text-slate-900">{selectedEmployee.metrics.totalLearningHours}h</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Task Metrics */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Task Completion (25%)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Tasks Completed:</span>
                      <span className="font-bold text-green-600">{selectedEmployee.metrics.tasksCompleted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Tasks In Progress:</span>
                      <span className="font-bold text-blue-600">{selectedEmployee.metrics.tasksInProgress}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Project Metrics */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-blue-600" />
                      Project Delivery (25%)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Projects Completed:</span>
                      <span className="font-bold text-green-600">{selectedEmployee.metrics.projectsCompleted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Projects Active:</span>
                      <span className="font-bold text-blue-600">{selectedEmployee.metrics.projectsActive}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Goals Metrics */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <Target className="h-5 w-5 text-orange-600" />
                      Goals Achievement (15%)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Goals Completed:</span>
                      <span className="font-bold text-green-600">{selectedEmployee.metrics.goalsCompleted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Goals In Progress:</span>
                      <span className="font-bold text-blue-600">{selectedEmployee.metrics.goalsInProgress}</span>
                    </div>
                    {selectedEmployee.metrics.goalsOverdue > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Goals Overdue:</span>
                        <span className="font-bold text-red-600">{selectedEmployee.metrics.goalsOverdue}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Engagement Metrics */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                    Engagement & Participation (5%)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Meetings Attended:</span>
                    <span className="font-bold text-indigo-600">{selectedEmployee.metrics.meetingsAttended}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Response Rate:</span>
                    <span className="font-bold text-indigo-600">
                      {(selectedEmployee.metrics.meetingResponseRate * 100).toFixed(0)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Skills Acquired */}
              {selectedEmployee.metrics.skillsAcquired.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-600" />
                      Skills Acquired ({selectedEmployee.metrics.skillsAcquired.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmployee.metrics.skillsAcquired.map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="bg-white">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
