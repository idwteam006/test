'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  TrendingUp,
  CheckCircle,
  Clock,
  Calendar,
  AlertCircle,
  Filter,
  User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  progress: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    name: string;
    email: string;
    employeeId: string;
  };
}

interface Summary {
  totalGoals: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  overdue: number;
}

const statusColors = {
  NOT_STARTED: 'bg-slate-500',
  IN_PROGRESS: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
};

const statusLabels = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function AdminGoalsPage() {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedEmployee, selectedStatus, goals]);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/goals');
      const data = await res.json();

      if (data.success) {
        setGoals(data.goals || []);
        setSummary(data.summary);
      } else {
        toast.error(data.error || 'Failed to fetch team goals');
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Failed to fetch team goals');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...goals];

    if (selectedEmployee !== 'all') {
      filtered = filtered.filter((g) => g.employee.id === selectedEmployee);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter((g) => g.status === selectedStatus);
    }

    setFilteredGoals(filtered);
  };

  const uniqueEmployees = Array.from(
    new Set(goals.map((g) => JSON.stringify({ id: g.employee.id, name: g.employee.name })))
  ).map((str) => JSON.parse(str));

  const isOverdue = (goal: Goal) => {
    if (!goal.dueDate || goal.status === 'COMPLETED') return false;
    return new Date(goal.dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Team Goals
          </h1>
          <p className="mt-2 text-slate-600">
            Monitor and track your team goals and objectives
          </p>
        </div>

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="border-l-4 border-l-purple-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Total Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-purple-600">{summary.totalGoals}</div>
                  <Target className="h-8 w-8 text-purple-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-green-600">{summary.completed}</div>
                  <CheckCircle className="h-8 w-8 text-green-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-blue-600">{summary.inProgress}</div>
                  <TrendingUp className="h-8 w-8 text-blue-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-slate-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Not Started</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-slate-600">{summary.notStarted}</div>
                  <Clock className="h-8 w-8 text-slate-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-red-600">{summary.overdue}</div>
                  <AlertCircle className="h-8 w-8 text-red-600 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-purple-600" />
                  Filters
                </CardTitle>
                <CardDescription>Filter goals by employee and status</CardDescription>
              </div>
              {(selectedEmployee !== 'all' || selectedStatus !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedEmployee('all');
                    setSelectedStatus('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-slate-700 mb-2 block">Employee</label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Employees ({goals.length} goals)</option>
                  {uniqueEmployees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({goals.filter((g) => g.employee.id === emp.id).length} goals)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-slate-700 mb-2 block">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Goals ({filteredGoals.length})</CardTitle>
            <CardDescription>All goals from your direct reports</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredGoals.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">No goals found</p>
                <p className="text-sm text-slate-500 mt-1">
                  {goals.length === 0
                    ? 'Your team has not created any goals yet.'
                    : 'Try adjusting your filters.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGoals.map((goal) => (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-slate-900">{goal.title}</h3>
                          <Badge className={`${statusColors[goal.status]} text-white`}>
                            {statusLabels[goal.status]}
                          </Badge>
                          {isOverdue(goal) && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-slate-600 mb-3">{goal.description}</p>

                        <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{goal.employee.name}</span>
                          </div>
                          {goal.dueDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Due: {format(new Date(goal.dueDate), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            <span>Progress: {goal.progress}%</span>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${statusColors[goal.status]} transition-all`}
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
