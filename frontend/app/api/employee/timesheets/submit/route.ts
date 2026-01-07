import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { notifyManagerTimesheetSubmitted } from '@/lib/email-notifications';

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData?.userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tenantId: true,
        employee: {
          select: {
            id: true,
            managerId: true,
            manager: {
              select: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has an employee profile
    if (!user.employee) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot submit timesheets. Employee profile not found.',
          message: 'Please contact HR to set up your employee profile.',
        },
        { status: 403 }
      );
    }

    const isTopLevelManager = !user.employee.managerId;

    const body = await request.json();
    const { entryIds, weekStart, weekEnd } = body;

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json({ error: 'No entries to submit' }, { status: 400 });
    }

    // Verify all entries belong to user and are in DRAFT or REJECTED status
    const entries = await prisma.timesheetEntry.findMany({
      where: {
        id: { in: entryIds },
        userId: user.id,
      },
    });

    if (entries.length !== entryIds.length) {
      return NextResponse.json(
        { error: 'Some entries are not found or do not belong to you' },
        { status: 400 }
      );
    }

    const invalidEntries = entries.filter(
      (e) => !['DRAFT', 'REJECTED'].includes(e.status)
    );

    if (invalidEntries.length > 0) {
      return NextResponse.json(
        { error: 'Only DRAFT or REJECTED entries can be submitted' },
        { status: 400 }
      );
    }

    // All users (including top-level managers) submit to SUBMITTED status
    // Root-level employees (no manager) can auto-approve via the Auto-Approve button on the timesheets page
    await prisma.timesheetEntry.updateMany({
      where: {
        id: { in: entryIds },
        userId: user.id,
      },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    // Calculate total hours
    const totalHours = entries.reduce((sum, entry) => sum + entry.hoursWorked, 0);

    // Send email notification to manager (skip for top-level managers)
    if (!isTopLevelManager && user.employee?.manager?.user) {
      const manager = user.employee.manager.user;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      try {
        await notifyManagerTimesheetSubmitted({
          managerEmail: manager.email,
          managerName: `${manager.firstName} ${manager.lastName}`,
          employeeName: `${user.firstName} ${user.lastName}`,
          weekStart: weekStart || 'N/A',
          weekEnd: weekEnd || 'N/A',
          totalHours,
          reviewUrl: `${appUrl}/manager/timesheet-approvals`,
        });
      } catch (emailError) {
        console.error('Failed to send manager notification email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: isTopLevelManager
        ? `${entries.length} entries submitted for self-approval`
        : `${entries.length} entries submitted for approval`,
      submittedCount: entries.length,
      requiresSelfApproval: isTopLevelManager,
    });
  } catch (error) {
    console.error('Submit timesheets error:', error);
    return NextResponse.json({ error: 'Failed to submit timesheets' }, { status: 500 });
  }
}
