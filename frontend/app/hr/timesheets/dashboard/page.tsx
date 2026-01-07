'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  ArrowLeft,
  Loader2,
  BarChart3,
  PieChart as PieChartIcon,
  FileText,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

interface AnalyticsData {
  summary: {
    totalSubmissions: number;
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    totalRevenue: number;
    pendingApprovals: number;
    avgApprovalTime: number;
    totalEntries: number;
    approvalRate: number;
  };
  statusDistribution: { status: string; count: number; percentage: number }[];
  submissionTrends: { date: string; count: number; hours: number }[];
  departmentBreakdown: { department: string; hours: number; employees: number }[];
  projectAllocation: { project: string; hours: number; percentage: number }[];
  workTypeDistribution: { type: string; hours: number }[];
  employeeCompliance: {
    userId: string;
    name: string;
    department: string;
    weeksSubmitted: number;
    weeksMissing: number;
    totalHours: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    complianceRate: number;
  }[];
  topRejectionReasons: { reason: string; count: number }[];
  billableBreakdown: { department: string; billable: number; nonBillable: number }[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#9CA3AF',
  SUBMITTED: '#F59E0B',
  APPROVED: '#10B981',
  REJECTED: '#EF4444',
  INVOICED: '#6366F1',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  INVOICED: 'Invoiced',
};

const CHART_COLORS = ['#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1', '#10B981'];

export default function TimesheetDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState<'month' | 'week' | 'quarter' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const getDateParams = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (dateRange) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
    }

    return { startDate, endDate };
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateParams();
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await fetch(`/api/hr/timesheets/analytics?${params}`);
      const result = await response.json();

      if (response.ok && result.success) {
        setData(result.data);
      } else {
        toast.error(result.error || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('Fetch analytics error:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatRejectionReason = (reason: string) => {
    return reason
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/hr/timesheets">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Timesheets
            </Button>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Timesheet Analytics
              </h1>
              <p className="text-gray-600 mt-2">
                Track submission trends, compliance, and productivity
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {dateRange === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-36"
                  />
                  <span className="text-gray-400">to</span>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-36"
                  />
                  <Button onClick={fetchAnalytics} size="sm">
                    Apply
                  </Button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.summary.totalHours}</p>
                  <p className="text-xs text-gray-500">Total Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.summary.billableHours}</p>
                  <p className="text-xs text-gray-500">Billable Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.summary.pendingApprovals}</p>
                  <p className="text-xs text-gray-500">Pending Approvals</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.summary.approvalRate}%</p>
                  <p className="text-xs text-gray-500">Approval Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts Row 1 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6 mb-6"
        >
          {/* Submission Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Submission Trends
              </CardTitle>
              <CardDescription>Daily timesheet submissions and hours</CardDescription>
            </CardHeader>
            <CardContent>
              {data.submissionTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.submissionTrends}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                      stroke="#9CA3AF"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      name="Hours"
                      stroke="#8B5CF6"
                      fillOpacity={1}
                      fill="url(#colorHours)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No submission data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-purple-600" />
                Status Distribution
              </CardTitle>
              <CardDescription>Breakdown of timesheet statuses</CardDescription>
            </CardHeader>
            <CardContent>
              {data.statusDistribution.length > 0 ? (
                <div className="flex items-center">
                  <ResponsiveContainer width="60%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="status"
                      >
                        {data.statusDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={STATUS_COLORS[entry.status] || CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-40 space-y-2">
                    {data.statusDistribution.map((item, index) => (
                      <div key={item.status} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: STATUS_COLORS[item.status] || CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <span>{STATUS_LABELS[item.status] || item.status}</span>
                        </div>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No status data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts Row 2 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-2 gap-6 mb-6"
        >
          {/* Billable vs Non-Billable */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Billable vs Non-Billable Hours
              </CardTitle>
              <CardDescription>Hours breakdown by department</CardDescription>
            </CardHeader>
            <CardContent>
              {data.billableBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.billableBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                    <YAxis
                      dataKey="department"
                      type="category"
                      tick={{ fontSize: 12 }}
                      stroke="#9CA3AF"
                      width={100}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="billable" name="Billable" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="nonBillable" name="Non-Billable" stackId="a" fill="#9CA3AF" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No billable data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Department Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                Hours by Department
              </CardTitle>
              <CardDescription>Total hours logged per department</CardDescription>
            </CardHeader>
            <CardContent>
              {data.departmentBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.departmentBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="department"
                      tick={{ fontSize: 12 }}
                      stroke="#9CA3AF"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="hours" name="Hours" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No department data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Employee Compliance Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Employee Submission Compliance
              </CardTitle>
              <CardDescription>Track employees with missing or late timesheet submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {data.employeeCompliance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Employee</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Department</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">Total Hours</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">Weeks Submitted</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">Pending</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">Approved</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">Compliance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.employeeCompliance.slice(0, 10).map((employee) => (
                        <tr key={employee.userId} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-medium text-sm">
                                {employee.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="font-medium">{employee.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{employee.department}</td>
                          <td className="py-3 px-4 text-center font-medium">{employee.totalHours}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-medium">{employee.weeksSubmitted}</span>
                            {employee.weeksMissing > 0 && (
                              <span className="text-red-500 ml-1">
                                ({employee.weeksMissing} missing)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {employee.pendingCount > 0 ? (
                              <Badge className="bg-amber-100 text-amber-700">{employee.pendingCount}</Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {employee.approvedCount > 0 ? (
                              <Badge className="bg-green-100 text-green-700">{employee.approvedCount}</Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    employee.complianceRate >= 80
                                      ? 'bg-green-500'
                                      : employee.complianceRate >= 50
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${employee.complianceRate}%` }}
                                />
                              </div>
                              <span className={`text-sm font-medium ${
                                employee.complianceRate >= 80
                                  ? 'text-green-600'
                                  : employee.complianceRate >= 50
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                              }`}>
                                {employee.complianceRate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {data.employeeCompliance.length > 10 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">
                        Showing 10 of {data.employeeCompliance.length} employees
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No employee data available for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Rejection Reasons */}
        {data.topRejectionReasons.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  Top Rejection Reasons
                </CardTitle>
                <CardDescription>Most common reasons for timesheet rejections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.topRejectionReasons.map((item, index) => (
                    <div key={item.reason} className="flex items-center gap-4">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{formatRejectionReason(item.reason)}</span>
                          <span className="text-sm text-gray-500">{item.count} occurrences</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{
                              width: `${(item.count / data.topRejectionReasons[0].count) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
