/**
 * POST /api/admin/timesheets/[id]/approve
 * Approve a timesheet entry (admin - direct reports only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { notifyEmployeeTimesheetApproved } from '@/lib/email-notifications';
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

    // Only admins can approve via this endpoint
    if (role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
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
        { success: false, error: `Cannot approve entry with status: ${entry.status}` },
        { status: 400 }
      );
    }

    // Verify this employee is a direct report
    const adminEmployee = await prisma.employee.findFirst({
      where: { userId: userId, tenantId: tenantId },
      select: { id: true },
    });

    const employeeRecord = await prisma.employee.findFirst({
      where: { userId: entry.userId, tenantId: tenantId },
      select: { managerId: true },
    });

    if (!adminEmployee || employeeRecord?.managerId !== adminEmployee.id) {
      return NextResponse.json(
        { success: false, error: 'You can only approve entries from your direct reports' },
        { status: 403 }
      );
    }

    // Approve the entry
    const updatedEntry = await prisma.timesheetEntry.update({
      where: { id: entryId },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
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
      const admin = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      await notifyEmployeeTimesheetApproved({
        employeeEmail: updatedEntry.user.email,
        employeeName: `${updatedEntry.user.firstName} ${updatedEntry.user.lastName}`,
        weekStart: format(startOfWeek(new Date(updatedEntry.workDate)), 'MMM d, yyyy'),
        weekEnd: format(endOfWeek(new Date(updatedEntry.workDate)), 'MMM d, yyyy'),
        totalHours: updatedEntry.hoursWorked,
        approvedBy: admin ? `${admin.firstName} ${admin.lastName}` : 'Admin',
      });

      console.log(`[Timesheet Approved] Email sent to ${updatedEntry.user.email}`);
    } catch (emailError) {
      console.error('[Timesheet Approved] Failed to send email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: `Timesheet entry approved for ${updatedEntry.user.firstName} ${updatedEntry.user.lastName}`,
      entry: updatedEntry,
    });
  } catch (error) {
    console.error('[POST /api/admin/timesheets/[id]/approve] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to approve timesheet entry',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
