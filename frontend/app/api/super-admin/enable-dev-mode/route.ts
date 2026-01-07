import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

/**
 * POST /api/super-admin/enable-dev-mode
 * Enable development mode (requires super-admin authentication)
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
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

    // Verify super-admin role
    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: { role: true, email: true },
    });

    if (user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Super-admin role required.' },
        { status: 403 }
      );
    }

    // Get or create global settings
    let settings = await prisma.globalSettings.findFirst();

    if (!settings) {
      // Create new settings with development mode enabled
      settings = await prisma.globalSettings.create({
        data: {
          siteName: 'Zenora.ai',
          supportEmail: 'support@zenora.ai',
          maxTenantsPerDay: 10,
          requireEmailVerification: true,
          allowPublicRegistration: false,
          maintenanceMode: false,
          sessionTimeout: 3600,
          maxLoginAttempts: 5,
          isDevelopmentMode: true,
        },
      });
    } else {
      // Update existing settings to enable development mode
      settings = await prisma.globalSettings.update({
        where: { id: settings.id },
        data: { isDevelopmentMode: true },
      });
    }

    console.log(`[Super Admin] Development mode enabled by ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Development mode enabled successfully',
      isDevelopmentMode: settings.isDevelopmentMode,
      note: 'Super admin OTP will now use static code: 123456',
    });
  } catch (error) {
    console.error('Error enabling development mode:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to enable development mode' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/super-admin/enable-dev-mode
 * Check current development mode status
 */
export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.globalSettings.findFirst();

    return NextResponse.json({
      success: true,
      isDevelopmentMode: settings?.isDevelopmentMode ?? false,
    });
  } catch (error) {
    console.error('Error checking development mode:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check development mode' },
      { status: 500 }
    );
  }
}
