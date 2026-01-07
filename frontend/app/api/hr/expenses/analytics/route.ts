import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

/**
 * GET /api/hr/expenses/analytics
 * Get comprehensive expense analytics for HR/Accountant dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    // HR, Admin, and Accountant can access analytics
    if (!['ADMIN', 'HR', 'ACCOUNTANT'].includes(sessionData.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Default to current month
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : defaultStartDate;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : defaultEndDate;

    // Fetch all expense claims for the date range
    const expenses = await prisma.expenseClaim.findMany({
      where: {
        tenantId: sessionData.tenantId,
        expenseDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employee: {
              select: {
                department: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Calculate summary metrics
    const totalClaims = expenses.length;
    const submittedClaims = expenses.filter(e => e.status !== 'DRAFT').length;
    const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const approvedAmount = expenses.filter(e => ['APPROVED', 'PAID'].includes(e.status))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const pendingAmount = expenses.filter(e => e.status === 'SUBMITTED')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const paidAmount = expenses.filter(e => e.status === 'PAID')
      .reduce((sum, e) => sum + (e.paidAmount || e.amount || 0), 0);
    const pendingApprovals = expenses.filter(e => e.status === 'SUBMITTED').length;
    const rejectedCount = expenses.filter(e => e.status === 'REJECTED').length;

    // Calculate average approval time (in hours)
    const approvedExpenses = expenses.filter(e =>
      ['APPROVED', 'PAID'].includes(e.status) && e.reviewedAt && e.submittedAt
    );
    let avgApprovalTime = 0;
    if (approvedExpenses.length > 0) {
      const totalApprovalTime = approvedExpenses.reduce((sum, e) => {
        const reviewedAt = new Date(e.reviewedAt!).getTime();
        const submittedAt = new Date(e.submittedAt!).getTime();
        return sum + (reviewedAt - submittedAt);
      }, 0);
      avgApprovalTime = Math.round(totalApprovalTime / approvedExpenses.length / (1000 * 60 * 60) * 10) / 10;
    }

    // Status distribution
    const statusCounts: Record<string, { count: number; amount: number }> = {};
    expenses.forEach(e => {
      if (!statusCounts[e.status]) {
        statusCounts[e.status] = { count: 0, amount: 0 };
      }
      statusCounts[e.status].count += 1;
      statusCounts[e.status].amount += e.amount || 0;
    });
    const statusDistribution = Object.entries(statusCounts).map(([status, data]) => ({
      status,
      count: data.count,
      amount: Math.round(data.amount * 100) / 100,
      percentage: totalClaims > 0 ? Math.round((data.count / totalClaims) * 100 * 10) / 10 : 0,
    }));

    // Category distribution
    const categoryCounts: Record<string, { count: number; amount: number }> = {};
    expenses.forEach(e => {
      const category = e.category || 'OTHER';
      if (!categoryCounts[category]) {
        categoryCounts[category] = { count: 0, amount: 0 };
      }
      categoryCounts[category].count += 1;
      categoryCounts[category].amount += e.amount || 0;
    });
    const categoryDistribution = Object.entries(categoryCounts)
      .map(([category, data]) => ({
        category,
        count: data.count,
        amount: Math.round(data.amount * 100) / 100,
        percentage: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100 * 10) / 10 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Expense trends (daily aggregation)
    const trendsMap: Record<string, { count: number; amount: number }> = {};
    expenses.filter(e => e.status !== 'DRAFT').forEach(e => {
      const dateKey = e.expenseDate.toISOString().split('T')[0];
      if (!trendsMap[dateKey]) {
        trendsMap[dateKey] = { count: 0, amount: 0 };
      }
      trendsMap[dateKey].count += 1;
      trendsMap[dateKey].amount += e.amount || 0;
    });
    const expenseTrends = Object.entries(trendsMap)
      .map(([date, data]) => ({
        date,
        count: data.count,
        amount: Math.round(data.amount * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Department breakdown
    const deptMap: Record<string, { amount: number; count: number; employees: Set<string> }> = {};
    expenses.forEach(e => {
      const deptName = e.user.employee?.department?.name || 'Unassigned';
      if (!deptMap[deptName]) {
        deptMap[deptName] = { amount: 0, count: 0, employees: new Set() };
      }
      deptMap[deptName].amount += e.amount || 0;
      deptMap[deptName].count += 1;
      deptMap[deptName].employees.add(e.userId);
    });
    const departmentBreakdown = Object.entries(deptMap)
      .map(([department, data]) => ({
        department,
        amount: Math.round(data.amount * 100) / 100,
        count: data.count,
        employees: data.employees.size,
        avgPerEmployee: data.employees.size > 0
          ? Math.round((data.amount / data.employees.size) * 100) / 100
          : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Top spenders (employees)
    const employeeMap: Record<string, {
      name: string;
      department: string;
      totalAmount: number;
      claimCount: number;
      approvedAmount: number;
      pendingAmount: number;
      rejectedCount: number;
    }> = {};

    expenses.forEach(e => {
      const userId = e.userId;
      if (!employeeMap[userId]) {
        employeeMap[userId] = {
          name: `${e.user.firstName} ${e.user.lastName}`,
          department: e.user.employee?.department?.name || 'Unassigned',
          totalAmount: 0,
          claimCount: 0,
          approvedAmount: 0,
          pendingAmount: 0,
          rejectedCount: 0,
        };
      }

      employeeMap[userId].totalAmount += e.amount || 0;
      employeeMap[userId].claimCount += 1;

      if (['APPROVED', 'PAID'].includes(e.status)) {
        employeeMap[userId].approvedAmount += e.amount || 0;
      }
      if (e.status === 'SUBMITTED') {
        employeeMap[userId].pendingAmount += e.amount || 0;
      }
      if (e.status === 'REJECTED') {
        employeeMap[userId].rejectedCount += 1;
      }
    });

    const topSpenders = Object.entries(employeeMap)
      .map(([userId, data]) => ({
        userId,
        ...data,
        totalAmount: Math.round(data.totalAmount * 100) / 100,
        approvedAmount: Math.round(data.approvedAmount * 100) / 100,
        pendingAmount: Math.round(data.pendingAmount * 100) / 100,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 15);

    // Monthly comparison (last 6 months)
    const monthlyData: { month: string; amount: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const monthExpenses = expenses.filter(e => {
        const expDate = new Date(e.expenseDate);
        return expDate >= monthStart && expDate <= monthEnd && e.status !== 'DRAFT';
      });

      monthlyData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        amount: Math.round(monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0) * 100) / 100,
        count: monthExpenses.length,
      });
    }

    // Top rejection reasons (if any pattern exists in rejectionReason field)
    const rejectionReasons: Record<string, number> = {};
    expenses.filter(e => e.status === 'REJECTED' && e.rejectionReason).forEach(e => {
      // Normalize common rejection reasons
      const reason = e.rejectionReason!.toLowerCase();
      let category = 'Other';

      if (reason.includes('receipt') || reason.includes('proof')) {
        category = 'Missing Receipt/Proof';
      } else if (reason.includes('policy') || reason.includes('limit') || reason.includes('exceed')) {
        category = 'Policy Violation';
      } else if (reason.includes('duplicate') || reason.includes('already')) {
        category = 'Duplicate Claim';
      } else if (reason.includes('description') || reason.includes('detail')) {
        category = 'Insufficient Details';
      } else if (reason.includes('category') || reason.includes('wrong')) {
        category = 'Wrong Category';
      } else if (reason.includes('date') || reason.includes('old') || reason.includes('late')) {
        category = 'Late Submission';
      }

      rejectionReasons[category] = (rejectionReasons[category] || 0) + 1;
    });

    const topRejectionReasons = Object.entries(rejectionReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Category by department breakdown for stacked chart
    const categoryByDept: Record<string, Record<string, number>> = {};
    expenses.forEach(e => {
      const deptName = e.user.employee?.department?.name || 'Unassigned';
      const category = e.category || 'OTHER';

      if (!categoryByDept[deptName]) {
        categoryByDept[deptName] = {};
      }
      categoryByDept[deptName][category] = (categoryByDept[deptName][category] || 0) + (e.amount || 0);
    });

    const categoryByDepartment = Object.entries(categoryByDept).map(([department, categories]) => ({
      department,
      ...Object.fromEntries(
        Object.entries(categories).map(([cat, amt]) => [cat, Math.round(amt * 100) / 100])
      ),
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalClaims,
          submittedClaims,
          totalAmount: Math.round(totalAmount * 100) / 100,
          approvedAmount: Math.round(approvedAmount * 100) / 100,
          pendingAmount: Math.round(pendingAmount * 100) / 100,
          paidAmount: Math.round(paidAmount * 100) / 100,
          pendingApprovals,
          rejectedCount,
          avgApprovalTime,
          approvalRate: submittedClaims > 0
            ? Math.round((approvedExpenses.length / submittedClaims) * 100)
            : 0,
        },
        statusDistribution,
        categoryDistribution,
        expenseTrends,
        departmentBreakdown,
        topSpenders,
        monthlyData,
        topRejectionReasons,
        categoryByDepartment,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Expense analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
