import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { z } from 'zod';

const updateClearanceSchema = z.object({
  taskId: z.string(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'NOT_APPLICABLE']),
  remarks: z.string().optional(),
});

/**
 * GET /api/hr/exit/[id]/clearance
 * Get clearance tasks for an exit request
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
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    const clearanceTasks = await prisma.clearanceTask.findMany({
      where: {
        exitRequestId: id,
        tenantId: sessionData.tenantId,
      },
      orderBy: [
        { department: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // Group by department
    const grouped = clearanceTasks.reduce((acc, task) => {
      if (!acc[task.department]) {
        acc[task.department] = [];
      }
      acc[task.department].push(task);
      return acc;
    }, {} as Record<string, typeof clearanceTasks>);

    return NextResponse.json({
      success: true,
      data: {
        tasks: clearanceTasks,
        grouped,
        summary: {
          total: clearanceTasks.length,
          pending: clearanceTasks.filter(t => t.status === 'PENDING').length,
          inProgress: clearanceTasks.filter(t => t.status === 'IN_PROGRESS').length,
          completed: clearanceTasks.filter(t => t.status === 'COMPLETED').length,
          notApplicable: clearanceTasks.filter(t => t.status === 'NOT_APPLICABLE').length,
        },
      },
    });
  } catch (error) {
    console.error('Get clearance tasks error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clearance tasks' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/hr/exit/[id]/clearance
 * Update a clearance task status
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    // Check permissions - HR, Admin, Manager, or Accountant can update clearance
    if (!['ADMIN', 'HR', 'MANAGER', 'ACCOUNTANT'].includes(sessionData.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = updateClearanceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { taskId, status, remarks } = validation.data;

    // Verify task belongs to this exit request
    const task = await prisma.clearanceTask.findFirst({
      where: {
        id: taskId,
        exitRequestId: id,
        tenantId: sessionData.tenantId,
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Clearance task not found' },
        { status: 404 }
      );
    }

    // Role-based department restrictions
    const roleDepartmentMap: Record<string, string[]> = {
      ADMIN: ['IT', 'FINANCE', 'HR', 'ADMIN', 'MANAGER', 'SECURITY'],
      HR: ['HR', 'IT', 'ADMIN', 'SECURITY'],
      MANAGER: ['MANAGER'],
      ACCOUNTANT: ['FINANCE'],
    };

    const allowedDepartments = roleDepartmentMap[sessionData.role] || [];
    if (!allowedDepartments.includes(task.department)) {
      return NextResponse.json(
        { success: false, error: `You can only update ${allowedDepartments.join(', ')} clearance tasks` },
        { status: 403 }
      );
    }

    const updateData: any = {
      status,
      remarks: remarks || task.remarks,
    };

    if (status === 'COMPLETED' || status === 'NOT_APPLICABLE') {
      updateData.completedBy = sessionData.userId;
      updateData.completedAt = new Date();
    } else {
      updateData.completedBy = null;
      updateData.completedAt = null;
    }

    const updatedTask = await prisma.clearanceTask.update({
      where: { id: taskId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedTask,
      message: 'Clearance task updated successfully',
    });
  } catch (error) {
    console.error('Update clearance task error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update clearance task' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hr/exit/[id]/clearance
 * Add a new clearance task
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    if (!['ADMIN', 'HR'].includes(sessionData.role)) {
      return NextResponse.json(
        { success: false, error: 'Only HR or Admin can add clearance tasks' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { department, taskName, description, assignedTo } = body;

    if (!department || !taskName) {
      return NextResponse.json(
        { success: false, error: 'Department and task name are required' },
        { status: 400 }
      );
    }

    // Verify exit request exists
    const exitRequest = await prisma.exitRequest.findFirst({
      where: {
        id,
        tenantId: sessionData.tenantId,
      },
    });

    if (!exitRequest) {
      return NextResponse.json(
        { success: false, error: 'Exit request not found' },
        { status: 404 }
      );
    }

    const task = await prisma.clearanceTask.create({
      data: {
        tenantId: sessionData.tenantId,
        exitRequestId: id,
        department,
        taskName,
        description: description || null,
        assignedTo: assignedTo || null,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      data: task,
      message: 'Clearance task added successfully',
    });
  } catch (error) {
    console.error('Add clearance task error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add clearance task' },
      { status: 500 }
    );
  }
}
