/**
 * GET /api/manager/expenses/approved
 * Get approved expense claims for manager's team
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { Prisma } from '@prisma/client';

type ExpenseWhereInput = Prisma.ExpenseClaimWhereInput;

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
      select: { id: true, tenantId: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only managers and admins can access this endpoint
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Manager access required.' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dateFilter = searchParams.get('dateFilter') || 'expenseDate';

    // Build where clause
    const whereClause: ExpenseWhereInput = {
      tenantId: user.tenantId,
      status: {
        in: ['APPROVED', 'PAID'],
      },
    };

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

    // Get direct reports only - applies to all roles (ADMIN, MANAGER, HR, ACCOUNTANT, EMPLOYEE)
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

    // Build the userId filter based on user's position in hierarchy
    // Root-level users can see their own self-approved expenses
    if (isRootLevelUser && directReportUserIds.length === 0) {
      // Root-level user with no direct reports - show only their own approved expenses
      whereClause.userId = user.id;
    } else if (isRootLevelUser && directReportUserIds.length > 0) {
      // Root-level user with direct reports - show both own and direct reports' approved expenses
      whereClause.userId = {
        in: [...directReportUserIds, user.id],
      };
    } else if (directReportUserIds.length > 0) {
      // Regular manager with direct reports - show only direct reports' approved expenses
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
      if (dateFilter === 'reviewedAt') {
        whereClause.reviewedAt = {
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

    // Fetch approved expenses
    const approvedExpenses = await prisma.expenseClaim.findMany({
      where: whereClause,
      select: {
        id: true,
        claimNumber: true,
        title: true,
        category: true,
        amount: true,
        currency: true,
        expenseDate: true,
        status: true,
        reviewedAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
      orderBy: {
        reviewedAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      expenses: approvedExpenses,
      count: approvedExpenses.length,
    });
  } catch (error) {
    console.error('[GET /api/manager/expenses/approved] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch approved expenses',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
