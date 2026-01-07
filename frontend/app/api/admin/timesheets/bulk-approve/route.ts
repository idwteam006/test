/**
 * POST /api/admin/timesheets/bulk-approve
 * Bulk approve multiple timesheet entries (admin - direct reports only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { sendEmail, getTimesheetApprovedEmail } from '@/lib/resend-email';
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
      select: { id: true, tenantId: true, role: true, departmentId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { id: userId, tenantId, role } = user;

    // Only admins can bulk approve via this endpoint
    if (role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { entryIds } = body;

    // Validate input
    if (!Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'entryIds must be a non-empty array' },
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
            departmentId: true,
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

    // Get all employee records for the users in the entries
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
          error: 'You can only approve entries from your direct reports',
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

    // Bulk approve all valid entries
    const result = await prisma.timesheetEntry.updateMany({
      where: {
        id: { in: submittedEntries.map((e) => e.id) },
        status: 'SUBMITTED',
      },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    // Get unique employee names for response message
    const uniqueEmployees = Array.from(
      new Set(submittedEntries.map((e) => `${e.user.firstName} ${e.user.lastName}`))
    );

    // Send email notifications to each employee
    const emailPromises = [];
    const employeeEntries = submittedEntries.reduce((acc: any, entry) => {
      const employeeEmail = entry.user.firstName + ' ' + entry.user.lastName;
      if (!acc[employeeEmail]) {
        acc[employeeEmail] = {
          email: (entry as any).user.email || '',
          firstName: entry.user.firstName,
          lastName: entry.user.lastName,
          entries: [],
          totalHours: 0,
        };
      }
      acc[employeeEmail].entries.push(entry);
      acc[employeeEmail].totalHours += entry.hoursWorked;
      return acc;
    }, {});

    for (const [, employeeData] of Object.entries(employeeEntries) as any) {
      try {
        const firstEntry = employeeData.entries[0];
        const emailTemplate = getTimesheetApprovedEmail({
          employeeName: `${employeeData.firstName} ${employeeData.lastName}`,
          weekStart: format(startOfWeek(new Date(firstEntry.workDate)), 'MMM d, yyyy'),
          weekEnd: format(endOfWeek(new Date(firstEntry.workDate)), 'MMM d, yyyy'),
          totalHours: employeeData.totalHours,
        });

        emailPromises.push(
          sendEmail({
            to: employeeData.email,
            ...emailTemplate,
          }).catch((err) => {
            console.error(`Failed to send email to ${employeeData.email}:`, err);
          })
        );
      } catch (emailError) {
        console.error('[Bulk Approve] Failed to prepare email:', emailError);
      }
    }

    // Send all emails in parallel
    if (emailPromises.length > 0) {
      await Promise.allSettled(emailPromises);
      console.log(`[Bulk Approve] Sent ${emailPromises.length} email notifications`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully approved ${result.count} timesheet entries`,
      approvedCount: result.count,
      totalRequested: entryIds.length,
      skippedCount: entryIds.length - result.count,
      employees: uniqueEmployees,
    });
  } catch (error) {
    console.error('[POST /api/admin/timesheets/bulk-approve] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to bulk approve timesheet entries',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
