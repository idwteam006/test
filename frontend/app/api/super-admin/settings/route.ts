import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

/**
 * GET /api/super-admin/settings
 * Fetch global platform settings
 */
export async function GET(request: NextRequest) {
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
      select: { role: true },
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
      // Create default settings if none exist
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
          isDevelopmentMode: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Error fetching global settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/super-admin/settings
 * Update global platform settings
 */
export async function PATCH(request: NextRequest) {
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
      select: { role: true },
    });

    if (user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Super-admin role required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      siteName,
      supportEmail,
      maxTenantsPerDay,
      requireEmailVerification,
      allowPublicRegistration,
      maintenanceMode,
      sessionTimeout,
      maxLoginAttempts,
      isDevelopmentMode,
    } = body;

    // Get or create settings
    let settings = await prisma.globalSettings.findFirst();

    if (!settings) {
      // Create new settings
      settings = await prisma.globalSettings.create({
        data: {
          siteName: siteName || 'Zenora.ai',
          supportEmail: supportEmail || 'support@zenora.ai',
          maxTenantsPerDay: maxTenantsPerDay ?? 10,
          requireEmailVerification: requireEmailVerification ?? true,
          allowPublicRegistration: allowPublicRegistration ?? false,
          maintenanceMode: maintenanceMode ?? false,
          sessionTimeout: sessionTimeout ?? 3600,
          maxLoginAttempts: maxLoginAttempts ?? 5,
          isDevelopmentMode: isDevelopmentMode ?? false,
        },
      });
    } else {
      // Update existing settings
      const updateData: any = {};

      if (siteName !== undefined) updateData.siteName = siteName;
      if (supportEmail !== undefined) updateData.supportEmail = supportEmail;
      if (maxTenantsPerDay !== undefined) updateData.maxTenantsPerDay = maxTenantsPerDay;
      if (requireEmailVerification !== undefined) updateData.requireEmailVerification = requireEmailVerification;
      if (allowPublicRegistration !== undefined) updateData.allowPublicRegistration = allowPublicRegistration;
      if (maintenanceMode !== undefined) updateData.maintenanceMode = maintenanceMode;
      if (sessionTimeout !== undefined) updateData.sessionTimeout = sessionTimeout;
      if (maxLoginAttempts !== undefined) updateData.maxLoginAttempts = maxLoginAttempts;
      if (isDevelopmentMode !== undefined) updateData.isDevelopmentMode = isDevelopmentMode;

      settings = await prisma.globalSettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings,
    });
  } catch (error) {
    console.error('Error updating global settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
