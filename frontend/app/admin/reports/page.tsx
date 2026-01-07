'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  Users,
  DollarSign,
  Clock,
  TrendingUp,
  Calendar,
  BarChart3,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { downloadExcel, downloadCSV } from '@/lib/export-helpers';

type ReportType = 'timesheets' | 'employees' | 'revenue' | 'utilization';

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('timesheets');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Filters
  const [startDate, setStartDate] = useState(startOfMonth(subMonths(new Date(), 1)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(endOfMonth(new Date()).toISOString().split('T')[0]);

  useEffect(() => {
    fetchReport();
  }, [selectedReport, startDate, endDate]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setReportData(null); // Clear previous data
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`/api/admin/reports/${selectedReport}?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setReportData(data);
        // Show info if no data
        if (selectedReport === 'timesheets' && (!data.entries || data.entries.length === 0)) {
          toast.info('No timesheet entries found for the selected period');
        } else if (selectedReport === 'employees' && (!data.employees || data.employees.length === 0)) {
          toast.info('No employees found');
        } else if (selectedReport === 'revenue' && (!data.invoices || data.invoices.length === 0)) {
          toast.info('No invoices found for the selected period');
        } else if (selectedReport === 'utilization' && (!data.utilization || data.utilization.length === 0)) {
          toast.info('No utilization data found for the selected period');
        }
      } else {
        throw new Error(data.error || 'Failed to fetch report');
      }
    } catch (error: any) {
      console.error('Failed to fetch report:', error);
      toast.error(error.message || 'Failed to load report');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!reportData) {
      toast.error('No data to export');
      return;
    }

    try {
      let exportData: any[] = [];

      switch (selectedReport) {
        case 'timesheets':
          exportData = reportData.entries?.map((entry: any) => ({
            Date: entry.workDate, // Already a string "YYYY-MM-DD" from API
            Employee: `${entry.user.firstName} ${entry.user.lastName}`,
            'Employee ID': entry.user.employeeId || 'N/A',
            Project: entry.project?.name || 'No Project',
            Client: entry.project?.client?.companyName || 'N/A',
            Task: entry.task?.name || 'N/A',
            Hours: entry.hoursWorked,
            Activity: entry.activityType || 'N/A',
            Billable: entry.isBillable ? 'Yes' : 'No',
            Status: entry.status,
            Amount: entry.billingAmount || 0,
          })) || [];
          break;

        case 'employees':
          exportData = reportData.employees?.map((emp: any) => ({
            'Employee ID': emp.user.employeeId || 'N/A',
            'First Name': emp.user.firstName,
            'Last Name': emp.user.lastName,
            Email: emp.user.email,
            Department: emp.department.name,
            'Job Title': emp.jobTitle,
            'Employment Type': emp.employmentType,
            Status: emp.status,
            'Start Date': new Date(emp.startDate).toISOString().split('T')[0],
            Manager: emp.manager
              ? `${emp.manager.user.firstName} ${emp.manager.user.lastName}`
              : 'N/A',
          })) || [];
          break;

        case 'revenue':
          exportData = reportData.invoices?.map((inv: any) => ({
            'Invoice Number': inv.invoiceNumber,
            Client: inv.client.companyName,
            'Contact Name': inv.client.contactName,
            'Issue Date': new Date(inv.issueDate).toISOString().split('T')[0],
            'Due Date': new Date(inv.dueDate).toISOString().split('T')[0],
            Subtotal: inv.subtotal,
            Tax: inv.tax,
            Total: inv.total,
            Status: inv.status,
            'Paid Date': inv.paidAt ? new Date(inv.paidAt).toISOString().split('T')[0] : 'N/A',
          })) || [];
          break;

        case 'utilization':
          exportData = reportData.utilization?.map((util: any) => ({
            Employee: util.name,
            'Employee ID': util.employeeId || 'N/A',
            Email: util.email,
            'Total Hours': util.totalHours,
            'Billable Hours': util.billableHours,
            'Non-Billable Hours': util.nonBillableHours,
            'Utilization Rate (%)': util.utilizationRate,
          })) || [];
          break;
      }

      if (exportData.length === 0) {
        toast.error('No data to export');
        return;
      }

      await downloadExcel(
        exportData,
        `${selectedReport}-report-${new Date().toISOString().split('T')[0]}.xlsx`,
        selectedReport.charAt(0).toUpperCase() + selectedReport.slice(1)
      );

      toast.success('Report exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export report');
    }
  };

  const handleExportCSV = () => {
    if (!reportData) {
      toast.error('No data to export');
      return;
    }

    try {
      let exportData: any[] = [];

      // Use same logic as Excel export
      switch (selectedReport) {
        case 'timesheets':
          exportData = reportData.entries?.map((entry: any) => ({
            Date: entry.workDate, // Already a string "YYYY-MM-DD" from API
            Employee: `${entry.user.firstName} ${entry.user.lastName}`,
            Hours: entry.hoursWorked,
            Project: entry.project?.name || 'N/A',
            Status: entry.status,
          })) || [];
          break;
        // Add other cases as needed
      }

      if (exportData.length === 0) {
        toast.error('No data to export');
        return;
      }

      downloadCSV(exportData, `${selectedReport}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      toast.success('Report exported to CSV!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export report');
    }
  };

  const reports = [
    { id: 'timesheets', label: 'Timesheet Report', icon: Clock, color: 'purple' },
    { id: 'employees', label: 'Employee Report', icon: Users, color: 'blue' },
    { id: 'revenue', label: 'Revenue Report', icon: DollarSign, color: 'green' },
    { id: 'utilization', label: 'Utilization Report', icon: TrendingUp, color: 'orange' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-600 mt-1">Generate and export business reports</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExportCSV} disabled={loading || !reportData}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={handleExportExcel}
            disabled={loading || !reportData}
            className="bg-green-600 hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {reports.map((report) => {
          const Icon = report.icon;
          const isSelected = selectedReport === report.id;

          // Define color classes statically for Tailwind
          const colorClasses = {
            purple: {
              border: 'border-purple-500',
              bg: 'bg-purple-50',
              iconBg: 'bg-purple-100',
              iconText: 'text-purple-600'
            },
            blue: {
              border: 'border-blue-500',
              bg: 'bg-blue-50',
              iconBg: 'bg-blue-100',
              iconText: 'text-blue-600'
            },
            green: {
              border: 'border-green-500',
              bg: 'bg-green-50',
              iconBg: 'bg-green-100',
              iconText: 'text-green-600'
            },
            orange: {
              border: 'border-orange-500',
              bg: 'bg-orange-50',
              iconBg: 'bg-orange-100',
              iconText: 'text-orange-600'
            }
          };

          const colors = colorClasses[report.color as keyof typeof colorClasses];

          return (
            <Card
              key={report.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected
                  ? `border-2 ${colors.border} ${colors.bg}`
                  : 'border hover:border-slate-300'
              }`}
              onClick={() => setSelectedReport(report.id as ReportType)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-lg ${
                      isSelected ? colors.iconBg : 'bg-slate-100'
                    }`}
                  >
                    <Icon className={`h-6 w-6 ${isSelected ? colors.iconText : 'text-slate-600'}`} />
                  </div>
                  <div className="font-semibold text-sm">{report.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="startDate" className="text-sm font-medium">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="endDate" className="text-sm font-medium">
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={fetchReport} disabled={loading}>
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Summary */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-slate-600 mt-4">Loading report...</p>
        </div>
      ) : reportData ? (
        <>
          {/* Summary Cards */}
          {reportData.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {selectedReport === 'timesheets' && (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Total Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-purple-600">
                        {(reportData.summary?.totalHours || 0).toFixed(1)}h
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Billable Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        {(reportData.summary?.billableHours || 0).toFixed(1)}h
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {(reportData.summary?.totalHours || 0) > 0
                          ? (((reportData.summary?.billableHours || 0) / reportData.summary.totalHours) * 100).toFixed(0)
                          : 0}
                        %
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        ${(reportData.summary?.totalRevenue || 0).toFixed(0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Entries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">{reportData.summary?.totalEntries || 0}</div>
                    </CardContent>
                  </Card>
                </>
              )}

              {selectedReport === 'employees' && (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Total Employees</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">{reportData.summary?.totalEmployees || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Active</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        {reportData.summary?.byStatus?.active || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Full Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-purple-600">
                        {reportData.summary?.byEmploymentType?.fullTime || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Contract</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-orange-600">
                        {reportData.summary?.byEmploymentType?.contract || 0}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {selectedReport === 'revenue' && (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        ${(reportData.summary?.totalRevenue || 0).toFixed(0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Paid</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        ${(reportData.summary?.paidRevenue || 0).toFixed(0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Outstanding</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        ${(reportData.summary?.outstandingRevenue || 0).toFixed(0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Invoices</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">{reportData.summary?.totalInvoices || 0}</div>
                    </CardContent>
                  </Card>
                </>
              )}

              {selectedReport === 'utilization' && (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Employees</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">{reportData.summary?.totalEmployees || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Total Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-purple-600">
                        {(reportData.summary?.totalHours || 0).toFixed(0)}h
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Billable Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        {(reportData.summary?.totalBillableHours || 0).toFixed(0)}h
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">Avg Utilization</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-orange-600">
                        {reportData.summary?.averageUtilization || 0}%
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Data Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Data Preview</CardTitle>
              <CardDescription>
                Showing preview of report data. Click export to download full report.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-600">
                {selectedReport === 'timesheets' && reportData.entries && (
                  <p>{reportData.entries.length} timesheet entries found</p>
                )}
                {selectedReport === 'employees' && reportData.employees && (
                  <p>{reportData.employees.length} employees found</p>
                )}
                {selectedReport === 'revenue' && reportData.invoices && (
                  <p>{reportData.invoices.length} invoices found</p>
                )}
                {selectedReport === 'utilization' && reportData.utilization && (
                  <p>{reportData.utilization.length} employees with timesheet data</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Data Available</h3>
          <p className="text-slate-600 mb-4">
            {selectedReport === 'timesheets' && 'No timesheet entries found for the selected period'}
            {selectedReport === 'employees' && 'No employees found in the system'}
            {selectedReport === 'revenue' && 'No invoices found for the selected period'}
            {selectedReport === 'utilization' && 'No approved timesheets found for the selected period'}
          </p>
          <div className="text-sm text-slate-500">
            {selectedReport === 'timesheets' && (
              <>
                <p>To see data here:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Employees need to submit timesheets</li>
                  <li>• Timesheets must be approved</li>
                  <li>• Try adjusting the date range</li>
                </ul>
              </>
            )}
            {selectedReport === 'employees' && (
              <>
                <p>To see data here:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Invite employees through HR module</li>
                  <li>• Employees must complete onboarding</li>
                </ul>
              </>
            )}
            {selectedReport === 'revenue' && (
              <>
                <p>To see data here:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Create invoices for clients</li>
                  <li>• Try adjusting the date range</li>
                </ul>
              </>
            )}
            {selectedReport === 'utilization' && (
              <>
                <p>To see data here:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Employees need to submit timesheets</li>
                  <li>• Timesheets must be approved</li>
                  <li>• Try adjusting the date range</li>
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
