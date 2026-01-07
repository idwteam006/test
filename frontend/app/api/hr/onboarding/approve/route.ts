import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { sendOnboardingApprovalEmail } from '@/lib/resend-email';
import { z } from 'zod';

/**
 * POST /api/hr/onboarding/approve
 *
 * HR approves employee onboarding
 *
 * Security:
 * - Requires authenticated session
 * - Only HR/ADMIN can approve onboarding
 * - Validates invite belongs to their tenant
 *
 * Flow:
 * 1. Validate HR permissions
 * 2. Validate invite exists and is SUBMITTED
 * 3. Update invite status to APPROVED
 * 4. Activate user (set status to ACTIVE)
 * 5. Send approval email to employee
 * 6. Return success
 */

const approveSchema = z.object({
  inviteId: z.string().uuid('Invalid invite ID'),
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
    const validationResult = approveSchema.safeParse(body);

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

    const { inviteId } = validationResult.data;

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
          error: `Cannot approve onboarding with status: ${invite.status}`,
        },
        { status: 400 }
      );
    }

    // 4. Approve onboarding in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update invite status to APPROVED
      const updatedInvite = await tx.onboardingInvite.update({
        where: { id: inviteId },
        data: {
          status: 'APPROVED',
          completedAt: new Date(),
        },
      });

      // Update user status to APPROVED first, then ACTIVE
      // This maintains the status journey: ONBOARDING_COMPLETED → APPROVED → ACTIVE
      await tx.user.update({
        where: { id: invite.userId },
        data: { status: 'APPROVED' },
      });

      // Immediately activate user (in same transaction)
      const activatedUser = await tx.user.update({
        where: { id: invite.userId },
        data: {
          status: 'ACTIVE',
          emailVerified: true, // Mark email as verified upon approval
        },
      });

      return { invite: updatedInvite, user: activatedUser };
    });

    // 5. Send approval email to employee
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zenora.ai';
      const loginUrl = `${appUrl}/login`;

      await sendOnboardingApprovalEmail(
        invite.user.email,
        `${invite.user.firstName} ${invite.user.lastName}`,
        loginUrl
      );
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
      // Don't fail the request if email fails
    }

    // 6. Return success
    return NextResponse.json(
      {
        success: true,
        message: 'Onboarding approved successfully',
        data: {
          inviteId: result.invite.id,
          userId: result.user.id,
          status: result.invite.status,
          userStatus: result.user.status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Approve onboarding error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to approve onboarding',
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
