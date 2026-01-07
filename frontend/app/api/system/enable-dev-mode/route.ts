import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/system/enable-dev-mode
 *
 * TEMPORARY ENDPOINT - Enable development mode without authentication
 * This is needed when email service is down and super-admin cannot login.
 *
 * Requires a secret key for security.
 * DELETE THIS ENDPOINT AFTER USE!
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secretKey } = body;

    // Simple security - require a secret key
    // This prevents random people from toggling dev mode
    if (secretKey !== 'zenora-emergency-2024') {
      return NextResponse.json(
        { success: false, error: 'Invalid secret key' },
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
      console.log('[System] Created GlobalSettings with development mode ENABLED');
    } else {
      // Update existing settings to enable development mode
      settings = await prisma.globalSettings.update({
        where: { id: settings.id },
        data: { isDevelopmentMode: true },
      });
      console.log('[System] Updated GlobalSettings - development mode ENABLED');
    }

    return NextResponse.json({
      success: true,
      message: 'Development mode enabled successfully',
      isDevelopmentMode: settings.isDevelopmentMode,
      note: 'OTP code is now: 123456 for all logins. DELETE THIS ENDPOINT AFTER USE!',
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
 * GET /api/system/enable-dev-mode
 * Check current development mode status (no auth required)
 */
export async function GET() {
  try {
    const settings = await prisma.globalSettings.findFirst({
      select: { isDevelopmentMode: true }
    });

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
