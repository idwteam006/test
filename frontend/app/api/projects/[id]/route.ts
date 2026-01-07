import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { notifyProjectCancelled } from '@/lib/email-notifications';

/**
 * GET /api/projects/[id]
 *
 * Get single project details by ID
 *
 * Security:
 * - Requires authentication
 * - Returns only project from same tenant
 * - Returns full project details with relations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Get session cookie
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    // Get session from Redis
    const sessionData = await sessions.get(sessionId);

    if (!sessionData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session expired. Please login again.',
        },
        { status: 401 }
      );
    }

    const projectId = id;

    // Fetch project with full details (by projectCode or id)
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { projectCode: projectId },
          { id: projectId },
        ],
        tenantId: sessionData.tenantId,
      },
      include: {
        client: {
          select: {
            id: true,
            clientId: true,
            companyName: true,
            contactName: true,
            contactEmail: true,
          },
        },
        assignments: {
          include: {
            employee: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
                // Include subordinates (team reporting to this employee)
                subordinates: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        avatarUrl: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        tasks: {
          select: {
            id: true,
            name: true,
            status: true,
            dueDate: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        timeEntries: {
          select: {
            id: true,
            hours: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        _count: {
          select: {
            tasks: true,
            timeEntries: true,
            assignments: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found or does not belong to your organization',
        },
        { status: 404 }
      );
    }

    console.log(`Project details loaded: ${project.id}`);

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('Get project details error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch project details',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]
 *
 * Update project details by ID or projectCode
 *
 * Security:
 * - Requires authentication
 * - Can only update projects from same tenant
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Get session cookie
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    // Get session from Redis
    const sessionData = await sessions.get(sessionId);

    if (!sessionData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session expired. Please login again.',
        },
        { status: 401 }
      );
    }

    const projectId = id;

    // Parse request body
    const body = await request.json();

    // Find the project first
    const existingProject = await prisma.project.findFirst({
      where: {
        OR: [
          { projectCode: projectId },
          { id: projectId },
        ],
        tenantId: sessionData.tenantId,
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found or does not belong to your organization',
        },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.budgetHours !== undefined) updateData.budgetHours = body.budgetHours;
    if (body.budgetCost !== undefined) updateData.budgetCost = body.budgetCost;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.status !== undefined) updateData.status = body.status;

    // Check if status is being changed to CANCELLED
    const isCancelling = body.status === 'CANCELLED' && existingProject.status !== 'CANCELLED';

    // Update project
    const project = await prisma.project.update({
      where: {
        id: existingProject.id,
      },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            clientId: true,
            companyName: true,
          },
        },
        assignments: {
          include: {
            employee: {
              include: {
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    console.log(`Project updated: ${project.id}`);

    // Notify team members if project is cancelled
    if (isCancelling && project.assignments.length > 0) {
      const teamEmails = project.assignments
        .map((a) => a.employee?.user?.email)
        .filter((email): email is string => !!email);

      if (teamEmails.length > 0) {
        // Get user who cancelled the project
        const cancelledByUser = await prisma.user.findUnique({
          where: { id: sessionData.userId },
          select: { firstName: true, lastName: true },
        });
        const cancelledBy = cancelledByUser
          ? `${cancelledByUser.firstName} ${cancelledByUser.lastName}`
          : 'An administrator';

        notifyProjectCancelled({
          teamEmails,
          projectName: project.name,
          cancelledBy,
        }).catch((err) => {
          console.error('Failed to send project cancellation notification:', err);
        });
      }
    }

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update project',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 *
 * Delete a project (Admin/Manager only)
 *
 * Security:
 * - Requires ADMIN or MANAGER role
 * - Prevents deletion if project has timesheets or invoices
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Get session cookie
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get session from Redis
    const sessionData = await sessions.get(sessionId);

    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session expired. Please login again.' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only ADMIN and MANAGER can delete projects
    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied - Admin or Manager only' },
        { status: 403 }
      );
    }

    const projectId = id;

    // Find project with counts
    const existingProject = await prisma.project.findFirst({
      where: {
        OR: [
          { projectCode: projectId },
          { id: projectId },
        ],
        tenantId: sessionData.tenantId,
      },
      include: {
        _count: {
          select: {
            timeEntries: true,
          },
        },
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if project has time entries
    if (existingProject._count.timeEntries > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete project with ${existingProject._count.timeEntries} time entries. Change status to COMPLETED or CANCELLED instead.` },
        { status: 400 }
      );
    }

    // Delete project
    await prisma.project.delete({
      where: { id: existingProject.id },
    });

    console.log(`Project deleted: ${existingProject.id}`);

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
