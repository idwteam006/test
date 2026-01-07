import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

/**
 * GET /api/employee/onboarding-status
 *
 * Get the current user's onboarding status
 * Shows progress through the onboarding journey
 */
export async function GET(request: NextRequest) {
  try {
    // Get session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
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

    // Get user with onboarding invite status
    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        id: true,
        status: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Find onboarding invite for this user
    const invite = await prisma.onboardingInvite.findFirst({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        status: true,
        token: true,
        completedAt: true,
      },
    });

    // Calculate completion steps based on status
    const getCompletionSteps = (status: string) => {
      const stepMap: { [key: string]: number } = {
        'INVITED': 0,
        'PENDING': 0,
        'IN_PROGRESS': 2,
        'SUBMITTED': 4,
        'APPROVED': 4,
        'REJECTED': 2,
      };
      return stepMap[status] || 0;
    };

    const totalSteps = 4; // Total onboarding steps
    const completedSteps = invite ? getCompletionSteps(invite.status) : 0;

    // Map invite status to user-friendly status
    const mapStatus = (inviteStatus: string | null, userStatus: string) => {
      if (!inviteStatus) {
        return userStatus === 'ACTIVE' ? 'ACTIVE' : 'INVITED';
      }

      const statusMap: { [key: string]: string } = {
        'PENDING': 'INVITED',
        'IN_PROGRESS': 'PENDING_ONBOARDING',
        'SUBMITTED': 'ONBOARDING_COMPLETED',
        'APPROVED': 'APPROVED',
        'REJECTED': 'CHANGES_REQUESTED',
      };

      return statusMap[inviteStatus] || 'INVITED';
    };

    const status = mapStatus(invite?.status || null, user.status);

    return NextResponse.json({
      success: true,
      data: {
        status: status,
        completedSteps: completedSteps,
        totalSteps: totalSteps,
        inviteToken: invite?.token,
        completedAt: invite?.completedAt,
      },
    });

  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
