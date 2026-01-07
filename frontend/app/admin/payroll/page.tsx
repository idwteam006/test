'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency-utils';

interface PayrollRecord {
  id: string;
  period: string;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netPay: number;
  processedAt: string;
  paidAt: string | null;
  employee: {
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

export default function AdminPayrollPage() {
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('');

  useEffect(() => {
    fetchPayrollRecords();
  }, []);

  const fetchPayrollRecords = async () => {
    try {
      const res = await fetch('/api/admin/payroll');
      const data = await res.json();

      if (data.success) {
        setPayrollRecords(data.payrollRecords);
      } else {
        toast.error(data.error || 'Failed to fetch payroll records');
      }
    } catch (error) {
      toast.error('Failed to fetch payroll records');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkProcess = async () => {
    if (!selectedPeriod) {
      toast.error('Please enter a period');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/payroll/bulk-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: selectedPeriod }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          `Payroll processed for ${data.processed} employees${
            data.skipped > 0 ? `, ${data.skipped} skipped (already processed)` : ''
          }`
        );
        setShowProcessModal(false);
        setSelectedPeriod('');
        fetchPayrollRecords();
      } else {
        toast.error(data.error || 'Failed to process payroll');
      }
    } catch (error) {
      toast.error('Failed to process payroll');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkAsPaid = async (payrollId: string) => {
    try {
      const res = await fetch(`/api/admin/payroll/${payrollId}/pay`, {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Payroll marked as paid');
        fetchPayrollRecords();
      } else {
        toast.error(data.error || 'Failed to mark as paid');
      }
    } catch (error) {
      toast.error('Failed to mark as paid');
    }
  };

  // Use centralized currency formatting - TODO: get currency from tenant settings
  const formatPayrollCurrency = (amount: number) => {
    return formatCurrency(amount, 'USD'); // Will be replaced with tenant currency
  };

  const totalPending = payrollRecords
    .filter((r) => !r.paidAt)
    .reduce((sum, r) => sum + r.netPay, 0);

  const totalPaid = payrollRecords
    .filter((r) => r.paidAt)
    .reduce((sum, r) => sum + r.netPay, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
          <p className="mt-2 text-sm text-gray-700">Process and manage employee payroll</p>
        </div>
        <button
          onClick={() => setShowProcessModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Process Bulk Payroll
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Total Employees</p>
          <p className="text-3xl font-bold text-gray-900">{payrollRecords.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Pending Payments</p>
          <p className="text-3xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Total Paid</p>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
      </div>

      {/* Payroll Records Table */}
      {payrollRecords.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No payroll records yet</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Pay
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payrollRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {record.employee.user.firstName} {record.employee.user.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{record.employee.user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.period}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPayrollCurrency(record.baseSalary)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatPayrollCurrency(record.netPay)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {record.paidAt ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Paid
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {!record.paidAt && (
                      <button
                        onClick={() => handleMarkAsPaid(record.id)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Mark as Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Process Modal */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">Process Bulk Payroll</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payroll Period (e.g., 2024-01)
              </label>
              <input
                type="text"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                placeholder="YYYY-MM"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-2 text-sm text-gray-500">
                This will process payroll for all active employees who don't have a record for this
                period
              </p>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowProcessModal(false);
                  setSelectedPeriod('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkProcess}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                disabled={processing || !selectedPeriod}
              >
                {processing ? 'Processing...' : 'Process Payroll'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
