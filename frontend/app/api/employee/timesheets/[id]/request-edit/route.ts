/**
 * POST /api/employee/timesheets/[id]/request-edit
 * Request to revert a SUBMITTED timesheet entry back to DRAFT for editing
 * Only the owner can request edit, and only for SUBMITTED entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

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
      select: { id: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch the entry
    const entry = await prisma.timesheetEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Timesheet entry not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (entry.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only request edit for your own entries' },
        { status: 403 }
      );
    }

    // Verify tenant match
    if (entry.tenantId !== user.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Only SUBMITTED entries can be reverted
    if (entry.status !== 'SUBMITTED') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot request edit for entry with status: ${entry.status}. Only SUBMITTED entries can be reverted.`
        },
        { status: 400 }
      );
    }

    // Revert the entry to DRAFT status
    const updatedEntry = await prisma.timesheetEntry.update({
      where: { id: entryId },
      data: {
        status: 'DRAFT',
        submittedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Entry reverted to draft. You can now edit and resubmit.',
      entry: updatedEntry,
    });
  } catch (error) {
    console.error('[POST /api/employee/timesheets/[id]/request-edit] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to request edit',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
