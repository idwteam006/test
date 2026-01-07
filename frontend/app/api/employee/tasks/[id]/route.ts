import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

/**
 * PATCH /api/employee/tasks/[id]
 * Update task status (employee can update their own tasks)
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

    const { userId, tenantId } = sessionData;

    // Fetch employee to get employeeId
    const employee = await prisma.employee.findFirst({
      where: {
        userId,
        tenantId,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      console.error('Invalid status received:', status, 'Type:', typeof status);
      return NextResponse.json(
        { error: `Invalid status "${status}". Must be one of: TODO, IN_PROGRESS, IN_REVIEW, COMPLETED, CANCELLED` },
        { status: 400 }
      );
    }

    // Verify task exists and belongs to this employee
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        tenantId,
        assigneeId: employee.id,
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found or not assigned to you' },
        { status: 404 }
      );
    }

    // Update task status
    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true,
            status: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'task.status_updated',
        entityType: 'task',
        entityId: id,
        changes: {
          oldStatus: existingTask.status,
          newStatus: status,
        },
        eventType: 'task',
        success: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Task status updated successfully',
      task: updatedTask,
    });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json(
      { error: 'Failed to update task status' },
      { status: 500 }
    );
  }
}
