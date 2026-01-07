import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

/**
 * GET /api/employee/tasks
 * Fetch all tasks assigned to the current employee
 */
export async function GET(request: NextRequest) {
  try {
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

    // Fetch tasks assigned to this employee
    const tasks = await prisma.task.findMany({
      where: {
        tenantId,
        assigneeId: employee.id,
      },
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
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error('Fetch employee tasks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
