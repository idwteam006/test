/**
 * POST /api/admin/expenses/[id]/reject
 * Reject an expense claim with reason (admin - direct reports only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { notifyEmployeeExpenseRejected } from '@/lib/email-notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: expenseId } = await params;
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

    // Only admins can reject via this endpoint
    if (role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { reason } = body;

    // Validate rejection reason
    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Fetch the expense to verify it exists and is in SUBMITTED status
    const expense = await prisma.expenseClaim.findUnique({
      where: { id: expenseId },
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

    if (!expense) {
      return NextResponse.json(
        { success: false, error: 'Expense claim not found' },
        { status: 404 }
      );
    }

    // Verify tenant match
    if (expense.tenantId !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access to this expense' },
        { status: 403 }
      );
    }

    // Verify expense is in SUBMITTED status
    if (expense.status !== 'SUBMITTED') {
      return NextResponse.json(
        { success: false, error: `Cannot reject expense with status: ${expense.status}` },
        { status: 400 }
      );
    }

    // Verify this employee is a direct report
    const adminEmployee = await prisma.employee.findFirst({
      where: { userId: userId, tenantId: tenantId },
      select: { id: true },
    });

    const employeeRecord = await prisma.employee.findFirst({
      where: { userId: expense.userId, tenantId: tenantId },
      select: { managerId: true },
    });

    if (!adminEmployee || employeeRecord?.managerId !== adminEmployee.id) {
      return NextResponse.json(
        { success: false, error: 'You can only reject expenses from your direct reports' },
        { status: 403 }
      );
    }

    // Reject the expense
    const updatedExpense = await prisma.expenseClaim.update({
      where: { id: expenseId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason.trim(),
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Send email notification to employee
    try {
      await notifyEmployeeExpenseRejected({
        employeeEmail: updatedExpense.user.email,
        employeeName: `${updatedExpense.user.firstName} ${updatedExpense.user.lastName}`,
        expenseTitle: updatedExpense.title || updatedExpense.description || 'Expense Claim',
        amount: Number(updatedExpense.amount),
        currency: updatedExpense.currency || 'USD',
        rejectedBy: `${user.firstName} ${user.lastName}`,
        reason: reason.trim(),
      });

      console.log(`[Expense Rejected] Email sent to ${updatedExpense.user.email}`);
    } catch (emailError) {
      console.error('[Expense Rejected] Failed to send email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: `Expense claim rejected for ${updatedExpense.user.firstName} ${updatedExpense.user.lastName}`,
      expense: updatedExpense,
    });
  } catch (error) {
    console.error('[POST /api/admin/expenses/[id]/reject] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reject expense claim',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
