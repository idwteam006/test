/**
 * GET /api/employee/auto-approve
 * Check if current user is a root-level employee (no manager)
 *
 * POST /api/employee/auto-approve
 * Auto-approve all SUBMITTED timesheets and expenses for root-level employee
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

// Check if user is root-level (no manager)
export async function GET() {
  try {
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

    // Check if user has an employee record with no manager
    const employee = await prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
      select: { id: true, managerId: true },
    });

    if (!employee) {
      return NextResponse.json({
        success: true,
        isRootLevel: false,
        reason: 'No employee record found',
      });
    }

    const isRootLevel = employee.managerId === null;

    console.log('[GET /api/employee/auto-approve] User:', user.id, 'Employee:', employee.id, 'ManagerId:', employee.managerId, 'IsRootLevel:', isRootLevel);

    // If root level, get count of pending submissions
    let pendingTimesheets = 0;
    let pendingExpenses = 0;

    if (isRootLevel) {
      pendingTimesheets = await prisma.timesheetEntry.count({
        where: {
          userId: user.id,
          tenantId: user.tenantId,
          status: 'SUBMITTED',
        },
      });

      pendingExpenses = await prisma.expenseClaim.count({
        where: {
          userId: user.id,
          tenantId: user.tenantId,
          status: 'SUBMITTED',
        },
      });

      console.log('[GET /api/employee/auto-approve] Pending counts - Timesheets:', pendingTimesheets, 'Expenses:', pendingExpenses);
    }

    return NextResponse.json({
      success: true,
      isRootLevel,
      pendingTimesheets,
      pendingExpenses,
    });
  } catch (error) {
    console.error('[GET /api/employee/auto-approve] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check root level status' },
      { status: 500 }
    );
  }
}

// Auto-approve all SUBMITTED timesheets and expenses for root-level employee
export async function POST(request: NextRequest) {
  try {
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

    // Check if user is root-level (no manager)
    const employee = await prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
      select: { id: true, managerId: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee record not found' },
        { status: 400 }
      );
    }

    if (employee.managerId !== null) {
      return NextResponse.json(
        { error: 'Auto-approval is only available for root-level employees (those without a manager)' },
        { status: 403 }
      );
    }

    // Parse request body to get type (timesheets, expenses, or both)
    const body = await request.json().catch(() => ({}));
    const { type = 'both' } = body; // 'timesheets', 'expenses', or 'both'

    const results = {
      timesheetsApproved: 0,
      expensesApproved: 0,
    };

    // Auto-approve timesheets
    if (type === 'timesheets' || type === 'both') {
      const timesheetResult = await prisma.timesheetEntry.updateMany({
        where: {
          userId: user.id,
          tenantId: user.tenantId,
          status: 'SUBMITTED',
        },
        data: {
          status: 'APPROVED',
          approvedBy: user.id,
          approvedAt: new Date(),
        },
      });
      results.timesheetsApproved = timesheetResult.count;
    }

    // Auto-approve expenses
    if (type === 'expenses' || type === 'both') {
      const expenseResult = await prisma.expenseClaim.updateMany({
        where: {
          userId: user.id,
          tenantId: user.tenantId,
          status: 'SUBMITTED',
        },
        data: {
          status: 'APPROVED',
          reviewedBy: user.id,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      });
      results.expensesApproved = expenseResult.count;
    }

    const totalApproved = results.timesheetsApproved + results.expensesApproved;

    if (totalApproved === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending submissions to auto-approve',
        results,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Auto-approved ${results.timesheetsApproved} timesheet(s) and ${results.expensesApproved} expense(s)`,
      results,
    });
  } catch (error) {
    console.error('[POST /api/employee/auto-approve] Error:', error);
    return NextResponse.json(
      { error: 'Failed to auto-approve submissions' },
      { status: 500 }
    );
  }
}
