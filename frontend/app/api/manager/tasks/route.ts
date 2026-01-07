import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { sendEmail, getTaskAssignedEmail } from '@/lib/resend-email';

/**
 * GET /api/manager/tasks
 * Fetch all tasks assigned by this manager
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user || !['MANAGER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Get manager's employee record to find tasks they created
    const manager = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    // Fetch tasks - for managers, get tasks where assignee reports to them
    // For admins, get all tasks in tenant
    let assigneeIds: string[] | undefined;

    if (user.role === 'MANAGER' && manager) {
      // Get employee IDs who report to this manager
      const teamMembers = await prisma.employee.findMany({
        where: {
          tenantId: user.tenantId,
          managerId: manager.id,
        },
        select: {
          id: true,
        },
      });

      assigneeIds = teamMembers.map((emp) => emp.id);
    }

    const where: any = {
      tenantId: user.tenantId,
    };

    if (assigneeIds && assigneeIds.length > 0) {
      where.assigneeId = {
        in: assigneeIds,
      };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            name: true,
            projectCode: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get assignee details for each task
    const formattedTasks = await Promise.all(
      tasks.map(async (task) => {
        let assignee = null;

        if (task.assigneeId) {
          const employee = await prisma.employee.findUnique({
            where: { id: task.assigneeId },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          });

          if (employee) {
            assignee = {
              id: employee.user.id,
              firstName: employee.user.firstName,
              lastName: employee.user.lastName,
              email: employee.user.email,
            };
          }
        }

        return {
          id: task.id,
          name: task.name,
          description: task.description,
          status: task.status,
          dueDate: task.dueDate,
          createdAt: task.createdAt,
          assignee,
          project: task.project,
        };
      })
    );

    return NextResponse.json({
      success: true,
      tasks: formattedTasks,
      total: formattedTasks.length,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/manager/tasks
 * Create and assign a new task
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData?.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get manager user
    const manager = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        id: true,
        tenantId: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!manager) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only managers and admins can create tasks
    if (!['MANAGER', 'ADMIN'].includes(manager.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Manager access required.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, description, assignedToId, projectId, dueDate } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Task name is required' },
        { status: 400 }
      );
    }

    if (!assignedToId) {
      return NextResponse.json(
        { success: false, error: 'Assigned employee is required' },
        { status: 400 }
      );
    }

    if (!dueDate) {
      return NextResponse.json(
        { success: false, error: 'Due date is required' },
        { status: 400 }
      );
    }

    // assignedToId is the User ID from frontend, need to get Employee ID
    const assignedUser = await prisma.user.findFirst({
      where: {
        id: assignedToId,
        tenantId: manager.tenantId,
      },
      include: {
        employee: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!assignedUser || !assignedUser.employee) {
      return NextResponse.json(
        { success: false, error: 'Assigned user not found or does not have an employee record' },
        { status: 404 }
      );
    }

    const assigneeEmployeeId = assignedUser.employee.id;

    // Verify project if provided
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          tenantId: manager.tenantId,
        },
      });

      if (!project) {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        );
      }
    }

    // Get assignee details for email
    const assignee = await prisma.employee.findUnique({
      where: { id: assigneeEmployeeId },
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

    if (!assignee) {
      return NextResponse.json(
        { success: false, error: 'Assignee employee record not found' },
        { status: 404 }
      );
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        tenantId: manager.tenantId,
        projectId,
        name: name.trim(),
        description: description?.trim() || null,
        assigneeId: assigneeEmployeeId,
        status: 'TODO',
        dueDate: new Date(dueDate),
      },
      include: {
        project: {
          select: {
            name: true,
            projectCode: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: manager.tenantId,
        userId: manager.id,
        action: 'task.created',
        entityType: 'task',
        entityId: task.id,
        changes: {
          taskName: task.name,
          assigneeId: assigneeEmployeeId,
          assignedToUserId: assignedToId,
          dueDate: task.dueDate,
        },
        eventType: 'task',
        success: true,
      },
    });

    // Send email notification to assignee
    try {
      const emailTemplate = getTaskAssignedEmail({
        employeeName: `${assignee.user.firstName} ${assignee.user.lastName}`,
        taskName: task.name,
        description: task.description || undefined,
        dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined,
        projectName: task.project?.name,
        assignedBy: `${manager.firstName} ${manager.lastName}`,
      });

      await sendEmail({
        to: assignee.user.email,
        ...emailTemplate,
      });

      console.log(`[Task Assigned] Email sent to ${assignee.user.email}`);
    } catch (emailError) {
      console.error('[Task Assigned] Failed to send email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Task assigned successfully',
      task: {
        id: task.id,
        name: task.name,
        description: task.description,
        status: task.status,
        dueDate: task.dueDate,
        assigneeId: task.assigneeId,
        project: task.project
          ? {
              name: task.project.name,
              code: task.project.projectCode,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create task',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
