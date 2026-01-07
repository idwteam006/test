'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Filter,
  Download,
  TrendingUp,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface TimesheetEntry {
  id: string;
  workDate: string;
  hoursWorked: number;
  description: string;
  status: string;
  isBillable: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  project: {
    id: string;
    name: string;
  } | null;
  submittedAt: string | null;
  approvedAt: string | null;
}

interface TeamSummary {
  pendingCount: number;
  pendingHours: number;
  teamMembers: Array<{
    userId: string;
    userName: string;
    pendingEntries: number;
    pendingHours: number;
  }>;
}

export default function HRTimesheetsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [summary, setSummary] = useState<TeamSummary | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [statusFilter, setStatusFilter] = useState<string>('SUBMITTED');

  useEffect(() => {
    fetchTimesheets();
  }, [selectedUserId, startDate, endDate, statusFilter]);

  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(selectedUserId !== 'all' && { userId: selectedUserId }),
      });

      const response = await fetch(`/api/manager/timesheets/pending?${params}`);
      const data = await response.json();

      if (data.success) {
        let filteredEntries = data.entries || [];

        // Apply status filter on client side
        if (statusFilter !== 'all') {
          filteredEntries = filteredEntries.filter(
            (entry: TimesheetEntry) => entry.status === statusFilter
          );
        }

        setEntries(filteredEntries);
        setSummary(data.summary);
      } else {
        toast.error(data.error || 'Failed to load timesheets');
      }
    } catch (error) {
      console.error('Error fetching timesheets:', error);
      toast.error('Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkApprove = async (userId: string) => {
    const userEntries = entries.filter(
      (e) => e.user.id === userId && e.status === 'SUBMITTED'
    );

    if (userEntries.length === 0) {
      toast.error('No pending entries to approve');
      return;
    }

    try {
      const response = await fetch('/api/manager/timesheets/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryIds: userEntries.map((e) => e.id),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Approved ${data.approvedCount} entries`);
        fetchTimesheets();
      } else {
        toast.error(data.error || 'Failed to approve entries');
      }
    } catch (error) {
      console.error('Error approving entries:', error);
      toast.error('Failed to approve entries');
    }
  };

  const exportToCSV = () => {
    const rows = [
      ['Employee', 'Date', 'Hours', 'Project', 'Description', 'Status', 'Billable'],
      ...entries.map((entry) => [
        `${entry.user.firstName} ${entry.user.lastName}`,
        new Date(entry.workDate).toLocaleDateString(),
        entry.hoursWorked.toString(),
        entry.project?.name || 'No Project',
        entry.description,
        entry.status,
        entry.isBillable ? 'Yes' : 'No',
      ]),
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hr-timesheets-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  if (loading && entries.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
              Timesheet Management
            </h1>
            <p className="text-slate-600 mt-2">
              Monitor and manage employee timesheets
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/hr/timesheets/dashboard"
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics Dashboard
            </Link>
            <button
              onClick={exportToCSV}
              disabled={entries.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-sm text-slate-600 mb-1">Pending Approvals</p>
              <p className="text-3xl font-bold text-slate-800">
                {summary.pendingCount}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {summary.pendingHours.toFixed(1)} hours
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-slate-600 mb-1">Team Members</p>
              <p className="text-3xl font-bold text-slate-800">
                {summary.teamMembers.length}
              </p>
              <p className="text-xs text-slate-500 mt-2">With pending timesheets</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-slate-600 mb-1">Avg. Hours/Employee</p>
              <p className="text-3xl font-bold text-slate-800">
                {summary.teamMembers.length > 0
                  ? (summary.pendingHours / summary.teamMembers.length).toFixed(1)
                  : 0}
              </p>
              <p className="text-xs text-slate-500 mt-2">This period</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-800">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Employee
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Employees</option>
                {summary?.teamMembers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.userName} ({member.pendingEntries})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Team Members Quick Actions */}
        {summary && summary.teamMembers.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Quick Actions by Employee
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.teamMembers.map((member) => (
                <div
                  key={member.userId}
                  className="p-4 border border-slate-200 rounded-lg hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-800">{member.userName}</p>
                      <p className="text-sm text-slate-500">
                        {member.pendingEntries} pending • {member.pendingHours.toFixed(1)}h
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleBulkApprove(member.userId)}
                    disabled={member.pendingEntries === 0}
                    className="w-full px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    Approve All
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timesheet Entries */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Timesheet Entries ({entries.length})
          </h2>

          {entries.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No timesheet entries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                      Employee
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                      Project
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">
                      Hours
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">
                      Billable
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-slate-800">
                            {entry.user.firstName} {entry.user.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{entry.user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-sm">
                        {new Date(entry.workDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-sm">
                        {entry.project?.name || 'No Project'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-800 font-semibold">
                        {entry.hoursWorked.toFixed(1)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            entry.status === 'APPROVED'
                              ? 'bg-green-100 text-green-700'
                              : entry.status === 'SUBMITTED'
                              ? 'bg-yellow-100 text-yellow-700'
                              : entry.status === 'REJECTED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {entry.isBillable ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-slate-400" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
