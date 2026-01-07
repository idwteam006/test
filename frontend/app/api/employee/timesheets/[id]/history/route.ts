/**
 * GET /api/employee/timesheets/[id]/history
 * Get the approval history for a timesheet entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

export async function GET(
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
      select: { id: true, tenantId: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch the entry with approver info
    const entry = await prisma.timesheetEntry.findUnique({
      where: { id: entryId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        approver: {
          select: {
            id: true,
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
    if (entry.tenantId !== user.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Build history timeline
    const history = [];

    // Created event
    history.push({
      action: 'CREATED',
      timestamp: entry.createdAt,
      user: `${entry.user.firstName} ${entry.user.lastName}`,
      details: `Entry created for ${entry.hoursWorked}h`,
    });

    // Submitted event
    if (entry.submittedAt) {
      history.push({
        action: 'SUBMITTED',
        timestamp: entry.submittedAt,
        user: `${entry.user.firstName} ${entry.user.lastName}`,
        details: 'Submitted for approval',
      });
    }

    // Approved/Rejected event
    if (entry.approvedAt && entry.approver) {
      if (entry.status === 'APPROVED') {
        history.push({
          action: 'APPROVED',
          timestamp: entry.approvedAt,
          user: `${entry.approver.firstName} ${entry.approver.lastName}`,
          details: entry.approver.id === entry.user.id ? 'Self-approved' : 'Approved by manager',
        });
      } else if (entry.status === 'REJECTED') {
        history.push({
          action: 'REJECTED',
          timestamp: entry.approvedAt,
          user: `${entry.approver.firstName} ${entry.approver.lastName}`,
          details: entry.rejectedReason || 'Rejected',
        });
      }
    }

    // Last updated (if different from created)
    if (entry.updatedAt.getTime() !== entry.createdAt.getTime()) {
      history.push({
        action: 'UPDATED',
        timestamp: entry.updatedAt,
        user: `${entry.user.firstName} ${entry.user.lastName}`,
        details: 'Entry modified',
      });
    }

    // Sort by timestamp descending (most recent first)
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      entry: {
        id: entry.id,
        status: entry.status,
        workDate: entry.workDate,
        hoursWorked: entry.hoursWorked,
      },
      history,
    });
  } catch (error) {
    console.error('[GET /api/employee/timesheets/[id]/history] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get entry history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
