import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

/**
 * GET /api/employee/projects/[id]/tasks
 * Fetch tasks assigned to the current employee for a specific project
 * Includes pending and completed tasks, excludes tasks with approved timesheets
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

    // Fetch tasks for the project assigned to this employee
    // Include both pending and completed tasks
    // Only exclude tasks that have APPROVED timesheet entries (not SUBMITTED)
    const tasks = await prisma.task.findMany({
      where: {
        projectId: id,
        tenantId,
        assigneeId: employee.id, // Only tasks assigned to this employee
        status: {
          in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'], // Include completed tasks
          notIn: ['CANCELLED'], // Exclude cancelled tasks
        },
        NOT: {
          timesheetEntries: {
            some: {
              tenantId,
              userId,
              status: 'APPROVED', // Only exclude tasks with APPROVED timesheets
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error('Fetch tasks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
