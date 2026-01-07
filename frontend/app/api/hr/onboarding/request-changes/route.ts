import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { sendChangesRequestedEmail } from '@/lib/resend-email';
import { z } from 'zod';

/**
 * POST /api/hr/onboarding/request-changes
 *
 * HR requests changes to employee onboarding
 *
 * Security:
 * - Requires authenticated session
 * - Only HR/ADMIN can request changes
 * - Validates invite belongs to their tenant
 *
 * Flow:
 * 1. Validate HR permissions
 * 2. Validate invite exists and is SUBMITTED
 * 3. Update invite status to CHANGES_REQUESTED
 * 4. Send feedback email to employee
 * 5. Return success
 */

const requestChangesSchema = z.object({
  inviteId: z.string().uuid('Invalid invite ID'),
  feedback: z.string().min(10, 'Feedback must be at least 10 characters'),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Get session and validate authentication
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
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    // Check if user has HR, MANAGER, or ADMIN role
    if (!['HR', 'MANAGER', 'ADMIN'].includes(sessionData.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // 2. Parse and validate input
    const body = await request.json();
    const validationResult = requestChangesSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: validationResult.error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { inviteId, feedback } = validationResult.data;

    // 3. Get invite and validate
    const invite = await prisma.onboardingInvite.findUnique({
      where: { id: inviteId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            tenantId: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { success: false, error: 'Invite not found' },
        { status: 404 }
      );
    }

    // Check if invite belongs to HR's tenant
    if (invite.tenantId !== sessionData.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Invite not found' },
        { status: 404 }
      );
    }

    // Check if invite is in SUBMITTED status
    if (invite.status !== 'SUBMITTED') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot request changes for onboarding with status: ${invite.status}`,
        },
        { status: 400 }
      );
    }

    // 4. Update invite and user status to CHANGES_REQUESTED
    const updatedInvite = await prisma.$transaction(async (tx) => {
      // Update invite status
      const invite = await tx.onboardingInvite.update({
        where: { id: inviteId },
        data: {
          status: 'CHANGES_REQUESTED',
        },
      });

      // Update user status
      await tx.user.update({
        where: { id: invite.userId },
        data: { status: 'CHANGES_REQUESTED' },
      });

      return invite;
    });

    // 5. Send feedback email to employee
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zenora.ai';
      const onboardingUrl = `${appUrl}/onboard?token=${invite.token}`;

      await sendChangesRequestedEmail(
        invite.user.email,
        `${invite.user.firstName} ${invite.user.lastName}`,
        feedback,
        onboardingUrl
      );
    } catch (emailError) {
      console.error('Failed to send changes requested email:', emailError);
      // Don't fail the request if email fails
    }

    // 6. Return success
    return NextResponse.json(
      {
        success: true,
        message: 'Changes requested successfully',
        data: {
          inviteId: updatedInvite.id,
          status: updatedInvite.status,
          feedback,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Request changes error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to request changes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Prevent other methods
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
