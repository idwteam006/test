/**
 * GET /api/manager/team/[id]
 * Get individual team member details
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params;

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
      select: { id: true, tenantId: true, role: true, departmentId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { tenantId, role, departmentId } = user;

    // Only managers and admins can access
    if (role !== 'MANAGER' && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Manager access required.' },
        { status: 403 }
      );
    }

    // Fetch team member details
    const member = await prisma.user.findUnique({
      where: {
        id: memberId,
        tenantId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        employeeId: true,
        role: true,
        status: true,
        departmentId: true,
        avatarUrl: true,
        lastLoginAt: true,
        department: {
          select: {
            name: true,
          },
        },
        employee: {
          select: {
            jobTitle: true,
            startDate: true,
            managerId: true,
            employmentType: true,
          },
        },
        employeeProfile: {
          select: {
            personalPhone: true,
            dateOfBirth: true,
            gender: true,
            currentAddress: true,
            linkedinUrl: true,
            githubUrl: true,
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Team member not found' },
        { status: 404 }
      );
    }

    // If manager, verify they can access this member (same department)
    if (role === 'MANAGER' && departmentId !== member.departmentId) {
      return NextResponse.json(
        { success: false, error: 'You can only view members from your department' },
        { status: 403 }
      );
    }

    // Get performance stats
    // Tasks completed (placeholder - needs Task model integration)
    const tasksCompleted = 0;
    const tasksInProgress = 0;

    // Timesheet submission rate
    const timesheetEntries = await prisma.timesheetEntry.findMany({
      where: {
        userId: memberId,
        status: 'SUBMITTED',
        workDate: {
          gte: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
        },
      },
    });

    const expectedEntries = 20; // Approximately 20 working days per month
    const timesheetSubmissionRate = Math.min(
      100,
      Math.round((timesheetEntries.length / expectedEntries) * 100)
    );

    // Average completion time (placeholder)
    const avgCompletionTime = 0;

    const stats = {
      tasksCompleted,
      tasksInProgress,
      avgCompletionTime,
      timesheetSubmissionRate,
      lastLogin: member.lastLoginAt?.toISOString() || '',
    };

    return NextResponse.json({
      success: true,
      member,
      stats,
    });
  } catch (error) {
    console.error('[GET /api/manager/team/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch member details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/manager/team/[id]
 * Update team member details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params;

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
      select: { id: true, tenantId: true, role: true, departmentId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { tenantId, role, departmentId } = user;

    // Only managers and admins can update
    if (role !== 'MANAGER' && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Manager access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, departmentId: newDeptId, role: newRole } = body;

    // Verify member exists and belongs to tenant
    const member = await prisma.user.findUnique({
      where: { id: memberId, tenantId },
      select: { departmentId: true },
    });

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Team member not found' },
        { status: 404 }
      );
    }

    // If manager, verify they can update this member
    if (role === 'MANAGER' && departmentId !== member.departmentId) {
      return NextResponse.json(
        { success: false, error: 'You can only update members from your department' },
        { status: 403 }
      );
    }

    // Update user
    const updatedMember = await prisma.user.update({
      where: { id: memberId },
      data: {
        ...(status && { status }),
        ...(newDeptId && { departmentId: newDeptId }),
        ...(newRole && role === 'ADMIN' && { role: newRole }), // Only admins can change roles
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Team member updated successfully',
      member: updatedMember,
    });
  } catch (error) {
    console.error('[PATCH /api/manager/team/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update member',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
