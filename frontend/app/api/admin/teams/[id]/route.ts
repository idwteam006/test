import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

// GET /api/admin/teams/[id] - Get team details with members
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromSession(request);

    if (!user || !['ADMIN', 'MANAGER', 'HR'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const team = await prisma.team.findUnique({
      where: { id, tenantId: user.tenantId },
      include: {
        teamLead: {
          select: {
            id: true,
            jobTitle: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        members: {
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
          orderBy: {
            joinedAt: 'desc',
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
    }

    // Transform members to match expected format
    const transformedTeam = {
      ...team,
      members: team.members.map(member => ({
        id: member.id,
        userId: member.employee.userId,
        user: {
          ...member.employee.user,
          jobTitle: member.employee.jobTitle,
        },
        role: member.role,
        joinedAt: member.joinedAt,
      })),
    };

    return NextResponse.json({ success: true, team: transformedTeam });
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch team' }, { status: 500 });
  }
}
