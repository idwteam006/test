import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/super-admin-helpers';

/**
 * GET /api/super-admin/tenants/[id]
 * Get tenant details by ID or slug (super admin only)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin(request);
    const { id } = await params;

    // Try to find by ID first, then by slug
    let tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        settings: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            lastLoginAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            users: true,
            employees: true,
            clients: true,
            projects: true,
            invoices: true,
            timeEntries: true,
          },
        },
      },
    });

    // If not found by ID, try by slug
    if (!tenant) {
      tenant = await prisma.tenant.findUnique({
        where: { slug: id },
        include: {
          settings: true,
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
              createdAt: true,
              lastLoginAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          _count: {
            select: {
              users: true,
              employees: true,
              clients: true,
              projects: true,
              invoices: true,
              timeEntries: true,
            },
          },
        },
      });
    }

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tenant,
    });
  } catch (error: any) {
    console.error('[Super Admin] Get tenant error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch tenant',
      },
      { status: error.message === 'Not authenticated' ? 401 : error.message === 'Super admin access required' ? 403 : 500 }
    );
  }
}

/**
 * PATCH /api/super-admin/tenants/[id]
 * Update tenant (super admin only)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const { name, isActive } = body;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    console.log(`[Super Admin] Updated tenant: ${tenant.name} (${tenant.id})`);

    return NextResponse.json({
      success: true,
      message: 'Tenant updated successfully',
      tenant,
    });
  } catch (error: any) {
    console.error('[Super Admin] Update tenant error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update tenant',
      },
      { status: error.message === 'Not authenticated' ? 401 : error.message === 'Super admin access required' ? 403 : 500 }
    );
  }
}

/**
 * DELETE /api/super-admin/tenants/[id]
 * Delete tenant (super admin only)
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin(request);
    const { id } = await params;

    await prisma.tenant.delete({
      where: { id },
    });

    console.log(`[Super Admin] Deleted tenant: ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Tenant deleted successfully',
    });
  } catch (error: any) {
    console.error('[Super Admin] Delete tenant error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete tenant',
      },
      { status: error.message === 'Not authenticated' ? 401 : error.message === 'Super admin access required' ? 403 : 500 }
    );
  }
}
