import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';

/**
 * POST /api/admin/fix-email-domains
 *
 * Temporary endpoint to fix email domain restrictions
 * Sets allowedEmailDomains to ['*'] to allow all domains
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin session
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

    if (sessionData.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get current settings
    const currentSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId: sessionData.tenantId },
      select: {
        id: true,
        allowedEmailDomains: true,
      },
    });

    if (!currentSettings) {
      return NextResponse.json(
        { success: false, error: 'Tenant settings not found' },
        { status: 404 }
      );
    }

    // Update to allow all domains
    const updated = await prisma.tenantSettings.update({
      where: { id: currentSettings.id },
      data: {
        allowedEmailDomains: ['*'], // Allow all domains
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Email domain restrictions removed',
      data: {
        before: currentSettings.allowedEmailDomains,
        after: updated.allowedEmailDomains,
      },
    });

  } catch (error) {
    console.error('Error fixing email domains:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update email domain settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/fix-email-domains
 *
 * Check current email domain settings
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin session
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

    // Get current settings
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: sessionData.tenantId },
      select: {
        allowedEmailDomains: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        allowedDomains: settings?.allowedEmailDomains || null,
        isRestricted: settings?.allowedEmailDomains &&
                      Array.isArray(settings.allowedEmailDomains) &&
                      !settings.allowedEmailDomains.includes('*'),
      },
    });

  } catch (error) {
    console.error('Error checking email domains:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check email domain settings',
      },
      { status: 500 }
    );
  }
}
