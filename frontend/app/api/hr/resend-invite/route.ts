import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { sendOnboardingInvite } from '@/lib/resend-email';
import crypto from 'crypto';
import { z } from 'zod';

/**
 * POST /api/hr/resend-invite
 *
 * Resend invitation email with new token (for expired/lost invites)
 */

const resendSchema = z.object({
  inviteId: z.string().uuid('Invalid invite ID'),
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
    const { inviteId } = resendSchema.parse(body);

    // Get invite
    const invite = await prisma.onboardingInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.tenantId !== sessionData.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Invite not found' },
        { status: 404 }
      );
    }

    // Can't resend if already approved
    if (invite.status === 'APPROVED') {
      return NextResponse.json(
        { success: false, error: 'Cannot resend invite for approved onboarding' },
        { status: 400 }
      );
    }

    // Generate new token and extend expiry
    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    // Update invite
    const updatedInvite = await prisma.onboardingInvite.update({
      where: { id: inviteId },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
        status: invite.status === 'SUBMITTED' ? invite.status : 'PENDING', // Keep SUBMITTED status
      },
    });

    // Send new invite email
    await sendOnboardingInvite({
      to: invite.email,
      firstName: invite.firstName,
      token: newToken,
      invitedBy: sessionData.email,
      expiresAt: newExpiresAt,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Invitation resent successfully',
        data: {
          inviteId: updatedInvite.id,
          expiresAt: newExpiresAt,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Resend invite error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to resend invitation',
      },
      { status: 500 }
    );
  }
}
