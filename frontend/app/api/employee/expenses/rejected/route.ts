/**
 * GET /api/employee/expenses/rejected
 * Get rejected expense claims for the current employee
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
      select: { id: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { id: userId, tenantId } = user;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause for rejected expenses
    const whereClause: any = {
      userId,
      tenantId,
      status: 'REJECTED',
    };

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
        rejectedAt: expense.reviewedAt?.toISOString(),
        rejector: expense.reviewer,
      })),
      count: rejectedExpenses.length,
      summary: {
        totalAmount: rejectedExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0),
        byCategory: rejectedExpenses.reduce((acc: any, exp) => {
          if (!acc[exp.category]) {
            acc[exp.category] = { count: 0, amount: 0 };
          }
          acc[exp.category].count++;
          acc[exp.category].amount += Number(exp.amount);
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error('[GET /api/employee/expenses/rejected] Error:', error);
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
