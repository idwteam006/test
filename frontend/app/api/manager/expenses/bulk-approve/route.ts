/**
 * POST /api/manager/expenses/bulk-approve
 * Bulk approve multiple expense claims
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { notifyEmployeeExpenseApproved } from '@/lib/email-notifications';

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

    // Only managers and admins can bulk approve
    if (role !== 'MANAGER' && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Manager access required.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { expenseIds } = body;

    // Validate input
    if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'expenseIds must be a non-empty array' },
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

    // If MANAGER role, verify all employees are direct reports
    if (role === 'MANAGER') {
      // Get the manager's employee record
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

      // Get all employee records for the users in the expenses
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
            error: 'You can only approve expenses from your direct reports',
            invalidCount: invalidExpenses.length,
          },
          { status: 403 }
        );
      }
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

    // Bulk approve all valid expenses
    const result = await prisma.expenseClaim.updateMany({
      where: {
        id: { in: submittedExpenses.map((e) => e.id) },
        status: 'SUBMITTED',
      },
      data: {
        status: 'APPROVED',
        reviewedBy: userId,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });

    // Get unique employee names for response message
    const uniqueEmployees = Array.from(
      new Set(submittedExpenses.map((e) => `${e.user.firstName} ${e.user.lastName}`))
    );

    // Send email notifications to each employee
    const emailPromises = [];
    for (const expense of submittedExpenses) {
      try {
        emailPromises.push(
          notifyEmployeeExpenseApproved({
            employeeEmail: expense.user.email,
            employeeName: `${expense.user.firstName} ${expense.user.lastName}`,
            expenseTitle: expense.description || 'Expense Claim',
            amount: Number(expense.amount),
            currency: expense.currency || 'USD',
            approvedBy: `${user.firstName} ${user.lastName}`,
          }).catch((err) => {
            console.error(`Failed to send email to ${expense.user.email}:`, err);
          })
        );
      } catch (emailError) {
        console.error('[Bulk Approve Expenses] Failed to prepare email:', emailError);
      }
    }

    // Send all emails in parallel
    if (emailPromises.length > 0) {
      await Promise.allSettled(emailPromises);
      console.log(`[Bulk Approve Expenses] Sent ${emailPromises.length} email notifications`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully approved ${result.count} expense claims`,
      approvedCount: result.count,
      totalRequested: expenseIds.length,
      skippedCount: expenseIds.length - result.count,
      employees: uniqueEmployees,
    });
  } catch (error) {
    console.error('[POST /api/manager/expenses/bulk-approve] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to bulk approve expense claims',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
