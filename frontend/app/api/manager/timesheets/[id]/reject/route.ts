/**
 * POST /api/manager/timesheets/[id]/reject
 * Reject a timesheet entry with reason
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { sendEmail, getTimesheetRejectedEmail } from '@/lib/resend-email';
import { format, startOfWeek, endOfWeek } from 'date-fns';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: entryId } = await params;
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

    // Only managers and admins can reject
    if (role !== 'MANAGER' && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Manager access required.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { reason, category } = body;

    // Validate rejection reason
    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Validate rejection category (optional but must be valid if provided)
    const validCategories = [
      'INSUFFICIENT_DETAIL',
      'HOURS_EXCEED_LIMIT',
      'WRONG_PROJECT_TASK',
      'BILLABLE_STATUS_INCORRECT',
      'MISSING_TASK_ASSIGNMENT',
      'HOURS_TOO_LOW',
      'DUPLICATE_ENTRY',
      'INVALID_WORK_DATE',
      'OTHER',
    ];

    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid rejection category' },
        { status: 400 }
      );
    }

    // Fetch the entry to verify it exists and is in SUBMITTED status
    const entry = await prisma.timesheetEntry.findUnique({
      where: { id: entryId },
      include: {
        user: {
          select: {
            departmentId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Timesheet entry not found' },
        { status: 404 }
      );
    }

    // Verify tenant match
    if (entry.tenantId !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access to this entry' },
        { status: 403 }
      );
    }

    // Verify entry is in SUBMITTED status
    if (entry.status !== 'SUBMITTED') {
      return NextResponse.json(
        { success: false, error: `Cannot reject entry with status: ${entry.status}` },
        { status: 400 }
      );
    }

    // If MANAGER role, verify this employee is a direct report
    if (role === 'MANAGER') {
      // Get the manager's employee record
      const managerEmployee = await prisma.employee.findFirst({
        where: { userId: userId, tenantId: tenantId },
        select: { id: true },
      });

      // Get the employee who submitted the timesheet
      const employeeRecord = await prisma.employee.findFirst({
        where: { userId: entry.userId, tenantId: tenantId },
        select: { managerId: true },
      });

      if (!managerEmployee || employeeRecord?.managerId !== managerEmployee.id) {
        return NextResponse.json(
          { success: false, error: 'You can only reject entries from your direct reports' },
          { status: 403 }
        );
      }
    }

    // Reject the entry and create rejection history record
    const now = new Date();

    const updatedEntry = await prisma.$transaction(async (tx) => {
      // Create rejection history record
      await tx.timesheetRejectionHistory.create({
        data: {
          tenantId: tenantId,
          timesheetEntryId: entryId,
          rejectedBy: userId,
          rejectedAt: now,
          rejectionReason: reason.trim(),
          rejectionCategory: category || null,
        },
      });

      // Update the entry to REJECTED status
      return tx.timesheetEntry.update({
        where: { id: entryId },
        data: {
          status: 'REJECTED',
          rejectedReason: reason.trim(),
          rejectionCategory: category || null,
          approvedBy: userId, // Track who rejected it
          approvedAt: now, // Use this field to track rejection time
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
    });

    // Send email notification to employee
    try {
      const emailTemplate = getTimesheetRejectedEmail({
        employeeName: `${updatedEntry.user.firstName} ${updatedEntry.user.lastName}`,
        weekStart: format(startOfWeek(new Date(updatedEntry.workDate)), 'MMM d, yyyy'),
        weekEnd: format(endOfWeek(new Date(updatedEntry.workDate)), 'MMM d, yyyy'),
        totalHours: updatedEntry.hoursWorked,
        reason: reason.trim(),
      });

      await sendEmail({
        to: updatedEntry.user.email,
        ...emailTemplate,
      });

      console.log(`[Timesheet Rejected] Email sent to ${updatedEntry.user.email}`);
    } catch (emailError) {
      console.error('[Timesheet Rejected] Failed to send email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: `Timesheet entry rejected for ${updatedEntry.user.firstName} ${updatedEntry.user.lastName}`,
      entry: updatedEntry,
    });
  } catch (error) {
    console.error('[POST /api/manager/timesheets/[id]/reject] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reject timesheet entry',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
