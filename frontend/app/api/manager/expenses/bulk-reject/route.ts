/**
 * POST /api/manager/expenses/bulk-reject
 * Bulk reject multiple expense claims with a single reason (manager - direct reports only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { notifyEmployeeExpenseRejected } from '@/lib/email-notifications';

export async function POST(request: NextRequest) {
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
      select: { id: true, tenantId: true, role: true, firstName: true, lastName: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { id: userId, tenantId, role } = user;

    // Only managers and admins can bulk reject via this endpoint
    if (role !== 'MANAGER' && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Manager access required.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { expenseIds, reason } = body;

    // Validate input
    if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'expenseIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate rejection reason
    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Fetch all expenses to verify they exist and are in SUBMITTED status
    const expenses = await prisma.expenseClaim.findMany({
      where: {
        id: { in: expenseIds },
        tenantId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (expenses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid expenses found' },
        { status: 404 }
      );
    }

    // Verify all employees are direct reports
    const managerEmployee = await prisma.employee.findFirst({
      where: { userId: userId, tenantId: tenantId },
      select: { id: true },
    });

    if (!managerEmployee) {
      return NextResponse.json(
        { success: false, error: 'Manager employee record not found' },
        { status: 400 }
      );
    }

    const userIds = expenses.map((e) => e.user.id);
    const employeeRecords = await prisma.employee.findMany({
      where: { userId: { in: userIds }, tenantId: tenantId },
      select: { userId: true, managerId: true },
    });

    const employeeManagerMap = new Map(
      employeeRecords.map((e) => [e.userId, e.managerId])
    );

    const invalidExpenses = expenses.filter(
      (expense) => employeeManagerMap.get(expense.user.id) !== managerEmployee.id
    );

    if (invalidExpenses.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'You can only reject expenses from your direct reports',
          invalidCount: invalidExpenses.length,
        },
        { status: 403 }
      );
    }

    // Filter expenses that are in SUBMITTED status
    const submittedExpenses = expenses.filter((e) => e.status === 'SUBMITTED');

    if (submittedExpenses.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'None of the selected expenses are in SUBMITTED status',
          details: expenses.map((e) => ({ id: e.id, status: e.status })),
        },
        { status: 400 }
      );
    }

    // Bulk reject all valid expenses
    const now = new Date();
    const submittedExpenseIds = submittedExpenses.map((e) => e.id);

    const result = await prisma.expenseClaim.updateMany({
      where: {
        id: { in: submittedExpenseIds },
        status: 'SUBMITTED',
      },
      data: {
        status: 'REJECTED',
        rejectionReason: reason.trim(),
        reviewedBy: userId,
        reviewedAt: now,
      },
    });

    // Get unique employee names for response message
    const uniqueEmployees = Array.from(
      new Set(submittedExpenses.map((e) => `${e.user.firstName} ${e.user.lastName}`))
    );

    // Send email notifications to each employee
    const emailPromises = [];
    const employeeExpenses = submittedExpenses.reduce((acc: any, expense) => {
      const employeeKey = expense.user.id;
      if (!acc[employeeKey]) {
        acc[employeeKey] = {
          email: expense.user.email,
          firstName: expense.user.firstName,
          lastName: expense.user.lastName,
          expenses: [],
          totalAmount: 0,
        };
      }
      acc[employeeKey].expenses.push(expense);
      acc[employeeKey].totalAmount += Number(expense.amount);
      return acc;
    }, {});

    for (const [, employeeData] of Object.entries(employeeExpenses) as any) {
      try {
        const expenseCount = employeeData.expenses.length;
        const expenseTitle = expenseCount === 1
          ? employeeData.expenses[0].title || employeeData.expenses[0].description || 'Expense Claim'
          : `${expenseCount} Expense Claims`;

        emailPromises.push(
          notifyEmployeeExpenseRejected({
            employeeEmail: employeeData.email,
            employeeName: `${employeeData.firstName} ${employeeData.lastName}`,
            expenseTitle,
            amount: employeeData.totalAmount,
            currency: employeeData.expenses[0].currency || 'USD',
            rejectedBy: `${user.firstName} ${user.lastName}`,
            reason: reason.trim(),
          }).catch((err) => {
            console.error(`Failed to send rejection email to ${employeeData.email}:`, err);
          })
        );
      } catch (emailError) {
        console.error('[Bulk Reject] Failed to prepare email:', emailError);
      }
    }

    // Send all emails in parallel
    if (emailPromises.length > 0) {
      await Promise.allSettled(emailPromises);
      console.log(`[Bulk Reject Expenses] Sent ${emailPromises.length} email notifications`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully rejected ${result.count} expense claims`,
      rejectedCount: result.count,
      totalRequested: expenseIds.length,
      skippedCount: expenseIds.length - result.count,
      employees: uniqueEmployees,
      reason: reason.trim(),
    });
  } catch (error) {
    console.error('[POST /api/manager/expenses/bulk-reject] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to bulk reject expense claims',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
