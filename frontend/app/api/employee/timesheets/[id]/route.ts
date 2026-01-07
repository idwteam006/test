import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

/**
 * GET /api/employee/timesheets/[id]
 * Fetch a single timesheet entry
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

    const entry = await prisma.timesheetEntry.findFirst({
      where: {
        id,
        userId: sessionData.userId,
      },
      include: {
        project: true,
        task: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Timesheet entry not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      entry: {
        ...entry,
        workDate: entry.workDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD
      },
    });
  } catch (error) {
    console.error('Fetch timesheet entry error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timesheet entry' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/employee/timesheets/[id]
 * Update a timesheet entry
 */
export async function PATCH(
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

    // Check if entry exists and belongs to user
    const existingEntry = await prisma.timesheetEntry.findFirst({
      where: {
        id,
        userId: sessionData.userId,
      },
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Timesheet entry not found' }, { status: 404 });
    }

    // Can't edit submitted/approved entries
    if (existingEntry.status !== 'DRAFT' && existingEntry.status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Cannot edit timesheet that is already submitted or approved' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      projectId,
      taskId,
      startTime,
      endTime,
      hoursWorked,
      breakHours,
      workType,
      activityType,
      description,
      isBillable,
      billingRate,
      tags,
    } = body;

    // Validation
    if (hoursWorked !== undefined && (hoursWorked <= 0 || hoursWorked > 24)) {
      return NextResponse.json(
        { error: 'hoursWorked must be between 0 and 24' },
        { status: 400 }
      );
    }

    // Validate projectId belongs to user's tenant
    if (projectId) {
      const user = await prisma.user.findUnique({
        where: { id: sessionData.userId },
        select: { tenantId: true },
      });

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { tenantId: true },
      });

      if (!project || project.tenantId !== user?.tenantId) {
        return NextResponse.json(
          { error: 'Invalid project ID' },
          { status: 400 }
        );
      }
    }

    // Validate taskId belongs to user's tenant
    if (taskId) {
      const user = await prisma.user.findUnique({
        where: { id: sessionData.userId },
        select: { tenantId: true },
      });

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { project: { select: { tenantId: true } } },
      });

      if (!task || task.project.tenantId !== user?.tenantId) {
        return NextResponse.json(
          { error: 'Invalid task ID' },
          { status: 400 }
        );
      }
    }

    // Check for overlapping time entries when updating start/end times
    if (startTime !== undefined && endTime !== undefined) {
      const finalStartTime = startTime || existingEntry.startTime;
      const finalEndTime = endTime || existingEntry.endTime;

      if (finalStartTime && finalEndTime) {
        const overlappingEntries = await prisma.timesheetEntry.findFirst({
          where: {
            userId: sessionData.userId,
            workDate: existingEntry.workDate,
            id: { not: id }, // Exclude current entry
            status: { notIn: ['REJECTED'] },
            OR: [
              {
                AND: [
                  { startTime: { not: null } },
                  { endTime: { not: null } },
                  { startTime: { lt: finalEndTime } },
                  { endTime: { gt: finalStartTime } },
                ],
              },
            ],
          },
        });

        if (overlappingEntries) {
          return NextResponse.json(
            { error: 'Time entry overlaps with an existing entry on this date' },
            { status: 400 }
          );
        }
      }
    }

    // Recalculate billing amount if needed
    let billingAmount = existingEntry.billingAmount;
    if (isBillable !== undefined && billingRate !== undefined) {
      billingAmount = (hoursWorked || existingEntry.hoursWorked) * billingRate;
    }

    // Update entry
    const updatedEntry = await prisma.timesheetEntry.update({
      where: { id },
      data: {
        ...(projectId !== undefined && { projectId }),
        ...(taskId !== undefined && { taskId }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(hoursWorked !== undefined && { hoursWorked }),
        ...(breakHours !== undefined && { breakHours }),
        ...(workType !== undefined && { workType }),
        ...(activityType !== undefined && { activityType }),
        ...(description !== undefined && { description }),
        ...(isBillable !== undefined && { isBillable }),
        ...(billingRate !== undefined && { billingRate }),
        ...(billingAmount !== undefined && { billingAmount }),
        ...(tags !== undefined && { tags }),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true,
          },
        },
        task: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      entry: {
        ...updatedEntry,
        workDate: updatedEntry.workDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD
      },
    });
  } catch (error) {
    console.error('Update timesheet entry error:', error);
    return NextResponse.json(
      { error: 'Failed to update timesheet entry' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/employee/timesheets/[id]
 * Delete a timesheet entry
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

    // Check if entry exists and belongs to user
    const existingEntry = await prisma.timesheetEntry.findFirst({
      where: {
        id,
        userId: sessionData.userId,
      },
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Timesheet entry not found' }, { status: 404 });
    }

    // Can't delete submitted/approved entries
    if (existingEntry.status !== 'DRAFT' && existingEntry.status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Cannot delete timesheet that is already submitted or approved' },
        { status: 400 }
      );
    }

    await prisma.timesheetEntry.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Timesheet entry deleted successfully',
    });
  } catch (error) {
    console.error('Delete timesheet entry error:', error);
    return NextResponse.json(
      { error: 'Failed to delete timesheet entry' },
      { status: 500 }
    );
  }
}
