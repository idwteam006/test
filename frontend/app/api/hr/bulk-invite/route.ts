import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { sendOnboardingInvite } from '@/lib/resend-email';
import { isEmailDomainAllowed } from '@/lib/security';
import crypto from 'crypto';
import { z } from 'zod';

/**
 * POST /api/hr/bulk-invite
 *
 * Bulk invite employees from CSV upload
 *
 * CSV Format (9 columns):
 * email, firstName, lastName, departmentName, designation, joiningDate (DD-MM-YYYY), managerEmail, employmentType, workLocation
 *
 * Security:
 * - Requires authenticated session
 * - Only HR/ADMIN/MANAGER can bulk invite
 * - Email domain validation against tenant whitelist
 * - Validates all rows before processing
 * - Resolves department names and manager emails to IDs
 * - Skips duplicates
 * - Returns detailed report
 */

// Helper to parse DD-MM-YYYY to Date
function parseDateDDMMYYYY(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr}. Expected DD-MM-YYYY`);
  }
  const [day, month, year] = parts;
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return date;
}

const bulkInviteRowSchema = z.object({
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  departmentName: z.string().min(1, 'Department name required'),
  designation: z.string().min(1, 'Designation required'),
  joiningDate: z.string().min(1, 'Joining date required'), // DD-MM-YYYY format
  managerEmail: z.string().email('Invalid manager email').optional().or(z.literal('')),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).optional().default('FULL_TIME'),
  workLocation: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Validate session
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

    // Check permissions - HR, ADMIN, and MANAGER can bulk invite
    if (!['ADMIN', 'MANAGER', 'HR'].includes(sessionData.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // 2. Parse CSV data from request body
    const body = await request.json();
    const { employees } = body;

    if (!Array.isArray(employees) || employees.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No employee data provided' },
        { status: 400 }
      );
    }

    if (employees.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Maximum 100 employees per bulk upload' },
        { status: 400 }
      );
    }

    // 3. Validate all rows first
    const validationResults = employees.map((emp, index) => {
      const result = bulkInviteRowSchema.safeParse(emp);
      return {
        row: index + 1,
        data: emp,
        valid: result.success,
        errors: result.success ? [] : result.error.issues.map(e => e.message),
      };
    });

    const invalidRows = validationResults.filter(r => !r.valid);
    if (invalidRows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed for some rows',
          invalidRows,
        },
        { status: 400 }
      );
    }

    // 4. Check for duplicate emails in CSV
    const emails = employees.map((e: any) => e.email.toLowerCase());
    const duplicatesInCSV = emails.filter((e: string, i: number) => emails.indexOf(e) !== i);

    if (duplicatesInCSV.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate emails found in CSV',
          duplicates: [...new Set(duplicatesInCSV)],
        },
        { status: 400 }
      );
    }

    // 5. Check for existing users
    const existingUsers = await prisma.user.findMany({
      where: {
        email: { in: emails },
        tenantId: sessionData.tenantId,
      },
      select: { email: true },
    });

    const existingEmails = existingUsers.map(u => u.email.toLowerCase());

    // 5a. Fetch all departments for this tenant to resolve names to IDs
    const departments = await prisma.department.findMany({
      where: { tenantId: sessionData.tenantId },
      select: { id: true, name: true },
    });
    const departmentMap = new Map(
      departments.map(d => [d.name.toLowerCase(), d.id])
    );

    // 5b. Fetch all potential managers (ADMIN/MANAGER) to resolve emails to IDs
    const managers = await prisma.user.findMany({
      where: {
        tenantId: sessionData.tenantId,
        role: { in: ['ADMIN', 'MANAGER'] },
      },
      select: { id: true, email: true },
    });
    const managerMap = new Map(
      managers.map(m => [m.email.toLowerCase(), m.id])
    );

    // 6. Process each employee
    const results = {
      successful: [] as any[],
      failed: [] as any[],
      skipped: [] as any[],
    };

    for (let i = 0; i < employees.length; i++) {
      const empData = employees[i];
      const row = i + 1;

      try {
        // Skip if already exists
        if (existingEmails.includes(empData.email.toLowerCase())) {
          results.skipped.push({
            row,
            email: empData.email,
            reason: 'Email already exists',
          });
          continue;
        }

        // Validate email domain against tenant whitelist
        const isDomainAllowed = await isEmailDomainAllowed(empData.email, sessionData.tenantId);
        if (!isDomainAllowed) {
          results.failed.push({
            row,
            email: empData.email,
            error: 'Email domain is not allowed for this organization',
          });
          continue;
        }

        // Resolve department name to ID
        const departmentId = departmentMap.get(empData.departmentName.toLowerCase());
        if (!departmentId) {
          results.failed.push({
            row,
            email: empData.email,
            error: `Department "${empData.departmentName}" not found`,
          });
          continue;
        }

        // Resolve manager email to ID (optional)
        let managerId: string | null = null;
        if (empData.managerEmail && empData.managerEmail.trim()) {
          managerId = managerMap.get(empData.managerEmail.toLowerCase()) || null;
          if (!managerId) {
            results.failed.push({
              row,
              email: empData.email,
              error: `Manager with email "${empData.managerEmail}" not found`,
            });
            continue;
          }
        }

        // Parse joining date (DD-MM-YYYY format)
        let joiningDate: Date;
        try {
          joiningDate = parseDateDDMMYYYY(empData.joiningDate);
        } catch {
          results.failed.push({
            row,
            email: empData.email,
            error: `Invalid date format "${empData.joiningDate}". Use DD-MM-YYYY`,
          });
          continue;
        }

        // Generate employee ID
        const year = new Date().getFullYear();
        const lastEmployee = await prisma.user.findFirst({
          where: {
            tenantId: sessionData.tenantId,
            employeeId: { startsWith: `EMP-${year}-` },
          },
          orderBy: { employeeId: 'desc' },
        });

        let employeeId: string;
        if (lastEmployee && lastEmployee.employeeId) {
          const lastNumber = parseInt(lastEmployee.employeeId.split('-')[2]);
          employeeId = `EMP-${year}-${String(lastNumber + 1).padStart(3, '0')}`;
        } else {
          employeeId = `EMP-${year}-001`;
        }

        // Generate invite token
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Create user and invite
        await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              email: empData.email,
              name: `${empData.firstName} ${empData.lastName}`,
              firstName: empData.firstName,
              lastName: empData.lastName,
              tenantId: sessionData.tenantId,
              role: 'EMPLOYEE',
              status: 'INVITED',
              employeeId,
              departmentId,
              password: '',
              emailVerified: false,
            },
          });

          await tx.onboardingInvite.create({
            data: {
              tenantId: sessionData.tenantId,
              userId: newUser.id,
              token: inviteToken,
              email: empData.email,
              firstName: empData.firstName,
              lastName: empData.lastName,
              departmentId,
              designation: empData.designation,
              joiningDate,
              managerId,
              employeeId,
              workLocation: empData.workLocation,
              employmentType: empData.employmentType || 'FULL_TIME',
              status: 'PENDING',
              expiresAt,
              createdBy: sessionData.userId,
            },
          });
        });

        // Send invite email (don't fail if email fails)
        try {
          await sendOnboardingInvite({
            to: empData.email,
            firstName: empData.firstName,
            token: inviteToken,
            invitedBy: sessionData.email,
            expiresAt,
          });
        } catch (emailError) {
          console.error(`Failed to send email to ${empData.email}:`, emailError);
        }

        results.successful.push({
          row,
          email: empData.email,
          employeeId,
        });

      } catch (error) {
        results.failed.push({
          row,
          email: empData.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // 7. Return detailed report
    return NextResponse.json(
      {
        success: true,
        message: `Bulk invite completed: ${results.successful.length} invited, ${results.skipped.length} skipped, ${results.failed.length} failed`,
        summary: {
          total: employees.length,
          successful: results.successful.length,
          skipped: results.skipped.length,
          failed: results.failed.length,
        },
        details: results,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Bulk invite error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Bulk invite failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
