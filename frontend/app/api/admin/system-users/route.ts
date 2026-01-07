import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { sanitizeEmail, sanitizeName, isEmailDomainAllowed } from '@/lib/security';
import { sendWelcomeEmail } from '@/lib/resend-email';
import { Role } from '@prisma/client';
import { invalidateEmployeeRelatedCaches } from '@/lib/cache';
import { notifyAdminNewSystemUser } from '@/lib/email-notifications';
import { generateEmployeeNumber, ensureManagerHasEmployeeRecord } from '@/lib/employee-helpers';

// Simplified validation schema for quick user creation
const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE', 'HR', 'ACCOUNTANT']).default('EMPLOYEE'),
  jobTitle: z.string().max(200).optional(),
  departmentId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(), // User ID of the manager
});

/**
 * POST /api/admin/system-users
 *
 * Simplified endpoint to create a new system user (without full employee onboarding)
 * Useful for quickly adding admin/manager/HR users
 *
 * Security:
 * - Admin role required
 * - Email domain validation against tenant whitelist
 * - Audit logging
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify admin session
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

    // Check if user is admin
    if (sessionData.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validation = CreateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input data',
          details: validation.error.format()
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    const email = sanitizeEmail(data.email);
    const firstName = sanitizeName(data.firstName);
    const lastName = sanitizeName(data.lastName);

    // 3. Validate email domain against tenant whitelist
    const isDomainAllowed = await isEmailDomainAllowed(email, sessionData.tenantId);

    if (!isDomainAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email domain is not allowed for this organization',
          details: 'Please use an email address with an approved domain for your organization.'
        },
        { status: 403 }
      );
    }

    // 4. Check if email already exists (in any form - system user or invited employee)
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        onboardingInvite: {
          select: {
            status: true,
            expiresAt: true,
          }
        }
      }
    });

    if (existingUser) {
      // Provide context about where the user exists
      const userContext = existingUser.onboardingInvite
        ? `This email is already associated with an onboarding invitation (status: ${existingUser.onboardingInvite.status})`
        : `This email is already registered as a ${existingUser.role} user`;

      return NextResponse.json(
        {
          success: false,
          error: 'Email already exists',
          details: userContext,
        },
        { status: 409 }
      );
    }

    // 5. Verify department if provided
    if (data.departmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: data.departmentId,
          tenantId: sessionData.tenantId,
        },
      });

      if (!department) {
        return NextResponse.json(
          {
            success: false,
            error: 'Department not found or does not belong to your organization'
          },
          { status: 404 }
        );
      }
    }

    // 6. Create user and employee in a transaction for data consistency
    // Increase timeout for slow connections (default 5000ms → 15000ms)
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          name: `${firstName} ${lastName}`,
          firstName,
          lastName,
          role: data.role as Role,
          status: 'ACTIVE',
          tenantId: sessionData.tenantId,
          departmentId: data.departmentId || null,
          emailVerified: false,
          password: '', // No password needed for passwordless auth
        },
        include: {
          department: true,
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Create employee record if jobTitle AND departmentId are provided
      let employee = null;
      if (data.jobTitle && data.departmentId) {
        // Generate unique employee number (atomic within transaction)
        const employeeNumber = await generateEmployeeNumber(tx, sessionData.tenantId);

        // Ensure manager has employee record if manager is assigned
        let managerEmployeeId: string | null = null;
        if (data.managerId) {
          managerEmployeeId = await ensureManagerHasEmployeeRecord(
            tx,
            data.managerId,
            sessionData.tenantId,
            data.departmentId
          );
        }

        // Build employee data
        const employeeData: any = {
          user: { connect: { id: user.id } },
          tenant: { connect: { id: sessionData.tenantId } },
          department: { connect: { id: data.departmentId } },
          employeeNumber,
          jobTitle: data.jobTitle,
          startDate: new Date(),
          employmentType: 'FULL_TIME',
          status: 'ACTIVE',
          emergencyContacts: [],
        };

        // Add manager connection if we have a manager
        if (managerEmployeeId) {
          employeeData.manager = { connect: { id: managerEmployeeId } };
        }

        // Create employee
        employee = await tx.employee.create({
          data: employeeData,
        });

        // Link employee to user
        await tx.user.update({
          where: { id: user.id },
          data: { employeeId: employee.id },
        });
      }

      return { user, employee };
    }, {
      timeout: 15000, // 15 seconds for slow database connections
    });

    const user = result.user;

    // 8. Send welcome email (non-blocking - fire and forget)
    sendWelcomeEmail(email, firstName, user.tenant.name).catch((err) => {
      console.error('[System User] Failed to send welcome email:', err);
    });

    // 8b. Send email notification to all admins (non-blocking)
    (async () => {
      try {
        const admins = await prisma.user.findMany({
          where: {
            tenantId: sessionData.tenantId,
            role: 'ADMIN',
            status: 'ACTIVE',
          },
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        });

        // Get creator information
        const creator = await prisma.user.findUnique({
          where: { id: sessionData.userId },
          select: {
            firstName: true,
            lastName: true,
          },
        });

        const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : sessionData.email;

        for (const admin of admins) {
          notifyAdminNewSystemUser({
            adminEmail: admin.email,
            adminName: `${admin.firstName} ${admin.lastName}`,
            newUserName: `${firstName} ${lastName}`,
            newUserEmail: email,
            newUserRole: data.role,
            organizationName: user.tenant.name,
            createdByName: creatorName,
          }).catch((err) => {
            console.error(`[System User] Failed to send admin notification to ${admin.email}:`, err);
          });
        }
      } catch (err) {
        console.error('[System User] Failed to send admin notifications:', err);
      }
    })();

    // 9. Create audit log
    await prisma.auditLog.create({
      data: {
        userId: sessionData.userId,
        tenantId: sessionData.tenantId,
        action: 'user.created',
        entityType: 'User',
        entityId: user.id,
        changes: {
          email,
          firstName,
          lastName,
          role: data.role,
          createdBy: sessionData.email,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    });

    // 10. Invalidate employee-related caches (org-chart, managers, employees)
    await invalidateEmployeeRelatedCaches(sessionData.tenantId);

    return NextResponse.json(
      {
        success: true,
        message: 'User created successfully. Welcome email sent.',
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: user.name,
          role: user.role,
          status: user.status,
          department: user.department,
          tenant: user.tenant,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Create user error:', error);

    // Handle Prisma unique constraint violation
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          {
            success: false,
            error: 'Email already exists',
            details: 'This email address is already registered in the system. Each user must have a unique email address.'
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred while creating user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
