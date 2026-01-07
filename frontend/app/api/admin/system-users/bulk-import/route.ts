import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { sendWelcomeEmail } from '@/lib/resend-email';
import { isEmailDomainAllowed, sanitizeEmail, sanitizeName } from '@/lib/security';
import { z } from 'zod';
import { invalidateEmployeeRelatedCaches } from '@/lib/cache';

/**
 * POST /api/admin/system-users/bulk-import
 *
 * Bulk import system users from CSV upload
 *
 * CSV Format (8 columns - departmentName OR departmentId):
 * email, firstName, lastName, role, jobTitle, departmentName, departmentId, managerId
 *
 * Example:
 * admin@company.com,John,Doe,ADMIN,Chief Administrator,Engineering,,
 * hr@company.com,Jane,Smith,HR,HR Manager,Human Resources,,user-uuid-789
 *
 * Security:
 * - Requires authenticated session
 * - Only ADMIN/HR can bulk import
 * - Email domain validation against tenant whitelist
 * - Validates all rows before processing
 * - Resolves department names to IDs (case-insensitive)
 * - Resolves department and manager IDs
 * - Skips duplicates
 * - Returns detailed report
 */

const bulkImportRowSchema = z.object({
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'First name required').max(100),
  lastName: z.string().min(1, 'Last name required').max(100),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE', 'HR', 'ACCOUNTANT']).default('EMPLOYEE'),
  jobTitle: z.string().max(200).optional(),
  departmentId: z.string().uuid('Invalid department ID').optional(),
  departmentName: z.string().optional(),
  managerId: z.string().uuid('Invalid manager ID').optional(),
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

    // Check permissions - ADMIN or HR can bulk import
    if (!['ADMIN', 'HR'].includes(sessionData.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Only ADMIN or HR can bulk import users.' },
        { status: 403 }
      );
    }

    // 2. Parse CSV data from request body
    const body = await request.json();
    const { users } = body;

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No user data provided' },
        { status: 400 }
      );
    }

    if (users.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Maximum 100 users per bulk upload' },
        { status: 400 }
      );
    }

    // 3. Validate all rows first
    const validationResults = users.map((user, index) => {
      const result = bulkImportRowSchema.safeParse(user);
      return {
        row: index + 1,
        data: user,
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
    const emails = users.map((u: any) => u.email.toLowerCase());
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

    // 6. Fetch all departments for this tenant to validate IDs and resolve names
    const allDepartments = await prisma.department.findMany({
      where: {
        tenantId: sessionData.tenantId,
      },
      select: { id: true, name: true },
    });

    const departmentById = new Map(allDepartments.map(d => [d.id, d.name]));
    const departmentByName = new Map(allDepartments.map(d => [d.name.toLowerCase(), d.id]));

    // 7. Fetch all potential managers to validate IDs
    const managerIds = users
      .map((u: any) => u.managerId)
      .filter((id: string | undefined) => id && id.trim() !== '');

    const managers = await prisma.user.findMany({
      where: {
        tenantId: sessionData.tenantId,
        id: { in: managerIds },
        role: { in: ['ADMIN', 'MANAGER'] },
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    const managerMap = new Map(
      managers.map(m => [m.id, `${m.firstName} ${m.lastName}`])
    );

    // 8. Process each user
    const results = {
      successful: [] as any[],
      failed: [] as any[],
      skipped: [] as any[],
    };

    for (let i = 0; i < users.length; i++) {
      const userData = users[i];
      const row = i + 1;

      try {
        const email = sanitizeEmail(userData.email);
        const firstName = sanitizeName(userData.firstName);
        const lastName = sanitizeName(userData.lastName);

        // Skip if already exists
        if (existingEmails.includes(email)) {
          results.skipped.push({
            row,
            email: userData.email,
            reason: 'Email already exists',
          });
          continue;
        }

        // Validate email domain against tenant whitelist
        const isDomainAllowed = await isEmailDomainAllowed(email, sessionData.tenantId);
        if (!isDomainAllowed) {
          results.failed.push({
            row,
            email: userData.email,
            error: 'Email domain is not allowed for this organization',
          });
          continue;
        }

        // Resolve department name to ID if departmentName is provided
        let resolvedDepartmentId = userData.departmentId;
        if (userData.departmentName && userData.departmentName.trim() !== '') {
          const deptId = departmentByName.get(userData.departmentName.toLowerCase());
          if (!deptId) {
            results.failed.push({
              row,
              email: userData.email,
              error: `Department "${userData.departmentName}" not found in your organization`,
            });
            continue;
          }
          resolvedDepartmentId = deptId;
        }

        // Validate department ID if provided
        if (resolvedDepartmentId && resolvedDepartmentId.trim() !== '') {
          if (!departmentById.has(resolvedDepartmentId)) {
            results.failed.push({
              row,
              email: userData.email,
              error: `Department ID "${resolvedDepartmentId}" not found in your organization`,
            });
            continue;
          }
        }

        // Validate manager ID if provided
        if (userData.managerId && userData.managerId.trim() !== '') {
          if (!managerMap.has(userData.managerId)) {
            results.failed.push({
              row,
              email: userData.email,
              error: `Manager ID "${userData.managerId}" not found or is not an ADMIN/MANAGER`,
            });
            continue;
          }
        }

        // Create user
        const user = await prisma.user.create({
          data: {
            email,
            name: `${firstName} ${lastName}`,
            firstName,
            lastName,
            role: userData.role || 'EMPLOYEE',
            status: 'ACTIVE',
            tenantId: sessionData.tenantId,
            departmentId: resolvedDepartmentId && resolvedDepartmentId.trim() !== '' ? resolvedDepartmentId : null,
            emailVerified: false,
            password: '', // Passwordless auth
          },
          include: {
            tenant: {
              select: { name: true },
            },
          },
        });

        // Create employee record if jobTitle AND resolvedDepartmentId are provided
        let employeeNumber: string | undefined;
        if (userData.jobTitle && resolvedDepartmentId && resolvedDepartmentId.trim() !== '') {
          // Generate employee number
          const today = new Date();
          const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

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

          employeeNumber = `EMP-${dateStr}-${String(todayCount + 1).padStart(3, '0')}`;

          // Convert managerId from User.id to Employee.id if needed
          let managerEmployeeId: string | null = null;
          if (userData.managerId && userData.managerId.trim() !== '') {
            let managerEmployee = await prisma.employee.findFirst({
              where: {
                userId: userData.managerId,
                tenantId: sessionData.tenantId,
              },
              select: { id: true },
            });

            // If manager doesn't have an Employee record, create one
            if (!managerEmployee) {
              const managerUser = await prisma.user.findUnique({
                where: { id: userData.managerId },
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                  departmentId: true,
                },
              });

              if (managerUser) {
                const deptIdForManager = managerUser.departmentId || resolvedDepartmentId;
                const mgrTodayCount = await prisma.employee.count({
                  where: {
                    tenantId: sessionData.tenantId,
                    createdAt: {
                      gte: todayStart,
                      lte: todayEnd,
                    },
                  },
                });

                const mgrEmployeeNumber = `EMP-${dateStr}-${String(mgrTodayCount + 1).padStart(3, '0')}`;

                managerEmployee = await prisma.employee.create({
                  data: {
                    user: { connect: { id: userData.managerId } },
                    tenant: { connect: { id: sessionData.tenantId } },
                    department: { connect: { id: deptIdForManager } },
                    employeeNumber: mgrEmployeeNumber,
                    jobTitle: managerUser.role === 'ADMIN' ? 'Administrator' : managerUser.role === 'HR' ? 'HR Manager' : 'Manager',
                    startDate: new Date(),
                    employmentType: 'FULL_TIME',
                    status: 'ACTIVE',
                    emergencyContacts: [],
                  },
                  select: { id: true },
                });

                await prisma.user.update({
                  where: { id: userData.managerId },
                  data: { employeeId: managerEmployee.id },
                });
              }
            }

            if (managerEmployee) {
              managerEmployeeId = managerEmployee.id;
            }
          }

          const employeeData: any = {
            user: { connect: { id: user.id } },
            tenant: { connect: { id: sessionData.tenantId } },
            department: { connect: { id: resolvedDepartmentId } },
            employeeNumber,
            jobTitle: userData.jobTitle,
            startDate: new Date(),
            employmentType: 'FULL_TIME',
            status: 'ACTIVE',
            emergencyContacts: [],
          };

          if (managerEmployeeId) {
            employeeData.manager = { connect: { id: managerEmployeeId } };
          }

          const employee = await prisma.employee.create({
            data: employeeData,
          });

          await prisma.user.update({
            where: { id: user.id },
            data: { employeeId: employee.id },
          });
        }

        // Send welcome email (don't fail if email fails)
        try {
          await sendWelcomeEmail(email, firstName, user.tenant.name);
        } catch (emailError) {
          console.error(`Failed to send welcome email to ${email}:`, emailError);
        }

        // Create audit log
        await prisma.auditLog.create({
          data: {
            userId: sessionData.userId,
            tenantId: sessionData.tenantId,
            action: 'user.bulk_created',
            entityType: 'User',
            entityId: user.id,
            changes: {
              email,
              firstName,
              lastName,
              role: userData.role,
              createdBy: sessionData.email,
              importType: 'bulk_csv',
            },
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
          },
        });

        results.successful.push({
          row,
          email: userData.email,
          name: `${firstName} ${lastName}`,
          role: userData.role || 'EMPLOYEE',
          employeeNumber,
        });

      } catch (error) {
        results.failed.push({
          row,
          email: userData.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // 9. Invalidate employee-related caches
    await invalidateEmployeeRelatedCaches(sessionData.tenantId);

    // 10. Return detailed report
    return NextResponse.json(
      {
        success: true,
        message: `Bulk import completed: ${results.successful.length} created, ${results.skipped.length} skipped, ${results.failed.length} failed`,
        summary: {
          total: users.length,
          successful: results.successful.length,
          skipped: results.skipped.length,
          failed: results.failed.length,
        },
        details: results,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Bulk import failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}