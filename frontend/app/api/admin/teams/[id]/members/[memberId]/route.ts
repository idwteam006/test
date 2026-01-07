import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

// DELETE /api/admin/teams/[id]/members/[memberId] - Remove a member from the team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const user = await getUserFromSession(request);

    if (!user || !['ADMIN', 'MANAGER', 'HR'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId, memberId } = await params;

    // Verify team exists and belongs to tenant
    const team = await prisma.team.findUnique({
      where: { id: teamId, tenantId: user.tenantId },
    });

    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
    }

    // Verify member exists
    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: {
        team: true,
      },
    });

    if (!member || member.teamId !== teamId) {
      return NextResponse.json({ success: false, error: 'Team member not found' }, { status: 404 });
    }

    // Verify team belongs to same tenant
    if (member.team.tenantId !== user.tenantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Remove member from team
    await prisma.teamMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove team member' }, { status: 500 });
  }
}
