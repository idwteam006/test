import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { sendOnboardingInvite } from '@/lib/resend-email';
import { isEmailDomainAllowed } from '@/lib/security';
import crypto from 'crypto';
import { z } from 'zod';

/**
 * POST /api/hr/invite-employee
 *
 * HR creates a new employee invite with minimal information
 *
 * Security:
 * - Requires authenticated session
 * - Only HR/ADMIN can invite employees
 * - Email domain validation against tenant whitelist
 * - Validates email doesn't exist
 * - Validates manager exists
 * - Generates secure 7-day expiry token
 *
 * Flow:
 * 1. Validate HR permissions
 * 2. Validate input data
 * 3. Validate email domain
 * 4. Check email availability
 * 5. Create User with PENDING status
 * 6. Create OnboardingInvite with token
 * 7. Send invite email
 * 8. Return success
 */

const inviteSchema = z.object({
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  departmentId: z.string().uuid('Invalid department ID'),
  designation: z.string().min(1, 'Designation is required'),
  joiningDate: z.string().refine((val) => {
    // Accept YYYY-MM-DD format from input[type="date"] and convert to ISO
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(val)) return true;
    // Also accept ISO datetime format
    try {
      new Date(val).toISOString();
      return true;
    } catch {
      return false;
    }
  }, 'Invalid joining date format'),
  managerId: z.string().uuid('Reporting manager is required'), // CHANGED: Now required
  employeeId: z.string().optional(),
  workLocation: z.string().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).default('FULL_TIME'),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Get session and validate authentication
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get session from Redis
    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    // Check if user has HR, MANAGER, or ADMIN role
    if (!['HR', 'MANAGER', 'ADMIN'].includes(sessionData.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Only HR/MANAGER/ADMIN can invite employees.' },
        { status: 403 }
      );
    }

    // 2. Parse and validate input
    const body = await request.json();
    const validationResult = inviteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: validationResult.error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 3. Validate email domain against tenant whitelist
    const isDomainAllowed = await isEmailDomainAllowed(data.email, sessionData.tenantId);

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
      where: { email: data.email },
      include: {
        onboardingInvite: {
          select: {
            status: true,
            expiresAt: true,
          }
        },
        employee: {
          select: {
            employeeNumber: true,
            status: true,
          }
        }
      }
    });

    if (existingUser) {
      // Provide detailed context about where the user exists
      let userContext = '';

      if (existingUser.status === 'INVITED' && existingUser.onboardingInvite) {
        const inviteStatus = existingUser.onboardingInvite.status;
        const expiresAt = new Date(existingUser.onboardingInvite.expiresAt);
        const isExpired = expiresAt < new Date();

        userContext = isExpired
          ? `This email has an expired onboarding invitation. Please delete the old invitation before creating a new one.`
          : `This email already has a pending onboarding invitation (expires ${expiresAt.toLocaleDateString()})`;
      } else if (existingUser.employee) {
        userContext = `This email is already registered as an active employee (${existingUser.employee.employeeNumber})`;
      } else {
        userContext = `This email is already registered as a ${existingUser.role} user in the system`;
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Email already exists',
          details: userContext,
        },
        { status: 409 }
      );
    }

    // 5. Validate manager exists (if provided)
    if (data.managerId) {
      const manager = await prisma.user.findFirst({
        where: {
          id: data.managerId,
          tenantId: sessionData.tenantId,
          status: 'ACTIVE',
        },
      });

      if (!manager) {
        return NextResponse.json(
          {
            success: false,
            error: 'Manager not found or inactive',
          },
          { status: 400 }
        );
      }
    }

    // 6. Validate department exists
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
          error: 'Department not found',
        },
        { status: 400 }
      );
    }

    // 7. Generate unique employee ID if not provided
    let employeeId = data.employeeId;
    if (!employeeId) {
      // Get the latest employee number for this tenant
      const latestEmployee = await prisma.user.findFirst({
        where: {
          tenantId: sessionData.tenantId,
          employeeId: { not: null },
        },
        orderBy: { createdAt: 'desc' },
      });

      let nextNumber = 1;
      if (latestEmployee?.employeeId) {
        // Extract number from format like EMP-XXX-001
        const match = latestEmployee.employeeId.match(/EMP-\w+-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Format: EMP-[DEPT_CODE]-[NUMBER]
      const deptCode = department.name.substring(0, 3).toUpperCase();
      employeeId = `EMP-${deptCode}-${String(nextNumber).padStart(3, '0')}`;
    }

    // 8. Generate secure invite token (32 bytes = 64 hex chars)
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // 9. Create User and OnboardingInvite in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user with INVITED status (Step 1 of onboarding journey)
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          name: `${data.firstName} ${data.lastName}`,
          firstName: data.firstName,
          lastName: data.lastName,
          tenantId: sessionData.tenantId,
          role: 'EMPLOYEE', // Default role
          status: 'INVITED', // Step 1: HR sent invite, waiting for employee
          employeeId,
          departmentId: data.departmentId,
          password: '', // Passwordless auth
          emailVerified: false,
        },
      });

      // Create onboarding invite
      const invite = await tx.onboardingInvite.create({
        data: {
          tenantId: sessionData.tenantId,
          userId: newUser.id,
          token: inviteToken,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          departmentId: data.departmentId,
          designation: data.designation,
          joiningDate: new Date(data.joiningDate),
          managerId: data.managerId,
          employeeId,
          workLocation: data.workLocation,
          employmentType: data.employmentType,
          status: 'PENDING',
          expiresAt,
          createdBy: sessionData.userId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              employeeId: true,
            },
          },
        },
      });

      return { user: newUser, invite };
    });

    // 10. Send onboarding invite email
    try {
      await sendOnboardingInvite({
        to: data.email,
        firstName: data.firstName,
        token: inviteToken,
        invitedBy: sessionData.email,
        expiresAt,
      });
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError);
      // Don't fail the request if email fails - invite is created
    }

    // 10.5. Schedule reminder email for 3 days later
    // TODO: Enable this when BullMQ worker is set up in production
    // try {
    //   const { scheduleOnboardingReminder } = await import('@/lib/jobs/onboarding-reminders');
    //   await scheduleOnboardingReminder(result.invite.id);
    // } catch (reminderError) {
    //   console.error('Failed to schedule reminder:', reminderError);
    //   // Don't fail the request if reminder scheduling fails
    // }

    // 11. Return success
    return NextResponse.json(
      {
        success: true,
        message: 'Employee invite sent successfully',
        data: {
          userId: result.user.id,
          email: result.user.email,
          employeeId,
          inviteToken,
          expiresAt: expiresAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Invite employee error:', error);

    // Handle Prisma unique constraint violation
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          {
            success: false,
            error: 'Email already exists',
            details: 'This email address is already registered in the system. Each user must have a unique email address. Please check if this person already has an account or pending invitation.'
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create employee invite',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Prevent other methods
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
