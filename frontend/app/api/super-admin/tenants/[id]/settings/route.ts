import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

/**
 * GET /api/super-admin/tenants/[id]/settings
 * Fetch tenant-specific settings for super admin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;

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

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get tenant settings
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        id: true,
        tenantId: true,
        companyName: true,
        allowFutureExpenses: true,
        allowFutureTimesheets: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      tenant,
      settings,
    });
  } catch (error) {
    console.error('Error fetching tenant settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenant settings' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/super-admin/tenants/[id]/settings
 * Update tenant-specific settings (super admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;

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

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { allowFutureExpenses, allowFutureTimesheets } = body;

    // Check if settings exist
    const existingSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    if (!existingSettings) {
      return NextResponse.json(
        { success: false, error: 'Tenant settings not found. Please configure tenant settings first.' },
        { status: 404 }
      );
    }

    // Update settings
    const updateData: any = {};
    if (allowFutureExpenses !== undefined) updateData.allowFutureExpenses = allowFutureExpenses;
    if (allowFutureTimesheets !== undefined) updateData.allowFutureTimesheets = allowFutureTimesheets;

    const updatedSettings = await prisma.tenantSettings.update({
      where: { tenantId },
      data: updateData,
      select: {
        id: true,
        tenantId: true,
        companyName: true,
        allowFutureExpenses: true,
        allowFutureTimesheets: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Tenant settings updated successfully',
      settings: updatedSettings,
    });
  } catch (error) {
    console.error('Error updating tenant settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update tenant settings' },
      { status: 500 }
    );
  }
}