/**
 * GET /api/manager/expenses/rejected
 * Get rejected expense claims for manager's direct reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
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

    const { id: userId, tenantId, role } = user;

    // Only managers and admins can access this endpoint
    if (role !== 'MANAGER' && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Manager or Admin access required.' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get all REJECTED expense claims for the tenant
    const whereClause: any = {
      tenantId,
      status: 'REJECTED',
    };

    // Get the current user's employee record with manager info
    const currentUserEmployee = await prisma.employee.findFirst({
      where: { userId: userId, tenantId: tenantId },
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
        tenantId: tenantId,
        managerId: currentUserEmployee.id,
      },
      select: { userId: true },
    });

    const directReportUserIds = directReports
      .map((emp) => emp.userId)
      .filter((id): id is string => id !== null);

    // Build the userId filter based on user's position in hierarchy
    // Root-level users can see their own rejected expenses
    if (isRootLevelUser && directReportUserIds.length === 0) {
      // Root-level user with no direct reports - show only their own rejected expenses
      whereClause.userId = userId;
    } else if (isRootLevelUser && directReportUserIds.length > 0) {
      // Root-level user with direct reports - show both own and direct reports' rejected expenses
      whereClause.userId = {
        in: [...directReportUserIds, userId],
      };
    } else if (directReportUserIds.length > 0) {
      // Regular manager/admin with direct reports - show only direct reports' rejected expenses
      whereClause.userId = {
        in: directReportUserIds,
      };
    } else {
      // No direct reports and not root level - return empty
      return NextResponse.json({
        success: true,
        expenses: [],
        count: 0,
      });
    }

    // Filter by date range if provided
    if (startDate && endDate) {
      whereClause.expenseDate = {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    } else if (startDate) {
      whereClause.expenseDate = {
        gte: new Date(`${startDate}T00:00:00.000Z`),
      };
    } else if (endDate) {
      whereClause.expenseDate = {
        lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    }

    // Fetch rejected expenses
    const rejectedExpenses = await prisma.expenseClaim.findMany({
      where: whereClause,
      select: {
        id: true,
        claimNumber: true,
        title: true,
        category: true,
        amount: true,
        currency: true,
        expenseDate: true,
        description: true,
        receiptUrls: true,
        notes: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        rejectionReason: true,
        reviewedBy: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            email: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        reviewedAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      expenses: rejectedExpenses.map((expense: any) => ({
        ...expense,
        expenseDate: expense.expenseDate.toISOString().split('T')[0],
        submittedAt: expense.submittedAt?.toISOString(),
        reviewedAt: expense.reviewedAt?.toISOString(),
        rejectedAt: expense.reviewedAt?.toISOString(), // Alias for consistency
        rejector: expense.reviewer, // Alias for consistency with timesheet UI
      })),
      count: rejectedExpenses.length,
      summary: {
        totalAmount: rejectedExpenses.reduce((sum, exp) => sum + exp.amount, 0),
        byCategory: rejectedExpenses.reduce((acc: any, exp) => {
          if (!acc[exp.category]) {
            acc[exp.category] = { count: 0, amount: 0 };
          }
          acc[exp.category].count++;
          acc[exp.category].amount += exp.amount;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error('[GET /api/manager/expenses/rejected] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch rejected expenses',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
