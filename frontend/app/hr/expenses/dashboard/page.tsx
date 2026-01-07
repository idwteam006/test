'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Users,
  ArrowLeft,
  Loader2,
  BarChart3,
  PieChart as PieChartIcon,
  Building2,
  Receipt,
  Clock,
  CreditCard,
  Wallet,
  FileX,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Treemap,
} from 'recharts';

interface AnalyticsData {
  summary: {
    totalClaims: number;
    submittedClaims: number;
    totalAmount: number;
    approvedAmount: number;
    pendingAmount: number;
    paidAmount: number;
    pendingApprovals: number;
    rejectedCount: number;
    avgApprovalTime: number;
    approvalRate: number;
  };
  statusDistribution: { status: string; count: number; amount: number; percentage: number }[];
  categoryDistribution: { category: string; count: number; amount: number; percentage: number }[];
  expenseTrends: { date: string; count: number; amount: number }[];
  departmentBreakdown: { department: string; amount: number; count: number; employees: number; avgPerEmployee: number }[];
  topSpenders: {
    userId: string;
    name: string;
    department: string;
    totalAmount: number;
    claimCount: number;
    approvedAmount: number;
    pendingAmount: number;
    rejectedCount: number;
  }[];
  monthlyData: { month: string; amount: number; count: number }[];
  topRejectionReasons: { reason: string; count: number }[];
  categoryByDepartment: Record<string, any>[];
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
  PAID: '#6366F1',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PAID: 'Paid',
};

const CATEGORY_COLORS: Record<string, string> = {
  TRAVEL: '#8B5CF6',
  FOOD: '#F59E0B',
  ACCOMMODATION: '#10B981',
  TRANSPORT: '#3B82F6',
  OFFICE_SUPPLIES: '#EC4899',
  EQUIPMENT: '#6366F1',
  SOFTWARE: '#14B8A6',
  ENTERTAINMENT: '#F97316',
  OTHER: '#9CA3AF',
};

const CATEGORY_LABELS: Record<string, string> = {
  TRAVEL: 'Travel',
  FOOD: 'Food & Meals',
  ACCOMMODATION: 'Accommodation',
  TRANSPORT: 'Transport',
  OFFICE_SUPPLIES: 'Office Supplies',
  EQUIPMENT: 'Equipment',
  SOFTWARE: 'Software',
  ENTERTAINMENT: 'Entertainment',
  OTHER: 'Other',
};

const CHART_COLORS = ['#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1', '#10B981', '#3B82F6', '#F97316'];

export default function ExpenseDashboardPage() {
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

      const response = await fetch(`/api/hr/expenses/analytics?${params}`);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.dataKey === 'amount' || entry.name.includes('Amount')
                ? formatCurrency(entry.value)
                : entry.value}
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
          <Link href="/admin/expenses">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Expenses
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Expense Analytics
              </h1>
              <p className="text-gray-600 mt-2">
                Track expense trends, categories, and reimbursement status
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
                  <Receipt className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.summary.totalClaims}</p>
                  <p className="text-xs text-gray-500">Total Claims</p>
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
                  <p className="text-2xl font-bold">{formatCurrency(data.summary.totalAmount)}</p>
                  <p className="text-xs text-gray-500">Total Amount</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-600" />
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

        {/* Secondary Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{formatCurrency(data.summary.approvedAmount)}</p>
                  <p className="text-xs text-gray-500">Approved Amount</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Wallet className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{formatCurrency(data.summary.pendingAmount)}</p>
                  <p className="text-xs text-gray-500">Pending Amount</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{formatCurrency(data.summary.paidAmount)}</p>
                  <p className="text-xs text-gray-500">Paid Amount</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{data.summary.avgApprovalTime}h</p>
                  <p className="text-xs text-gray-500">Avg Approval Time</p>
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
          {/* Expense Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Expense Trends
              </CardTitle>
              <CardDescription>Daily expense submissions and amounts</CardDescription>
            </CardHeader>
            <CardContent>
              {data.expenseTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.expenseTrends}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
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
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#9CA3AF"
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      name="Amount"
                      stroke="#8B5CF6"
                      fillOpacity={1}
                      fill="url(#colorAmount)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No expense data available
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
              <CardDescription>Breakdown of expense claim statuses</CardDescription>
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
          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Expenses by Category
              </CardTitle>
              <CardDescription>Amount spent in each category</CardDescription>
            </CardHeader>
            <CardContent>
              {data.categoryDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.categoryDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12 }}
                      stroke="#9CA3AF"
                      tickFormatter={(value) => `$${value}`}
                    />
                    <YAxis
                      dataKey="category"
                      type="category"
                      tick={{ fontSize: 12 }}
                      stroke="#9CA3AF"
                      width={100}
                      tickFormatter={(value) => CATEGORY_LABELS[value] || value}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount" name="Amount" radius={[0, 4, 4, 0]}>
                      {data.categoryDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CATEGORY_COLORS[entry.category] || CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No category data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Department Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                Expenses by Department
              </CardTitle>
              <CardDescription>Total expenses per department</CardDescription>
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
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#9CA3AF"
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount" name="Amount" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
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

        {/* Monthly Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Monthly Expense Comparison
              </CardTitle>
              <CardDescription>Last 6 months expense trends</CardDescription>
            </CardHeader>
            <CardContent>
              {data.monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#9CA3AF"
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="amount" name="Amount" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-500">
                  No monthly data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Spenders Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Top Expense Claimants
              </CardTitle>
              <CardDescription>Employees with highest expense claims</CardDescription>
            </CardHeader>
            <CardContent>
              {data.topSpenders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Employee</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Department</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">Claims</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">Total Amount</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">Approved</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">Pending</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-600">Rejected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topSpenders.slice(0, 10).map((employee) => (
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
                          <td className="py-3 px-4 text-center font-medium">{employee.claimCount}</td>
                          <td className="py-3 px-4 text-right font-bold text-purple-600">
                            {formatCurrency(employee.totalAmount)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-green-600 font-medium">
                              {formatCurrency(employee.approvedAmount)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {employee.pendingAmount > 0 ? (
                              <span className="text-amber-600 font-medium">
                                {formatCurrency(employee.pendingAmount)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {employee.rejectedCount > 0 ? (
                              <Badge className="bg-red-100 text-red-700">{employee.rejectedCount}</Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {data.topSpenders.length > 10 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">
                        Showing 10 of {data.topSpenders.length} employees
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
                  <FileX className="w-5 h-5 text-red-500" />
                  Top Rejection Reasons
                </CardTitle>
                <CardDescription>Most common reasons for expense rejections</CardDescription>
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
                          <span className="font-medium">{item.reason}</span>
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
