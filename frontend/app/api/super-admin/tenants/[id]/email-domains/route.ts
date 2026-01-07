import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/super-admin-helpers';
import { z } from 'zod';

const emailDomainSchema = z.object({
  allowedEmailDomains: z.array(z.string()).min(1, 'At least one domain is required'),
});

/**
 * GET /api/super-admin/tenants/[id]/email-domains
 * Get tenant email domains (super admin only)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin(request);
    const { id } = await params;

    // Get tenant settings
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: id },
      select: {
        allowedEmailDomains: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!settings) {
      return NextResponse.json(
        { success: false, error: 'Tenant settings not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        tenantId: settings.tenant.id,
        tenantName: settings.tenant.name,
        tenantSlug: settings.tenant.slug,
        allowedEmailDomains: (settings.allowedEmailDomains as string[]) || ['*'],
      },
    });
  } catch (error: any) {
    console.error('[Super Admin] Get email domains error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch email domains',
      },
      { status: error.message === 'Not authenticated' ? 401 : error.message === 'Super admin access required' ? 403 : 500 }
    );
  }
}

/**
 * PATCH /api/super-admin/tenants/[id]/email-domains
 * Update tenant email domains (super admin only)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin(request);
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validation = emailDomainSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { allowedEmailDomains } = validation.data;

    // Validate domain format
    const invalidDomains = allowedEmailDomains.filter((domain) => {
      if (domain === '*') return false;
      // Basic domain validation
      return !/^[a-zA-Z0-9][a-zA-Z0-9-_.]*\.[a-zA-Z]{2,}$/.test(domain);
    });

    if (invalidDomains.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid domain format',
          details: `Invalid domains: ${invalidDomains.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Update tenant settings
    const updatedSettings = await prisma.tenantSettings.update({
      where: { tenantId: id },
      data: {
        allowedEmailDomains: allowedEmailDomains,
      },
      select: {
        allowedEmailDomains: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    console.log(`[Super Admin] Updated email domains for tenant: ${updatedSettings.tenant.name} (${id})`);

    return NextResponse.json({
      success: true,
      message: 'Email domains updated successfully',
      data: {
        tenantId: updatedSettings.tenant.id,
        tenantName: updatedSettings.tenant.name,
        tenantSlug: updatedSettings.tenant.slug,
        allowedEmailDomains: updatedSettings.allowedEmailDomains as string[],
      },
    });
  } catch (error: any) {
    console.error('[Super Admin] Update email domains error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update email domains',
      },
      { status: error.message === 'Not authenticated' ? 401 : error.message === 'Super admin access required' ? 403 : 500 }
    );
  }
}
