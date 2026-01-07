import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { z } from 'zod';

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  hoursWorked: z.number().min(0.1).max(24),
  workType: z.enum(['REGULAR', 'OVERTIME', 'HOLIDAY', 'WEEKEND', 'NIGHT_SHIFT']).optional(),
  activityType: z.string().optional(),
  isBillable: z.boolean().default(true),
  billingRate: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/employee/timesheets/templates
 * Fetch user's timesheet templates
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData?.userId) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Fetch user's templates
    const templates = await prisma.timesheetTemplate.findMany({
      where: {
        tenantId: user.tenantId,
        userId: user.id,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Get templates error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch templates' }, { status: 500 });
  }
}

/**
 * POST /api/employee/timesheets/templates
 * Create a new timesheet template
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData?.userId) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate request body
    const validation = templateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const data = validation.data;

    // Verify project/task belong to user's tenant if provided
    if (data.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: data.projectId,
          tenantId: user.tenantId,
        },
      });

      if (!project) {
        return NextResponse.json({
          success: false,
          error: 'Project not found or does not belong to your organization',
        }, { status: 404 });
      }
    }

    if (data.taskId) {
      const task = await prisma.task.findFirst({
        where: {
          id: data.taskId,
        },
      });

      if (!task) {
        return NextResponse.json({
          success: false,
          error: 'Task not found',
        }, { status: 404 });
      }
    }

    // Create template
    const template = await prisma.timesheetTemplate.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        name: data.name,
        description: data.description,
        projectId: data.projectId,
        taskId: data.taskId,
        hoursWorked: data.hoursWorked,
        workType: data.workType || 'REGULAR',
        activityType: data.activityType,
        isBillable: data.isBillable,
        billingRate: data.billingRate,
        tags: data.tags || [],
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
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
      message: 'Template created successfully',
      template,
    });
  } catch (error) {
    console.error('Save template error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save template' }, { status: 500 });
  }
}
