/**
 * POST /api/admin/timesheets/bulk-reject
 * Bulk reject multiple timesheet entries with a single reason (admin - direct reports only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { sendEmail, getTimesheetRejectedEmail } from '@/lib/resend-email';
import { format, startOfWeek, endOfWeek } from 'date-fns';

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
      select: { id: true, tenantId: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { id: userId, tenantId, role } = user;

    // Only admins can bulk reject via this endpoint
    if (role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { entryIds, reason, category } = body;

    // Validate input
    if (!Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'entryIds must be a non-empty array' },
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

    // Fetch all entries to verify they exist and are in SUBMITTED status
    const entries = await prisma.timesheetEntry.findMany({
      where: {
        id: { in: entryIds },
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

    if (entries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid entries found' },
        { status: 404 }
      );
    }

    // Verify all employees are direct reports
    const adminEmployee = await prisma.employee.findFirst({
      where: { userId: userId, tenantId: tenantId },
      select: { id: true },
    });

    if (!adminEmployee) {
      return NextResponse.json(
        { success: false, error: 'Admin employee record not found' },
        { status: 400 }
      );
    }

    const userIds = entries.map((e) => e.user.id);
    const employeeRecords = await prisma.employee.findMany({
      where: { userId: { in: userIds }, tenantId: tenantId },
      select: { userId: true, managerId: true },
    });

    const employeeManagerMap = new Map(
      employeeRecords.map((e) => [e.userId, e.managerId])
    );

    const invalidEntries = entries.filter(
      (entry) => employeeManagerMap.get(entry.user.id) !== adminEmployee.id
    );

    if (invalidEntries.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'You can only reject entries from your direct reports',
          invalidCount: invalidEntries.length,
        },
        { status: 403 }
      );
    }

    // Filter entries that are in SUBMITTED status
    const submittedEntries = entries.filter((e) => e.status === 'SUBMITTED');

    if (submittedEntries.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'None of the selected entries are in SUBMITTED status',
          details: entries.map((e) => ({ id: e.id, status: e.status })),
        },
        { status: 400 }
      );
    }

    // Bulk reject all valid entries and create rejection history
    const now = new Date();
    const submittedEntryIds = submittedEntries.map((e) => e.id);

    const result = await prisma.$transaction(async (tx) => {
      // Create rejection history records for all entries
      const historyData = submittedEntryIds.map((entryId) => ({
        tenantId: tenantId,
        timesheetEntryId: entryId,
        rejectedBy: userId,
        rejectedAt: now,
        rejectionReason: reason.trim(),
        rejectionCategory: category || null,
      }));

      await tx.timesheetRejectionHistory.createMany({
        data: historyData,
      });

      // Update all entries to REJECTED status
      return tx.timesheetEntry.updateMany({
        where: {
          id: { in: submittedEntryIds },
          status: 'SUBMITTED',
        },
        data: {
          status: 'REJECTED',
          rejectedReason: reason.trim(),
          rejectionCategory: category || null,
          approvedBy: userId,
          approvedAt: now,
        },
      });
    });

    // Get unique employee names for response message
    const uniqueEmployees = Array.from(
      new Set(submittedEntries.map((e) => `${e.user.firstName} ${e.user.lastName}`))
    );

    // Send email notifications to each employee
    const emailPromises = [];
    const employeeEntries = submittedEntries.reduce((acc: any, entry) => {
      const employeeKey = entry.user.id;
      if (!acc[employeeKey]) {
        acc[employeeKey] = {
          email: entry.user.email,
          firstName: entry.user.firstName,
          lastName: entry.user.lastName,
          entries: [],
          totalHours: 0,
        };
      }
      acc[employeeKey].entries.push(entry);
      acc[employeeKey].totalHours += entry.hoursWorked;
      return acc;
    }, {});

    for (const [, employeeData] of Object.entries(employeeEntries) as any) {
      try {
        const firstEntry = employeeData.entries[0];
        const emailTemplate = getTimesheetRejectedEmail({
          employeeName: `${employeeData.firstName} ${employeeData.lastName}`,
          weekStart: format(startOfWeek(new Date(firstEntry.workDate)), 'MMM d, yyyy'),
          weekEnd: format(endOfWeek(new Date(firstEntry.workDate)), 'MMM d, yyyy'),
          totalHours: employeeData.totalHours,
          reason: reason.trim(),
        });

        emailPromises.push(
          sendEmail({
            to: employeeData.email,
            ...emailTemplate,
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
      console.log(`[Bulk Reject] Sent ${emailPromises.length} email notifications`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully rejected ${result.count} timesheet entries`,
      rejectedCount: result.count,
      totalRequested: entryIds.length,
      skippedCount: entryIds.length - result.count,
      employees: uniqueEmployees,
      reason: reason.trim(),
    });
  } catch (error) {
    console.error('[POST /api/admin/timesheets/bulk-reject] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to bulk reject timesheet entries',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
