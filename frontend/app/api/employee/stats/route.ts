import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

// GET /api/employee/stats - Fetch employee dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    const currentYear = new Date().getFullYear();

    // Fetch leave balances for current year
    const balances = await prisma.leaveBalance.findMany({
      where: {
        employeeId: employee.id,
        year: currentYear,
      },
    });

    // Fetch leave requests for current year
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        employeeId: employee.id,
        startDate: {
          gte: new Date(`${currentYear}-01-01`),
          lte: new Date(`${currentYear}-12-31`),
        },
      },
    });

    // Calculate total allocated (current balance + already used)
    const approvedRequests = leaveRequests.filter(r => r.status === 'APPROVED');
    const totalUsed = approvedRequests.reduce((sum, r) => sum + r.days, 0);
    const currentBalance = balances.reduce((sum, b) => sum + b.balance, 0);
    const totalAllocated = currentBalance + totalUsed;

    // Calculate pending leaves
    const pendingLeaves = leaveRequests
      .filter(r => r.status === 'PENDING')
      .reduce((sum, r) => sum + r.days, 0);

    // Breakdown by leave type
    const byType: any = {};
    for (const balance of balances) {
      const approvedForType = leaveRequests
        .filter(r => r.status === 'APPROVED' && r.leaveType === balance.leaveType)
        .reduce((sum, r) => sum + r.days, 0);

      const pendingForType = leaveRequests
        .filter(r => r.status === 'PENDING' && r.leaveType === balance.leaveType)
        .reduce((sum, r) => sum + r.days, 0);

      const allocated = balance.balance + approvedForType;

      byType[balance.leaveType] = {
        allocated,
        used: approvedForType,
        pending: pendingForType,
        remaining: balance.balance,
      };
    }

    // Request statistics
    const stats = {
      // Leave Statistics
      totalAllocated,
      totalUsed,
      totalPending: pendingLeaves,
      totalRemaining: currentBalance,

      byType,

      // Request Statistics
      totalRequests: leaveRequests.length,
      approvedRequests: approvedRequests.length,
      rejectedRequests: leaveRequests.filter(r => r.status === 'REJECTED').length,
      pendingRequests: leaveRequests.filter(r => r.status === 'PENDING').length,

      // Placeholder for timesheet stats (can be implemented later)
      todayHours: 0,
      weekHours: 0,
      monthHours: 0,
      upcomingHolidays: 0,
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employee statistics' },
      { status: 500 }
    );
  }
}
