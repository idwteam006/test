'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Download,
  Eye,
  Calendar,
  TrendingUp,
  FileText,
  CheckCircle,
  AlertCircle,
  CreditCard,
  PiggyBank,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Payslip {
  id: string;
  month: string;
  year: number;
  payDate: string;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  status: 'PAID' | 'PENDING' | 'PROCESSING';
  pdfUrl?: string;
}

const statusColors = {
  PAID: 'bg-green-500',
  PENDING: 'bg-orange-500',
  PROCESSING: 'bg-blue-500',
};

export default function EmployeePayslipsPage() {
  const [loading, setLoading] = useState(false);
  const [payslips, setPayslips] = useState<Payslip[]>([
    {
      id: '1',
      month: 'October',
      year: 2024,
      payDate: '2024-10-31',
      grossSalary: 8500,
      deductions: 1275,
      netSalary: 7225,
      status: 'PAID',
    },
    {
      id: '2',
      month: 'September',
      year: 2024,
      payDate: '2024-09-30',
      grossSalary: 8500,
      deductions: 1275,
      netSalary: 7225,
      status: 'PAID',
    },
    {
      id: '3',
      month: 'August',
      year: 2024,
      payDate: '2024-08-31',
      grossSalary: 8500,
      deductions: 1275,
      netSalary: 7225,
      status: 'PAID',
    },
    {
      id: '4',
      month: 'July',
      year: 2024,
      payDate: '2024-07-31',
      grossSalary: 8500,
      deductions: 1275,
      netSalary: 7225,
      status: 'PAID',
    },
    {
      id: '5',
      month: 'June',
      year: 2024,
      payDate: '2024-06-30',
      grossSalary: 8500,
      deductions: 1275,
      netSalary: 7225,
      status: 'PAID',
    },
    {
      id: '6',
      month: 'November',
      year: 2024,
      payDate: '2024-11-30',
      grossSalary: 8500,
      deductions: 1275,
      netSalary: 7225,
      status: 'PROCESSING',
    },
  ]);

  const currentYear = new Date().getFullYear();
  const ytdEarnings = payslips
    .filter(p => p.year === currentYear && p.status === 'PAID')
    .reduce((sum, p) => sum + p.netSalary, 0);

  const ytdGross = payslips
    .filter(p => p.year === currentYear && p.status === 'PAID')
    .reduce((sum, p) => sum + p.grossSalary, 0);

  const ytdDeductions = payslips
    .filter(p => p.year === currentYear && p.status === 'PAID')
    .reduce((sum, p) => sum + p.deductions, 0);

  const handleDownload = (payslipId: string) => {
    toast.info('Coming Soon', {
      description: 'Payslip download functionality is under development',
    });
  };

  const handleView = (payslipId: string) => {
    toast.info('Coming Soon', {
      description: 'Payslip viewer functionality is under development',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            My Payslips
          </h1>
          <p className="text-slate-600 mt-2">
            View and download your salary statements
          </p>
        </div>
      </div>

      {/* YTD Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">YTD Net Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(ytdEarnings)}</div>
              <DollarSign className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">YTD Gross Salary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(ytdGross)}</div>
              <CreditCard className="h-8 w-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">YTD Deductions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(ytdDeductions)}</div>
              <PiggyBank className="h-8 w-8 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Payslips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-purple-600">{payslips.length}</div>
              <FileText className="h-8 w-8 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payslips List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Salary Statements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {payslips.map((payslip) => (
              <motion.div
                key={payslip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {payslip.month} {payslip.year}
                        </h3>
                        <Badge className={`${statusColors[payslip.status]} text-white`}>
                          {payslip.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Pay Date: {new Date(payslip.payDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-1">Gross Salary</p>
                      <p className="text-sm font-semibold text-slate-700">
                        {formatCurrency(payslip.grossSalary)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-1">Deductions</p>
                      <p className="text-sm font-semibold text-orange-600">
                        -{formatCurrency(payslip.deductions)}
                      </p>
                    </div>

                    <div className="text-right min-w-[120px]">
                      <p className="text-xs text-slate-500 mb-1">Net Salary</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(payslip.netSalary)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleView(payslip.id)}
                        variant="outline"
                        size="sm"
                        className="border-purple-600 text-purple-600 hover:bg-purple-50"
                        disabled={payslip.status !== 'PAID'}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDownload(payslip.id)}
                        variant="outline"
                        size="sm"
                        className="border-green-600 text-green-600 hover:bg-green-50"
                        disabled={payslip.status !== 'PAID'}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-l-4 border-l-blue-600">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Payslip Information</h4>
              <p className="text-sm text-slate-600">
                Payslips are generated on the last working day of each month. You can view and download
                your payslips once they are marked as "PAID". If you notice any discrepancies, please
                contact the HR department immediately.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
