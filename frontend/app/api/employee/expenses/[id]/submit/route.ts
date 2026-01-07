import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { notifyManagerExpenseSubmitted } from '@/lib/email-notifications';
import { format } from 'date-fns';

/**
 * POST /api/employee/expenses/[id]/submit
 * Submit expense claim for approval
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
      select: { id: true, tenantId: true, firstName: true, lastName: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if expense exists and belongs to user
    const expense = await prisma.expenseClaim.findFirst({
      where: {
        id,
        userId: user.id,
        tenantId: user.tenantId,
      },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Can only submit DRAFT or REJECTED expenses
    if (expense.status !== 'DRAFT' && expense.status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Can only submit DRAFT or REJECTED expenses' },
        { status: 400 }
      );
    }

    // Get the employee's manager first to determine if root-level
    const employeeRecord = await prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
      include: {
        manager: {
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const isRootLevel = !employeeRecord?.managerId;

    // Update expense to SUBMITTED
    // Root-level employees (no manager) can auto-approve via the Auto-Approve button on the expenses page
    const updatedExpense = await prisma.expenseClaim.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        // Clear rejection reason if resubmitting
        rejectionReason: null,
      },
    });

    // Send notification to manager (skip for root-level employees)
    if (!isRootLevel && employeeRecord?.manager?.user) {
      try {
        const manager = employeeRecord.manager.user;
        const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://zenora.ai';

        await notifyManagerExpenseSubmitted({
          managerEmail: manager.email,
          managerName: `${manager.firstName} ${manager.lastName}`,
          employeeName: `${user.firstName} ${user.lastName}`,
          expenseTitle: updatedExpense.description || 'Expense Claim',
          amount: Number(updatedExpense.amount),
          currency: updatedExpense.currency || 'USD',
          category: updatedExpense.category || 'General',
          expenseDate: format(new Date(updatedExpense.expenseDate), 'MMM d, yyyy'),
          reviewUrl: `${APP_URL}/manager/expenses`,
        });

        console.log(`[Expense Submitted] Email sent to manager ${manager.email}`);
      } catch (emailError) {
        console.error('[Expense Submitted] Failed to send email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      expense: updatedExpense,
      message: isRootLevel
        ? 'Expense submitted for self-approval'
        : 'Expense submitted for approval',
      requiresSelfApproval: isRootLevel,
    });
  } catch (error) {
    console.error('Submit expense error:', error);
    return NextResponse.json(
      { error: 'Failed to submit expense', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
