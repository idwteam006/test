import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { notifyEmployeeExpenseRejected } from '@/lib/email-notifications';

/**
 * POST /api/manager/expenses/[id]/reject
 * Reject an expense claim
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: { id: true, tenantId: true, role: true, departmentId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only managers and admins can reject
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get expense with user details
    const expense = await prisma.expenseClaim.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
      },
      include: {
        user: {
          select: {
            departmentId: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Managers can only reject expenses from their direct reports
    if (user.role === 'MANAGER') {
      // Get the manager's employee record
      const managerEmployee = await prisma.employee.findFirst({
        where: { userId: user.id, tenantId: user.tenantId },
        select: { id: true },
      });

      // Get the employee who submitted the expense
      const employeeRecord = await prisma.employee.findFirst({
        where: { userId: expense.userId, tenantId: user.tenantId },
        select: { managerId: true },
      });

      if (!managerEmployee || employeeRecord?.managerId !== managerEmployee.id) {
        return NextResponse.json(
          { error: 'You can only reject expenses from your direct reports' },
          { status: 403 }
        );
      }
    }

    // Can only reject SUBMITTED expenses
    if (expense.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Can only reject SUBMITTED expenses' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rejectionReason } = body;

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return NextResponse.json(
        { error: 'rejectionReason is required' },
        { status: 400 }
      );
    }

    // Reject expense
    const updatedExpense = await prisma.expenseClaim.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: user.id,
        reviewedAt: new Date(),
        rejectionReason,
      },
    });

    // Send email notification to employee
    try {
      const manager = await prisma.user.findUnique({
        where: { id: user.id },
        select: { firstName: true, lastName: true },
      });

      await notifyEmployeeExpenseRejected({
        employeeEmail: expense.user.email,
        employeeName: `${expense.user.firstName} ${expense.user.lastName}`,
        expenseTitle: expense.description || 'Expense Claim',
        amount: Number(expense.amount),
        currency: expense.currency || 'USD',
        rejectedBy: manager ? `${manager.firstName} ${manager.lastName}` : 'Manager',
        reason: rejectionReason,
      });

      console.log(`[Expense Rejected] Email sent to ${expense.user.email}`);
    } catch (emailError) {
      console.error('[Expense Rejected] Failed to send email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      expense: updatedExpense,
      message: 'Expense rejected',
    });
  } catch (error) {
    console.error('Reject expense error:', error);
    return NextResponse.json(
      { error: 'Failed to reject expense', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
