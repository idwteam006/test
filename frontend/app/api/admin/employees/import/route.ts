import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { sendWelcomeEmail } from '@/lib/resend-email';
import {
  isEmailDomainAllowed,
  sanitizeEmail,
  sanitizeName,
} from '@/lib/security';
import {
  logEmployeesImported,
  logSuspiciousActivity
} from '@/lib/audit';
import { Role } from '@prisma/client';

// Single employee validation schema
const EmployeeImportSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  departmentId: z.string().optional(), // UUID or will be resolved from departmentName
  departmentName: z.string().optional(), // Alternative to departmentId
  jobTitle: z.string().min(1, 'Job title is required').max(200),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE', 'HR', 'ACCOUNTANT']).default('EMPLOYEE'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).default('FULL_TIME'),
  startDate: z.string().datetime('Invalid start date'),
  managerId: z.string().uuid().optional(),
  emergencyContacts: z.array(z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string(),
    email: z.string().email().optional(),
  })).min(1, 'At least one emergency contact is required'),
}).refine(
  (data) => data.departmentId || data.departmentName,
  { message: 'Either departmentId or departmentName must be provided' }
);

// Batch import schema
const BatchImportSchema = z.object({
  employees: z.array(EmployeeImportSchema).min(1, 'At least one employee is required').max(100, 'Maximum 100 employees per batch'),
  sendWelcomeEmails: z.boolean().default(true),
});

/**
 * POST /api/admin/employees/import
 *
 * Admin-only endpoint to bulk import employees from CSV/Excel
 *
 * Security:
 * - Admin role required
 * - Email domain validation for all employees
 * - Transactional creation (all or nothing)
 * - Audit logging
 * - Optional welcome emails
 *
 * Flow:
 * 1. Verify admin session
 * 2. Validate all employee data
 * 3. Check for duplicate emails
 * 4. Verify all departments exist
 * 5. Generate unique employee numbers
 * 6. Create all employees in transaction
 * 7. Send welcome emails (async)
 * 8. Log bulk import
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
        details: { endpoint: '/api/admin/employees/import' },
      });

      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validation = BatchImportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid import data',
          details: validation.error.format()
        },
        { status: 400 }
      );
    }

    const { employees, sendWelcomeEmails } = validation.data;

    // 3. Pre-validation checks
    const validationErrors: Record<number, string[]> = {};
    const emails = employees.map((emp, idx) => ({
      index: idx,
      email: sanitizeEmail(emp.email),
    }));

    // Check for duplicate emails in the batch
    const emailSet = new Set<string>();
    for (const { index, email } of emails) {
      if (emailSet.has(email)) {
        validationErrors[index] = validationErrors[index] || [];
        validationErrors[index].push(`Duplicate email in batch: ${email}`);
      }
      emailSet.add(email);
    }

    // Check if any email already exists in database
    const existingUsers = await prisma.user.findMany({
      where: {
        email: {
          in: Array.from(emailSet),
        },
      },
      select: { email: true },
    });

    const existingEmails = new Set(existingUsers.map(u => u.email));
    for (const { index, email } of emails) {
      if (existingEmails.has(email)) {
        validationErrors[index] = validationErrors[index] || [];
        validationErrors[index].push(`Email already exists: ${email}`);
      }
    }

    // Validate email domains
    for (const { index, email } of emails) {
      const isDomainAllowed = await isEmailDomainAllowed(email, sessionData.tenantId);
      if (!isDomainAllowed) {
        validationErrors[index] = validationErrors[index] || [];
        validationErrors[index].push(`Email domain not allowed: ${email}`);
      }
    }

    // Get all departments for the tenant
    const allDepartments = await prisma.department.findMany({
      where: {
        tenantId: sessionData.tenantId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Create maps for quick lookup
    const departmentByName = new Map(allDepartments.map(d => [d.name.toLowerCase(), d.id]));
    const departmentById = new Map(allDepartments.map(d => [d.id, d.name]));

    // Resolve department names to IDs and validate
    const resolvedEmployees = employees.map((emp, index) => {
      let departmentId = emp.departmentId;

      // If departmentName is provided, resolve it to ID
      if (emp.departmentName) {
        const resolvedId = departmentByName.get(emp.departmentName.toLowerCase());
        if (!resolvedId) {
          validationErrors[index] = validationErrors[index] || [];
          validationErrors[index].push(`Department not found: ${emp.departmentName}`);
        } else {
          departmentId = resolvedId;
        }
      }

      // If departmentId is provided, verify it exists
      if (emp.departmentId && !departmentById.has(emp.departmentId)) {
        validationErrors[index] = validationErrors[index] || [];
        validationErrors[index].push(`Department ID not found: ${emp.departmentId}`);
      }

      return {
        ...emp,
        departmentId: departmentId!,
      };
    });

    // Verify all manager IDs exist (if provided)
    const managerIds = resolvedEmployees
      .filter(emp => emp.managerId)
      .map(emp => emp.managerId as string);

    if (managerIds.length > 0) {
      const managers = await prisma.employee.findMany({
        where: {
          id: { in: managerIds },
          tenantId: sessionData.tenantId,
        },
      });

      const validManagerIds = new Set(managers.map(m => m.id));
      resolvedEmployees.forEach((emp, index) => {
        if (emp.managerId && !validManagerIds.has(emp.managerId)) {
          validationErrors[index] = validationErrors[index] || [];
          validationErrors[index].push(`Manager not found: ${emp.managerId}`);
        }
      });
    }

    // If there are validation errors, return them
    if (Object.keys(validationErrors).length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed for some employees',
          errors: validationErrors,
        },
        { status: 400 }
      );
    }

    // 4. Generate employee numbers for all employees
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

    const employeeNumbers = resolvedEmployees.map((_, index) => {
      return `EMP-${dateStr}-${String(todayCount + index + 1).padStart(3, '0')}`;
    });

    // 5. Get tenant details
    const tenant = await prisma.tenant.findUnique({
      where: { id: sessionData.tenantId },
      select: { name: true },
    });

    // 6. Create all employees in a transaction
    const createdEmployees = await prisma.$transaction(async (tx) => {
      const results = [];

      for (let i = 0; i < resolvedEmployees.length; i++) {
        const emp = resolvedEmployees[i];
        const employeeNumber = employeeNumbers[i];

        // Create user account
        const user = await tx.user.create({
          data: {
            email: sanitizeEmail(emp.email),
            name: `${sanitizeName(emp.firstName)} ${sanitizeName(emp.lastName)}`,
            firstName: sanitizeName(emp.firstName),
            lastName: sanitizeName(emp.lastName),
            role: emp.role as Role,
            status: 'PENDING',
            tenantId: sessionData.tenantId,
            departmentId: emp.departmentId,
            emailVerified: false,
            password: '',
          },
        });

        // Create employee record
        const employee = await tx.employee.create({
          data: {
            userId: user.id,
            tenantId: sessionData.tenantId,
            employeeNumber,
            departmentId: emp.departmentId,
            jobTitle: emp.jobTitle,
            managerId: emp.managerId,
            startDate: new Date(emp.startDate),
            employmentType: emp.employmentType,
            status: 'ACTIVE',
            emergencyContacts: emp.emergencyContacts,
          },
        });

        results.push({
          user,
          employee,
          employeeNumber,
        });
      }

      return results;
    }, {
      timeout: 30000, // 30 seconds for bulk imports (can process up to 100 employees)
    });

    // 7. Send welcome emails (async, don't wait)
    if (sendWelcomeEmails) {
      Promise.all(
        createdEmployees.map(({ user }) =>
          sendWelcomeEmail(
            user.email,
            user.firstName,
            tenant?.name || 'Your Organization'
          ).catch(err => console.error(`Failed to send welcome email to ${user.email}:`, err))
        )
      ).catch(err => console.error('Failed to send some welcome emails:', err));
    }

    // 8. Log bulk import
    await logEmployeesImported({
      userId: sessionData.userId,
      tenantId: sessionData.tenantId,
      email: sessionData.email,
      ipAddress: sessionData.ipAddress,
      userAgent: sessionData.userAgent,
      employeeCount: createdEmployees.length,
      employeeEmails: createdEmployees.map(e => e.user.email),
    });

    // 9. Return success with summary
    return NextResponse.json(
      {
        success: true,
        message: `Successfully imported ${createdEmployees.length} employee(s)`,
        data: {
          imported: createdEmployees.length,
          employees: createdEmployees.map(({ user, employee, employeeNumber }) => ({
            employeeNumber,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            jobTitle: employee.jobTitle,
          })),
        },
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Import employees error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during bulk import'
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
