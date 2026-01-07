'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  BarChart3,
  Download,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface SummaryReport {
  totalEmployees: number;
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  pendingRequests: number;
  totalDaysTaken: number;
  totalDaysRequested: number;
  approvalRate: number;
  avgApprovalTime: number;
}

interface MonthData {
  month: number;
  monthName: string;
  requests: number;
  days: number;
}

export default function LeaveReportsPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportType, setReportType] = useState<'summary' | 'employee-detail' | 'utilization'>('summary');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [byLeaveType, setByLeaveType] = useState<any>({});
  const [byMonth, setByMonth] = useState<MonthData[]>([]);
  const [byDepartment, setByDepartment] = useState<any>({});
  const [topLeaveTakers, setTopLeaveTakers] = useState<any[]>([]);
  const [rejectionReasons, setRejectionReasons] = useState<any>({});
  const [utilizationData, setUtilizationData] = useState<any>(null);
  const [employeeDetails, setEmployeeDetails] = useState<any[]>([]);

  useEffect(() => {
    fetchReport();
  }, [selectedYear, reportType]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/leave/reports?year=${selectedYear}&type=${reportType}`);
      const data = await response.json();

      if (data.success) {
        if (reportType === 'summary') {
          setSummary(data.summary);
          setByLeaveType(data.byLeaveType || {});
          setByMonth(data.byMonth || []);
          setByDepartment(data.byDepartment || {});
          setTopLeaveTakers(data.topLeaveTakers || []);
          setRejectionReasons(data.rejectionReasons || {});
        } else if (reportType === 'employee-detail') {
          setEmployeeDetails(data.employees || []);
        } else if (reportType === 'utilization') {
          setUtilizationData(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (reportType === 'summary' && summary) {
      const csvData = [
        ['Leave Management Summary Report', selectedYear],
        [],
        ['Metric', 'Value'],
        ['Total Employees', summary.totalEmployees],
        ['Total Requests', summary.totalRequests],
        ['Approved Requests', summary.approvedRequests],
        ['Rejected Requests', summary.rejectedRequests],
        ['Pending Requests', summary.pendingRequests],
        ['Total Days Taken', summary.totalDaysTaken],
        ['Approval Rate', `${summary.approvalRate}%`],
        ['Avg Approval Time', `${summary.avgApprovalTime} days`],
        [],
        ['By Leave Type'],
        ['Type', 'Total', 'Approved', 'Rejected', 'Pending', 'Days'],
        ...Object.entries(byLeaveType).map(([type, data]: [string, any]) => [
          type,
          data.total,
          data.approved,
          data.rejected,
          data.pending,
          data.days,
        ]),
        [],
        ['By Month'],
        ['Month', 'Requests', 'Days'],
        ...byMonth.map((m) => [m.monthName, m.requests, m.days]),
      ];

      const csv = csvData.map((row) => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leave-report-${selectedYear}.csv`;
      a.click();
      toast.success('Report exported to CSV');
    } else if (reportType === 'employee-detail' && employeeDetails.length > 0) {
      const csvData = [
        ['Employee Leave Details Report', selectedYear],
        [],
        ['Employee', 'Emp ID', 'Department', 'Total Requests', 'Approved', 'Rejected', 'Pending', 'Total Days'],
        ...employeeDetails.map((emp) => [
          emp.employeeName,
          emp.employeeNumber,
          emp.department || 'N/A',
          emp.stats.totalRequests,
          emp.stats.approved,
          emp.stats.rejected,
          emp.stats.pending,
          emp.stats.totalDays,
        ]),
      ];

      const csv = csvData.map((row) => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employee-leave-details-${selectedYear}.csv`;
      a.click();
      toast.success('Report exported to CSV');
    } else if (reportType === 'utilization' && utilizationData) {
      const csvData = [
        ['Leave Utilization Report', selectedYear],
        [],
        ['Employee', 'Emp ID', 'Department', 'Total Allocation', 'Days Taken', 'Remaining', 'Utilization %'],
        ...utilizationData.utilizationData.map((emp: any) => [
          emp.employeeName,
          emp.employeeNumber,
          emp.department || 'N/A',
          emp.totalAllocation,
          emp.daysTaken,
          emp.remainingDays,
          emp.utilizationRate,
        ]),
      ];

      const csv = csvData.map((row) => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leave-utilization-${selectedYear}.csv`;
      a.click();
      toast.success('Report exported to CSV');
    }
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

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Leave Reports & Analytics</h1>
          <p className="text-slate-600 mt-1">Comprehensive insights into leave patterns and trends</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border border-slate-300 rounded-md"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <Button onClick={exportToCSV} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="flex gap-2">
        <Button
          variant={reportType === 'summary' ? 'default' : 'outline'}
          onClick={() => setReportType('summary')}
          className={reportType === 'summary' ? 'bg-purple-600' : ''}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Summary
        </Button>
        <Button
          variant={reportType === 'employee-detail' ? 'default' : 'outline'}
          onClick={() => setReportType('employee-detail')}
          className={reportType === 'employee-detail' ? 'bg-purple-600' : ''}
        >
          <Users className="h-4 w-4 mr-2" />
          Employee Details
        </Button>
        <Button
          variant={reportType === 'utilization' ? 'default' : 'outline'}
          onClick={() => setReportType('utilization')}
          className={reportType === 'utilization' ? 'bg-purple-600' : ''}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Utilization
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-slate-600 mt-4">Generating report...</p>
        </div>
      ) : (
        <>
          {/* Summary Report */}
          {reportType === 'summary' && summary && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-slate-600">Total Employees</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">{summary.totalEmployees}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-slate-600">Total Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600">{summary.totalRequests}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-slate-600">Days Taken</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-indigo-600">{summary.totalDaysTaken}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-slate-600">Approval Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">{summary.approvalRate}%</div>
                  </CardContent>
                </Card>
              </div>

              {/* Leave Type Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Leave Type Breakdown</CardTitle>
                  <CardDescription>Distribution by leave category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(byLeaveType).map(([type, data]: [string, any]) => (
                      <div key={type} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">{getLeaveTypeIcon(type)}</span>
                          <span className="font-semibold text-slate-900">{type}</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Total:</span>
                            <span className="font-medium">{data.total}</span>
                          </div>
                          <div className="flex justify-between text-green-600">
                            <span>Approved:</span>
                            <span className="font-medium">{data.approved}</span>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>Rejected:</span>
                            <span className="font-medium">{data.rejected}</span>
                          </div>
                          <div className="flex justify-between text-purple-600 font-semibold">
                            <span>Days Taken:</span>
                            <span>{data.days}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Monthly Trend
                  </CardTitle>
                  <CardDescription>Leave requests throughout the year</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {byMonth.map((month) => {
                      const maxDays = Math.max(...byMonth.map((m) => m.days));
                      const percentage = maxDays > 0 ? (month.days / maxDays) * 100 : 0;

                      return (
                        <div key={month.month} className="flex items-center gap-4">
                          <div className="w-24 text-sm font-medium text-slate-700">{month.monthName}</div>
                          <div className="flex-1">
                            <div className="w-full bg-slate-100 rounded-full h-6 relative">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-6 rounded-full flex items-center justify-end pr-2"
                                style={{ width: `${percentage}%` }}
                              >
                                {month.days > 0 && (
                                  <span className="text-xs text-white font-medium">{month.days} days</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="w-20 text-sm text-slate-600">{month.requests} req</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Top Leave Takers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Top Leave Takers
                  </CardTitle>
                  <CardDescription>Employees with most leave days taken</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topLeaveTakers.map((emp, index) => (
                      <div key={emp.employeeId} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-600">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900">{emp.employeeName}</div>
                          <div className="text-sm text-slate-600">
                            {emp.employeeNumber} • {emp.department || 'No Department'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-purple-600">{emp.daysTaken} days</div>
                          <div className="text-xs text-slate-500">{emp.requestCount} requests</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Department Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Department Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(byDepartment).map(([dept, data]: [string, any]) => (
                      <div key={dept} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-slate-900">{dept}</span>
                          <Badge variant="outline">{data.employees} employees</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-600">Requests:</span>
                            <span className="ml-2 font-medium">{data.requests}</span>
                          </div>
                          <div>
                            <span className="text-slate-600">Days:</span>
                            <span className="ml-2 font-medium text-purple-600">{data.days}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Rejection Analysis */}
              {Object.keys(rejectionReasons).length > 0 && (
                <Card className="border-orange-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-900">
                      <AlertTriangle className="h-5 w-5" />
                      Rejection Analysis
                    </CardTitle>
                    <CardDescription>Common reasons for leave rejection</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(rejectionReasons).map(([reason, count]: [string, any]) => (
                        <div key={reason} className="bg-orange-50 border border-orange-200 rounded p-3">
                          <div className="text-sm text-orange-700 mb-1">
                            {reason.replace(/_/g, ' ')}
                          </div>
                          <div className="text-2xl font-bold text-orange-600">{count}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Approval Time */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Approval Turnaround Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-5xl font-bold text-purple-600 mb-2">
                      {summary.avgApprovalTime}
                    </div>
                    <div className="text-slate-600">Average days to approval</div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Employee Detail Report */}
          {reportType === 'employee-detail' && (
            <Card>
              <CardHeader>
                <CardTitle>Employee Leave Details</CardTitle>
                <CardDescription>{employeeDetails.length} employees</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {employeeDetails.map((emp) => (
                    <div key={emp.employeeId} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{emp.employeeName}</span>
                            <Badge variant="outline">{emp.employeeNumber}</Badge>
                            {emp.department && (
                              <Badge variant="outline" className="bg-blue-50">
                                {emp.department}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-purple-600">{emp.stats.totalDays} days</div>
                          <div className="text-sm text-slate-600">{emp.stats.totalRequests} requests</div>
                        </div>
                      </div>

                      {emp.leaveRequests.length > 0 && (
                        <div className="space-y-2">
                          {emp.leaveRequests.map((req: any) => (
                            <div key={req.id} className="bg-slate-50 rounded p-2 text-sm">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span>{getLeaveTypeIcon(req.leaveType)}</span>
                                  <span className="font-medium">{req.leaveType}</span>
                                  <span className="text-slate-600">
                                    {req.startDate} to {req.endDate}
                                  </span>
                                  <span className="text-slate-600">({req.days} days)</span>
                                </div>
                                <Badge
                                  className={
                                    req.status === 'APPROVED'
                                      ? 'bg-green-100 text-green-800'
                                      : req.status === 'REJECTED'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-orange-100 text-orange-800'
                                  }
                                >
                                  {req.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Utilization Report */}
          {reportType === 'utilization' && utilizationData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-red-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-red-700">Low Utilization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600">{utilizationData.categories.low.count}</div>
                    <p className="text-xs text-slate-500 mt-1">&lt; 30% leave taken</p>
                  </CardContent>
                </Card>

                <Card className="border-orange-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-orange-700">Medium Utilization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600">{utilizationData.categories.medium.count}</div>
                    <p className="text-xs text-slate-500 mt-1">30-70% leave taken</p>
                  </CardContent>
                </Card>

                <Card className="border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-green-700">High Utilization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">{utilizationData.categories.high.count}</div>
                    <p className="text-xs text-slate-500 mt-1">&gt; 70% leave taken</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Employee Utilization Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {utilizationData.utilizationData.map((emp: any) => {
                      const getUtilizationColor = (rate: number) => {
                        if (rate < 30) return 'text-red-600';
                        if (rate < 70) return 'text-orange-600';
                        return 'text-green-600';
                      };

                      return (
                        <div key={emp.employeeId} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900">{emp.employeeName}</div>
                            <div className="text-sm text-slate-600">
                              {emp.employeeNumber} • {emp.department || 'No Department'}
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="text-slate-600">
                              {emp.daysTaken} / {emp.totalAllocation} days
                            </div>
                            <div className="text-xs text-slate-500">{emp.remainingDays} remaining</div>
                          </div>
                          <div className={`text-2xl font-bold ${getUtilizationColor(emp.utilizationRate)}`}>
                            {emp.utilizationRate}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
