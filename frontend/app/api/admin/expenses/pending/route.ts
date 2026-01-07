import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { Prisma } from '@prisma/client';

// Type for expense where clause
type ExpenseWhereInput = Prisma.ExpenseClaimWhereInput;

/**
 * GET /api/admin/expenses/pending
 * Get pending expense approvals for admin's direct reports
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
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: { id: true, tenantId: true, role: true, departmentId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only admins can access this endpoint
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Get query parameters for date range filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dateFilter = searchParams.get('dateFilter') || 'expenseDate'; // 'expenseDate' or 'submittedAt'

    // Get all SUBMITTED and APPROVED expense claims for the tenant with proper typing
    const whereClause: ExpenseWhereInput = {
      tenantId: user.tenantId,
      status: {
        in: ['SUBMITTED', 'APPROVED'],
      },
    };

    // Add date range filter if provided
    if (startDate && endDate) {
      if (dateFilter === 'submittedAt') {
        whereClause.submittedAt = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      } else {
        whereClause.expenseDate = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      }
    }

    // Get the current user's employee record with manager info
    const currentUserEmployee = await prisma.employee.findFirst({
      where: {
        userId: user.id,
        tenantId: user.tenantId,
      },
      select: { id: true, managerId: true },
    });

    if (!currentUserEmployee) {
      return NextResponse.json(
        { success: false, error: 'Employee record not found' },
        { status: 400 }
      );
    }

    // Check if current user is a root-level user (no manager)
    const isRootLevelUser = !currentUserEmployee.managerId;

    // Get direct reports only - same as manager
    const directReports = await prisma.employee.findMany({
      where: {
        tenantId: user.tenantId,
        managerId: currentUserEmployee.id,
      },
      select: { userId: true },
    });

    const directReportUserIds = directReports
      .map((emp) => emp.userId)
      .filter((id): id is string => id !== null);

    // If no direct reports and not a root-level user, return empty
    if (directReportUserIds.length === 0 && !isRootLevelUser) {
      return NextResponse.json({
        success: true,
        expenses: [],
        summary: {
          totalExpenses: 0,
          totalAmount: 0,
          byCategory: {},
          byEmployee: {},
        },
      });
    }

    // Build the userId filter based on user's position in hierarchy
    if (isRootLevelUser && directReportUserIds.length === 0) {
      // Root-level user with no direct reports - no pending approvals to show here
      return NextResponse.json({
        success: true,
        expenses: [],
        summary: {
          totalExpenses: 0,
          totalAmount: 0,
          byCategory: {},
          byEmployee: {},
        },
      });
    } else if (directReportUserIds.length > 0) {
      // User with direct reports - can only approve direct reports' expenses
      whereClause.userId = {
        in: directReportUserIds,
      };
    } else {
      // No direct reports - return empty
      return NextResponse.json({
        success: true,
        expenses: [],
        summary: {
          totalExpenses: 0,
          totalAmount: 0,
          byCategory: {},
          byEmployee: {},
        },
      });
    }

    // Run queries in parallel for better performance
    const [pendingExpenses, categoryStats, totalStats] = await Promise.all([
      // Fetch pending expenses with user details
      prisma.expenseClaim.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              employeeId: true,
              department: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [
          { submittedAt: 'desc' },
          { expenseDate: 'desc' },
        ],
      }),
      // Use Prisma groupBy for category aggregation (more efficient)
      prisma.expenseClaim.groupBy({
        by: ['category'],
        where: whereClause,
        _count: { id: true },
        _sum: { amount: true },
      }),
      // Get total count and sum in one query
      prisma.expenseClaim.aggregate({
        where: whereClause,
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    // Build category summary from groupBy results
    const byCategory: Record<string, { count: number; amount: number }> = {};
    categoryStats.forEach((stat) => {
      byCategory[stat.category] = {
        count: stat._count.id,
        amount: stat._sum.amount || 0,
      };
    });

    // Build employee summary (still need to iterate for names)
    const byEmployee: Record<string, { name: string; count: number; amount: number }> = {};
    pendingExpenses.forEach((expense) => {
      const empKey = expense.user.employeeId || expense.user.email;
      if (!byEmployee[empKey]) {
        byEmployee[empKey] = {
          name: `${expense.user.firstName} ${expense.user.lastName}`,
          count: 0,
          amount: 0,
        };
      }
      byEmployee[empKey].count += 1;
      byEmployee[empKey].amount += expense.amount;
    });

    // Calculate summary using aggregated results
    const summary = {
      totalExpenses: totalStats._count.id,
      totalAmount: totalStats._sum.amount || 0,
      byCategory,
      byEmployee,
    };

    return NextResponse.json({
      success: true,
      expenses: pendingExpenses,
      summary,
    });
  } catch (error) {
    console.error('[GET /api/admin/expenses/pending] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pending expenses',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
