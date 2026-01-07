import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

// POST /api/admin/teams/[id]/members - Add a member to the team
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromSession(request);

    if (!user || !['ADMIN', 'MANAGER', 'HR'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId } = await params;
    const body = await request.json();
    const { userId, role = 'MEMBER' } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    // Verify team exists and belongs to tenant
    const team = await prisma.team.findUnique({
      where: { id: teamId, tenantId: user.tenantId },
    });

    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
    }

    // Find employee by user ID
    const employee = await prisma.employee.findFirst({
      where: {
        userId: userId,
        tenantId: user.tenantId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeId: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    // Check if employee is already a member
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        employeeId: employee.id,
      },
    });

    if (existingMember) {
      return NextResponse.json({ success: false, error: 'Employee is already a member of this team' }, { status: 400 });
    }

    // Add member to team
    const member = await prisma.teamMember.create({
      data: {
        teamId,
        employeeId: employee.id,
        role,
      },
      include: {
        employee: {
          select: {
            userId: true,
            jobTitle: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                employeeId: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        userId: member.employee.userId,
        user: {
          ...member.employee.user,
          jobTitle: member.employee.jobTitle,
        },
        role: member.role,
        joinedAt: member.joinedAt,
      }
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    return NextResponse.json({ success: false, error: 'Failed to add team member' }, { status: 500 });
  }
}
