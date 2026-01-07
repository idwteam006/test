'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  CalendarDays,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Settings,
  Info,
  RotateCcw,
} from 'lucide-react';

interface LeavePolicies {
  ANNUAL: number;
  SICK: number;
  PERSONAL: number;
  MATERNITY: number;
  PATERNITY: number;
  UNPAID: number;
}

interface Employee {
  employeeId: string;
  employeeName: string;
  email: string;
  employeeNumber: string;
  startDate: string;
  balances: Array<{
    leaveType: string;
    balance: number;
    year: number;
    lastUpdated: string;
  }>;
  hasAllocation: boolean;
}

const DEFAULT_LEAVE_POLICIES: LeavePolicies = {
  ANNUAL: 20,
  SICK: 10,
  PERSONAL: 5,
  MATERNITY: 90,
  PATERNITY: 15,
  UNPAID: 0,
};

export default function BalanceManagementPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [resettingEmployee, setResettingEmployee] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    withAllocation: 0,
    withoutAllocation: 0,
  });
  const [orgPolicies, setOrgPolicies] = useState<LeavePolicies>(DEFAULT_LEAVE_POLICIES);

  useEffect(() => {
    fetchAllocationStatus();
  }, [selectedYear]);

  const fetchAllocationStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/leave/allocate?year=${selectedYear}`);
      const data = await response.json();

      if (data.success) {
        setEmployees(data.employees || []);
        setStats(data.stats || { totalEmployees: 0, withAllocation: 0, withoutAllocation: 0 });

        // Get org leave policies from settings
        if (data.settings?.leavePolicies) {
          setOrgPolicies({ ...DEFAULT_LEAVE_POLICIES, ...data.settings.leavePolicies });
        }
      }
    } catch (error) {
      console.error('Failed to fetch allocation status:', error);
      toast.error('Failed to load allocation status');
    } finally {
      setLoading(false);
    }
  };

  const resetEmployeeBalance = async (employeeId: string, employeeName: string) => {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    if (!confirm(`Are you sure you want to reset leave balances for ${employeeName} to organization defaults?\n\nThis will reset balances for ${currentYear} and ${nextYear}.`)) {
      return;
    }

    try {
      setResettingEmployee(employeeId);

      // Reset both current year and next year
      const resetPromises = [currentYear, nextYear].map(year =>
        fetch('/api/admin/leave/reset-balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId,
            year,
          }),
        }).then(res => res.json())
      );

      const results = await Promise.all(resetPromises);
      const allSuccess = results.every(r => r.success);

      if (allSuccess) {
        toast.success(`Leave balances reset for ${employeeName} (${currentYear} & ${nextYear})`);
        fetchAllocationStatus(); // Refresh the list
      } else {
        const errors = results.filter(r => !r.success).map(r => r.error).join(', ');
        toast.error(errors || 'Failed to reset balance');
      }
    } catch (error) {
      console.error('Failed to reset balance:', error);
      toast.error('Failed to reset leave balance');
    } finally {
      setResettingEmployee(null);
    }
  };

  const hasNegativeBalance = (employee: Employee): boolean => {
    return employee.balances.some((b) => b.balance < 0);
  };

  const getLeaveTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      ANNUAL: '🏖️',
      SICK: '🤒',
      PERSONAL: '🎯',
      MATERNITY: '👶',
      PATERNITY: '👨‍👧',
      UNPAID: '💼',
    };
    return icons[type] || '📅';
  };

  const getEffectiveBalance = (employee: Employee, leaveType: string): number => {
    const existing = employee.balances.find((b) => b.leaveType === leaveType);
    if (existing) {
      return existing.balance;
    }
    // Return org default
    return orgPolicies[leaveType as keyof LeavePolicies] ?? 0;
  };

  const hasCustomBalance = (employee: Employee, leaveType: string): boolean => {
    return employee.balances.some((b) => b.leaveType === leaveType);
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Leave Balance Overview</h1>
          <p className="text-slate-600 mt-1">View employee leave balances for {selectedYear}</p>
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
          <Button variant="outline" onClick={fetchAllocationStatus} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Organization-wide Leave Settings</AlertTitle>
        <AlertDescription className="text-blue-800">
          Leave balances are now automatically applied from organization settings. All employees receive the default allocation without manual configuration.{' '}
          <Link href="/admin/settings" className="underline font-medium">
            Configure in Admin Settings
          </Link>
        </AlertDescription>
      </Alert>

      {/* Organization Leave Policies Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Organization Leave Policies
          </CardTitle>
          <CardDescription>
            Default leave days for all employees (from Admin Settings)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'UNPAID'] as const).map((type) => (
              <div key={type} className="bg-slate-50 rounded-lg p-4 text-center">
                <div className="text-2xl mb-1">{getLeaveTypeIcon(type)}</div>
                <div className="text-xs font-medium text-slate-600 uppercase">{type}</div>
                <div className="text-2xl font-bold text-purple-600">{orgPolicies[type]}</div>
                <div className="text-xs text-slate-500">days/year</div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link href="/admin/settings">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Edit Leave Policies
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.totalEmployees}</div>
            <p className="text-xs text-slate-500 mt-1">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Using Org Defaults
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.withoutAllocation}</div>
            <p className="text-xs text-slate-500 mt-1">No overrides needed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Custom Balances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.withAllocation}</div>
            <p className="text-xs text-slate-500 mt-1">Individual overrides or used leave</p>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Leave Balances</CardTitle>
          <CardDescription>
            {employees.length} employees for {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-slate-600 mt-2">Loading employees...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 mx-auto text-slate-400 mb-3" />
              <h3 className="text-lg font-semibold text-slate-900">No employees found</h3>
              <p className="text-slate-600 mt-1">No active employees for this year</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {employees.map((employee) => (
                <div
                  key={employee.employeeId}
                  className="border rounded-lg p-4 border-slate-200 hover:border-slate-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">
                          {employee.employeeName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {employee.employeeNumber}
                        </Badge>
                        {employee.hasAllocation ? (
                          <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-xs">
                            Custom
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">
                            Org Default
                          </Badge>
                        )}
                        {hasNegativeBalance(employee) && (
                          <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">
                            Negative Balance
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-600">{employee.email}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Started: {new Date(employee.startDate).toLocaleDateString()}
                      </div>

                      {/* Leave Balances */}
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
                        {(['ANNUAL', 'SICK', 'PERSONAL'] as const).map((leaveType) => {
                          const balance = getEffectiveBalance(employee, leaveType);
                          const isCustom = hasCustomBalance(employee, leaveType);
                          const isNegative = balance < 0;

                          return (
                            <div
                              key={leaveType}
                              className={`rounded border p-2 text-center ${
                                isNegative
                                  ? 'bg-red-50 border-red-200'
                                  : isCustom
                                    ? 'bg-orange-50 border-orange-200'
                                    : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="text-lg">
                                {getLeaveTypeIcon(leaveType)}
                              </div>
                              <div className="text-xs font-medium text-slate-600">
                                {leaveType.slice(0, 3)}
                              </div>
                              <div className={`text-sm font-bold ${
                                isNegative ? 'text-red-600' : 'text-purple-600'
                              }`}>
                                {balance}
                              </div>
                              {isCustom && (
                                <div className="text-xs text-orange-600">modified</div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Reset button for employees with custom or negative balances */}
                      {(employee.hasAllocation || hasNegativeBalance(employee)) && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetEmployeeBalance(employee.employeeId, employee.employeeName)}
                            disabled={resettingEmployee === employee.employeeId}
                            className={hasNegativeBalance(employee) ? 'text-red-600 border-red-300 hover:bg-red-50' : ''}
                          >
                            {resettingEmployee === employee.employeeId ? (
                              <>
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                Resetting...
                              </>
                            ) : (
                              <>
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Reset to Org Default
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
