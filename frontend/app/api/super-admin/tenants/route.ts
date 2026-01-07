import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/super-admin-helpers';

/**
 * GET /api/super-admin/tenants
 * List all tenants (super admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            users: true,
            employees: true,
            clients: true,
            projects: true,
            invoices: true,
          },
        },
        settings: {
          select: {
            companyName: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
            maxEmployees: true,
            maxProjects: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get admin users for each tenant
    const tenantsWithAdmins = await Promise.all(
      tenants.map(async (tenant) => {
        const adminUser = await prisma.user.findFirst({
          where: {
            tenantId: tenant.id,
            role: 'ADMIN',
          },
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            lastLoginAt: true,
          },
        });

        return {
          ...tenant,
          adminUser,
        };
      })
    );

    return NextResponse.json({
      success: true,
      tenants: tenantsWithAdmins,
    });
  } catch (error: any) {
    console.error('[Super Admin] Get tenants error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch tenants',
      },
      { status: error.message === 'Not authenticated' ? 401 : error.message === 'Super admin access required' ? 403 : 500 }
    );
  }
}

/**
 * POST /api/super-admin/tenants
 * Create a new tenant (super admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const body = await request.json();
    const { organizationName, adminName, adminEmail } = body;

    if (!organizationName || !adminName || !adminEmail) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Create slug from organization name
    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if slug exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    const finalSlug = existingTenant ? `${slug}-${Date.now()}` : slug;

    // Create tenant and admin user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: organizationName,
          slug: finalSlug,
          isActive: true,
        },
      });

      // Create tenant settings
      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          companyName: organizationName,
          workingHours: { start: '09:00', end: '17:00', days: [1, 2, 3, 4, 5] },
          leavePolicies: { annualLeave: 20, sickLeave: 10 },
          subscriptionPlan: 'FREE',
          subscriptionStatus: 'TRIAL',
        },
      });

      // Create default departments
      const defaultDepartments = [
        'Engineering',
        'Human Resources',
        'Finance',
        'Marketing',
        'Sales',
        'Operations',
        'Customer Support',
        'Product Management'
      ];

      await tx.department.createMany({
        data: defaultDepartments.map(name => ({
          name,
          tenantId: tenant.id,
        })),
      });

      // Create admin user without password (OTP login only)
      const user = await tx.user.create({
        data: {
          email: adminEmail,
          password: null, // No password - admin will use OTP login
          name: adminName,
          firstName: adminName.split(' ')[0] || adminName,
          lastName: adminName.split(' ').slice(1).join(' ') || '',
          role: 'ADMIN',
          tenantId: tenant.id,
          isActive: true,
          emailVerified: true, // Pre-verified since created by super admin
        },
      });

      return { tenant, user };
    });

    console.log(`[Super Admin] Created tenant: ${result.tenant.name} (${result.tenant.id})`);
    console.log(`[Super Admin] Created 8 default departments for tenant: ${result.tenant.name}`);

    return NextResponse.json({
      success: true,
      message: 'Tenant created successfully',
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        adminUser: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
        },
      },
    });
  } catch (error: any) {
    console.error('[Super Admin] Create tenant error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create tenant',
      },
      { status: error.message === 'Not authenticated' ? 401 : error.message === 'Super admin access required' ? 403 : 500 }
    );
  }
}
