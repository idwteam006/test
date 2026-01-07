import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { sendWelcomeEmail } from '@/lib/resend-email';
import {
  generateSecureToken,
  isEmailDomainAllowed,
  sanitizeEmail,
  sanitizeName,
} from '@/lib/security';
import {
  logEmployeeCreated,
  logSuspiciousActivity
} from '@/lib/audit';
import { Role } from '@prisma/client';

// Validation schema
const CreateEmployeeSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  departmentId: z.string().uuid('Invalid department ID'),
  jobTitle: z.string().min(1, 'Job title is required').max(200),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE', 'ACCOUNTANT']).default('EMPLOYEE'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).default('FULL_TIME'),
  startDate: z.string().datetime('Invalid start date'),
  managerId: z.string().uuid().optional(),
  emergencyContacts: z.array(z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string(),
    email: z.string().email().optional(),
  })).min(1, 'At least one emergency contact is required'),
});

/**
 * POST /api/admin/employees/create
 *
 * Admin-only endpoint to create a new employee
 *
 * Security:
 * - Admin role required
 * - Email domain validation against tenant whitelist
 * - Audit logging
 * - Sends welcome email with instructions
 *
 * Flow:
 * 1. Verify admin session
 * 2. Validate input data
 * 3. Check email domain against whitelist
 * 4. Generate unique employee number
 * 5. Create user account (status: PENDING)
 * 6. Create employee record
 * 7. Send welcome email
 * 8. Log action
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
      await logSuspiciousActivity({
        userId: sessionData.userId,
        tenantId: sessionData.tenantId,
        email: sessionData.email,
        ipAddress: sessionData.ipAddress,
        userAgent: sessionData.userAgent,
        activityType: 'UNAUTHORIZED_ADMIN_ACCESS',
        details: { endpoint: '/api/admin/employees/create' },
      });

      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validation = CreateEmployeeSchema.safeParse(body);

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

    // 3. Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'A user with this email already exists'
        },
        { status: 409 }
      );
    }

    // 4. Validate email domain
    const isDomainAllowed = await isEmailDomainAllowed(email, sessionData.tenantId);

    if (!isDomainAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email domain is not allowed for this organization'
        },
        { status: 403 }
      );
    }

    // 5. Verify department exists and belongs to tenant
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

    // 6. If managerId provided, verify manager exists
    if (data.managerId) {
      const manager = await prisma.employee.findFirst({
        where: {
          id: data.managerId,
          tenantId: sessionData.tenantId,
        },
      });

      if (!manager) {
        return NextResponse.json(
          {
            success: false,
            error: 'Manager not found or does not belong to your organization'
          },
          { status: 404 }
        );
      }
    }

    // 7. Generate unique employee number (format: EMP-YYYYMMDD-XXX)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Get count of employees created today
    // Create separate date objects to avoid mutation
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayCount = await prisma.employee.count({
      where: {
        tenantId: sessionData.tenantId,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    const employeeNumber = `EMP-${dateStr}-${String(todayCount + 1).padStart(3, '0')}`;

    // 8. Get tenant details for welcome email
    const tenant = await prisma.tenant.findUnique({
      where: { id: sessionData.tenantId },
      select: { name: true },
    });

    // 9. Create user and employee in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user account
      const user = await tx.user.create({
        data: {
          email,
          name: `${firstName} ${lastName}`,
          firstName,
          lastName,
          role: data.role as Role,
          status: 'PENDING', // User must login via magic link to activate
          tenantId: sessionData.tenantId,
          departmentId: data.departmentId,
          emailVerified: false,
          password: '', // No password needed for passwordless auth
        },
      });

      // Create employee record
      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          tenantId: sessionData.tenantId,
          employeeNumber,
          departmentId: data.departmentId,
          jobTitle: data.jobTitle,
          managerId: data.managerId,
          startDate: new Date(data.startDate),
          employmentType: data.employmentType,
          status: 'ACTIVE',
          emergencyContacts: data.emergencyContacts,
        },
        include: {
          department: true,
          manager: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      return { user, employee };
    }, {
      timeout: 15000, // 15 seconds for slow database connections
    });

    // 10. Send welcome email
    await sendWelcomeEmail(
      email,
      firstName,
      tenant?.name || 'Your Organization'
    );

    // 11. Log employee creation
    await logEmployeeCreated({
      userId: sessionData.userId,
      tenantId: sessionData.tenantId,
      email: sessionData.email,
      ipAddress: sessionData.ipAddress,
      userAgent: sessionData.userAgent,
      newEmployeeId: result.employee.id,
      newEmployeeEmail: email,
      newEmployeeNumber: employeeNumber,
    });

    // 12. Return created employee data
    return NextResponse.json(
      {
        success: true,
        message: 'Employee created successfully. Welcome email sent.',
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            status: result.user.status,
          },
          employee: {
            id: result.employee.id,
            employeeNumber: result.employee.employeeNumber,
            jobTitle: result.employee.jobTitle,
            employmentType: result.employee.employmentType,
            startDate: result.employee.startDate,
            department: result.employee.department,
            manager: result.employee.manager ? {
              id: result.employee.manager.id,
              name: `${result.employee.manager.user.firstName} ${result.employee.manager.user.lastName}`,
            } : null,
          },
        },
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Create employee error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred while creating employee'
      },
      { status: 500 }
    );
  }
}

// Prevent GET requests
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
