import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

/**
 * GET /api/employee/expenses/[id]
 * Fetch single expense claim
 */
export async function GET(
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
      select: { id: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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

    return NextResponse.json({
      success: true,
      expense,
    });
  } catch (error) {
    console.error('Fetch expense error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/employee/expenses/[id]
 * Update expense claim (only for DRAFT or REJECTED)
 */
export async function PUT(
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
      select: { id: true, tenantId: true },
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

    // Can only edit DRAFT or REJECTED expenses
    if (expense.status !== 'DRAFT' && expense.status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Cannot edit expense with status: ' + expense.status },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      title,
      category,
      amount,
      currency,
      expenseDate,
      description,
      receiptUrls,
      notes,
      tags,
    } = body;

    // Parse expense date as UTC to avoid timezone issues
    let expenseDateUTC: Date | undefined;
    if (expenseDate) {
      expenseDateUTC = new Date(`${expenseDate}T00:00:00.000Z`);

      // Get tenant settings to check if future expenses are allowed
      const tenantSettings = await prisma.tenantSettings.findUnique({
        where: { tenantId: user.tenantId },
        select: { allowFutureExpenses: true },
      });

      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      if (expenseDateUTC > today) {
        // Check if future expenses are allowed
        if (!tenantSettings?.allowFutureExpenses) {
          return NextResponse.json(
            { error: 'Expense date cannot be in the future' },
            { status: 400 }
          );
        }
      }
    }

    // Update expense
    const updatedExpense = await prisma.expenseClaim.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(category && { category }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(currency && { currency }),
        ...(expenseDateUTC && { expenseDate: expenseDateUTC }),
        ...(description && { description }),
        ...(receiptUrls !== undefined && { receiptUrls }),
        ...(notes !== undefined && { notes }),
        ...(tags !== undefined && { tags }),
      },
    });

    return NextResponse.json({
      success: true,
      expense: updatedExpense,
    });
  } catch (error) {
    console.error('Update expense error:', error);
    return NextResponse.json(
      { error: 'Failed to update expense', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/employee/expenses/[id]
 * Delete expense claim (only for DRAFT)
 */
export async function DELETE(
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
      select: { id: true, tenantId: true },
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

    // Can only delete DRAFT expenses
    if (expense.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot delete expense with status: ' + expense.status },
        { status: 400 }
      );
    }

    await prisma.expenseClaim.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
