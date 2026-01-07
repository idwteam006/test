import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { z } from 'zod';

/**
 * POST /api/hr/cancel-invite
 *
 * Cancel invitation (before employee completes onboarding)
 * Deletes invite and user record
 */

const cancelSchema = z.object({
  inviteId: z.string().uuid('Invalid invite ID'),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
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
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    if (!['ADMIN', 'MANAGER'].includes(sessionData.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { inviteId, reason } = cancelSchema.parse(body);

    // Get invite
    const invite = await prisma.onboardingInvite.findUnique({
      where: { id: inviteId },
      include: { user: true },
    });

    if (!invite || invite.tenantId !== sessionData.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Invite not found' },
        { status: 404 }
      );
    }

    // Can't cancel if already approved or active
    if (invite.status === 'APPROVED' || invite.user.status === 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel approved/active employee' },
        { status: 400 }
      );
    }

    // Delete in transaction (cascade will delete invite)
    await prisma.$transaction(async (tx) => {
      // Delete employee profile if exists
      await tx.employeeProfile.deleteMany({
        where: { userId: invite.userId },
      });

      // Delete invite
      await tx.onboardingInvite.delete({
        where: { id: inviteId },
      });

      // Delete user
      await tx.user.delete({
        where: { id: invite.userId },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Invitation cancelled successfully',
        data: {
          email: invite.email,
          reason,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Cancel invite error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cancel invitation',
      },
      { status: 500 }
    );
  }
}
