'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  DollarSign,
  TrendingUp,
  Download,
  Calendar,
  FileText,
  BarChart3,
  Filter,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

interface TimesheetReport {
  summary: {
    totalEntries: number;
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    totalRevenue: number;
  };
  byStatus: {
    status: string;
    count: number;
    hours: number;
  }[];
  byEmployee: {
    userId: string;
    userName: string;
    totalHours: number;
    billableHours: number;
    revenue: number;
  }[];
  byProject: {
    projectId: string;
    projectName: string;
    totalHours: number;
    billableHours: number;
    revenue: number;
  }[];
}

export default function AccountantTimesheetsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<TimesheetReport | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, statusFilter]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const response = await fetch(`/api/admin/reports/timesheets?${params}`);
      const data = await response.json();

      if (data.success) {
        setReport(data.report);
      } else {
        toast.error(data.error || 'Failed to load timesheet report');
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to load timesheet report');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!report) return;

    const rows = [
      ['Employee', 'Total Hours', 'Billable Hours', 'Non-Billable Hours', 'Revenue'],
      ...report.byEmployee.map((emp) => [
        emp.userName,
        emp.totalHours.toString(),
        emp.billableHours.toString(),
        (emp.totalHours - emp.billableHours).toString(),
        `$${emp.revenue.toFixed(2)}`,
      ]),
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet-report-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  if (loading && !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  const billablePercentage = report
    ? ((report.summary.billableHours / report.summary.totalHours) * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <Clock className="w-8 h-8 text-indigo-600" />
              </div>
              Timesheet Reports
            </h1>
            <p className="text-slate-600 mt-2">Revenue and billing analysis</p>
          </div>

          <button
            onClick={exportToCSV}
            disabled={!report}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-800">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="INVOICED">Invoiced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {report && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-sm text-slate-600 mb-1">Total Hours</p>
                <p className="text-3xl font-bold text-slate-800">
                  {report.summary.totalHours.toFixed(1)}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  {report.summary.totalEntries} entries
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-sm text-slate-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-slate-800">
                  ${report.summary.totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  From {report.summary.billableHours.toFixed(1)} billable hours
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-indigo-100 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-indigo-600" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-sm text-slate-600 mb-1">Billable %</p>
                <p className="text-3xl font-bold text-slate-800">{billablePercentage}%</p>
                <p className="text-xs text-slate-500 mt-2">
                  {report.summary.billableHours.toFixed(1)} /{' '}
                  {report.summary.totalHours.toFixed(1)} hours
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-sm text-slate-600 mb-1">Avg. Rate</p>
                <p className="text-3xl font-bold text-slate-800">
                  $
                  {report.summary.billableHours > 0
                    ? (report.summary.totalRevenue / report.summary.billableHours).toFixed(0)
                    : 0}
                </p>
                <p className="text-xs text-slate-500 mt-2">Per billable hour</p>
              </div>
            </div>

            {/* By Employee Table */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-slate-800">By Employee</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                        Employee
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">
                        Total Hours
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">
                        Billable Hours
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">
                        Billable %
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byEmployee.map((emp) => (
                      <tr
                        key={emp.userId}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {emp.userName}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600">
                          {emp.totalHours.toFixed(1)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600">
                          {emp.billableHours.toFixed(1)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600">
                          {emp.totalHours > 0
                            ? ((emp.billableHours / emp.totalHours) * 100).toFixed(1)
                            : 0}
                          %
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-green-600">
                          ${emp.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Project Table */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-slate-800">By Project</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                        Project
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">
                        Total Hours
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">
                        Billable Hours
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byProject.map((proj) => (
                      <tr
                        key={proj.projectId}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {proj.projectName || 'No Project'}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600">
                          {proj.totalHours.toFixed(1)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600">
                          {proj.billableHours.toFixed(1)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-green-600">
                          ${proj.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
