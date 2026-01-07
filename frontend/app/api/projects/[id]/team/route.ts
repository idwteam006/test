import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/projects/[id]/team
 *
 * Add a team member to a project
 *
 * Security:
 * - Requires ADMIN or MANAGER role
 * - Can only add employees from same tenant
 */
export async function POST(
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

    // Only ADMIN and MANAGER can add team members
    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied - Admin or Manager only' },
        { status: 403 }
      );
    }

    const projectId = id;

    // Find the project
    const project = await prisma.project.findFirst({
      where: {
        OR: [{ projectCode: projectId }, { id: projectId }],
        tenantId: sessionData.tenantId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { employeeId, role, billableRate } = body;

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Verify employee exists and belongs to same tenant
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        tenantId: sessionData.tenantId,
      },
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

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check if already assigned
    const existingAssignment = await prisma.projectAssignment.findUnique({
      where: {
        projectId_employeeId: {
          projectId: project.id,
          employeeId: employeeId,
        },
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { success: false, error: 'Employee is already assigned to this project' },
        { status: 400 }
      );
    }

    // Create assignment
    const assignment = await prisma.projectAssignment.create({
      data: {
        tenantId: sessionData.tenantId,
        projectId: project.id,
        employeeId: employeeId,
        role: role || 'Team Member',
        billableRate: billableRate || 0,
      },
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
          },
        },
      },
    });

    console.log(`Team member added to project: ${employee.user.email} -> ${project.projectCode}`);

    return NextResponse.json({
      success: true,
      message: 'Team member added successfully',
      assignment,
    });
  } catch (error) {
    console.error('Add team member error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add team member' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/team
 *
 * Remove a team member from a project
 *
 * Security:
 * - Requires ADMIN or MANAGER role
 * - Can only remove from projects in same tenant
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

    // Only ADMIN and MANAGER can remove team members
    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied - Admin or Manager only' },
        { status: 403 }
      );
    }

    const projectId = id;

    // Find the project
    const project = await prisma.project.findFirst({
      where: {
        OR: [{ projectCode: projectId }, { id: projectId }],
        tenantId: sessionData.tenantId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get employeeId from query params
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Find the assignment
    const assignment = await prisma.projectAssignment.findUnique({
      where: {
        projectId_employeeId: {
          projectId: project.id,
          employeeId: employeeId,
        },
      },
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
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Check if employee has time entries on this project
    const timeEntryCount = await prisma.timeEntry.count({
      where: {
        projectId: project.id,
        employeeId: employeeId,
      },
    });

    if (timeEntryCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot remove team member with ${timeEntryCount} time entries. Archive the member instead.`,
        },
        { status: 400 }
      );
    }

    // Delete assignment
    await prisma.projectAssignment.delete({
      where: {
        projectId_employeeId: {
          projectId: project.id,
          employeeId: employeeId,
        },
      },
    });

    console.log(`Team member removed from project: ${assignment.employee.user.email} <- ${project.projectCode}`);

    return NextResponse.json({
      success: true,
      message: 'Team member removed successfully',
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
}
