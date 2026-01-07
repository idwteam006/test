import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import {
  notifyEmployeeRoleAssigned,
  notifyManagerNewEmployeeAssigned
} from '@/lib/email-notifications';
import { invalidateEmployeeRelatedCaches } from '@/lib/cache';

/**
 * PATCH /api/admin/employees/[id]/assign-role
 * Assign user role and job designation to an employee
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // Authentication
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData?.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get admin user
    const adminUser = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        id: true,
        tenantId: true,
        role: true,
      },
    });

    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only ADMIN and HR can assign roles
    if (!['ADMIN', 'HR'].includes(adminUser.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin or HR access required.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { role, jobTitle, departmentId, managerId, teams } = body;

    // Validate role if provided
    const validRoles = ['ADMIN', 'MANAGER', 'HR', 'EMPLOYEE', 'ACCOUNTANT'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Get target employee
    const targetUser = await prisma.user.findUnique({
      where: {
        id: userId,
        tenantId: adminUser.tenantId,
      },
      include: {
        employee: true,
      }
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Employee not found in your organization' },
        { status: 404 }
      );
    }

    // Update user role and department if provided
    const userUpdateData: any = {};
    if (role) {
      userUpdateData.role = role;
    }
    if (departmentId !== undefined) {
      userUpdateData.departmentId = departmentId || null;
    }

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      });
    }

    // Create employee record if it doesn't exist and department + jobTitle are provided
    let employeeRecord = targetUser.employee;
    if (!employeeRecord && departmentId && jobTitle) {
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
          tenantId: adminUser.tenantId,
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      });

      const employeeNumber = `EMP-${dateStr}-${String(todayCount + 1).padStart(3, '0')}`;

      employeeRecord = await prisma.employee.create({
        data: {
          user: { connect: { id: userId } },
          tenant: { connect: { id: adminUser.tenantId } },
          department: { connect: { id: departmentId } },
          employeeNumber,
          jobTitle,
          startDate: new Date(),
          employmentType: 'FULL_TIME',
          status: 'ACTIVE',
          emergencyContacts: [],
        },
      });

      // Link employee record to user
      await prisma.user.update({
        where: { id: userId },
        data: { employeeId: employeeRecord.id },
      });
    }

    // Update employee details if employee record exists
    if (employeeRecord) {
      const employeeUpdateData: any = {};
      if (jobTitle !== undefined) {
        employeeUpdateData.jobTitle = jobTitle;
      }

      // Convert managerId from User.id to Employee.id
      if (managerId !== undefined) {
        if (managerId) {
          // Find the employee record for the selected manager
          let managerEmployee = await prisma.employee.findFirst({
            where: {
              userId: managerId, // managerId from dropdown is User.id
              tenantId: adminUser.tenantId,
            },
            select: { id: true },
          });

          // If manager doesn't have an Employee record, create one
          if (!managerEmployee) {
            const managerUser = await prisma.user.findUnique({
              where: { id: managerId },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                departmentId: true,
              },
            });

            if (managerUser) {
              // Generate employee number for manager
              const today = new Date();
              const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

              // Create separate date objects to avoid mutation
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);

              const todayEnd = new Date();
              todayEnd.setHours(23, 59, 59, 999);

              const todayCount = await prisma.employee.count({
                where: {
                  tenantId: adminUser.tenantId,
                  createdAt: {
                    gte: todayStart,
                    lte: todayEnd,
                  },
                },
              });

              const mgrEmployeeNumber = `EMP-${dateStr}-${String(todayCount + 1).padStart(3, '0')}`;

              // Get default department if manager doesn't have one
              let deptIdForManager = managerUser.departmentId;
              if (!deptIdForManager) {
                // Use the employee's department or find a default
                const defaultDept = await prisma.department.findFirst({
                  where: { tenantId: adminUser.tenantId },
                  select: { id: true },
                });
                deptIdForManager = departmentId || defaultDept?.id;
              }

              if (deptIdForManager) {
                managerEmployee = await prisma.employee.create({
                  data: {
                    user: { connect: { id: managerId } },
                    tenant: { connect: { id: adminUser.tenantId } },
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

                // Link employee record to user
                await prisma.user.update({
                  where: { id: managerId },
                  data: { employeeId: managerEmployee.id },
                });
              }
            }
          }

          if (managerEmployee) {
            employeeUpdateData.managerId = managerEmployee.id; // Use Employee.id
          } else {
            // Still couldn't create manager employee record
            employeeUpdateData.managerId = null;
          }
        } else {
          employeeUpdateData.managerId = null;
        }
      }

      if (Object.keys(employeeUpdateData).length > 0) {
        await prisma.employee.update({
          where: { id: employeeRecord.id },
          data: employeeUpdateData,
        });
      }

      // Update team memberships if provided
      if (teams !== undefined && Array.isArray(teams)) {
        // Remove all existing team memberships
        await prisma.teamMember.deleteMany({
          where: {
            employeeId: employeeRecord.id,
          },
        });

        // Add new team memberships
        if (teams.length > 0) {
          await prisma.teamMember.createMany({
            data: teams.map((teamId: string) => ({
              teamId,
              employeeId: employeeRecord.id,
              role: 'MEMBER', // Default role
              joinedAt: new Date(),
            })),
            skipDuplicates: true,
          });
        }
      }
    }

    // Get updated user data with manager and tenant info for email notifications
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            jobTitle: true,
            manager: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                    role: true,
                  }
                }
              }
            }
          }
        },
        department: {
          select: {
            id: true,
            name: true,
          }
        },
        tenant: {
          select: {
            name: true,
          }
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: adminUser.tenantId,
        userId: adminUser.id,
        action: 'employee.details_updated',
        entityType: 'user',
        entityId: userId,
        changes: {
          role: role || 'unchanged',
          jobTitle: jobTitle || 'unchanged',
          departmentId: departmentId || 'unchanged',
          managerId: managerId || 'unchanged',
          teams: teams || 'unchanged',
          assignedBy: adminUser.id,
        },
        eventType: 'user',
        success: true,
      }
    });

    // Get admin user details for "assigned by"
    const assignedByUser = await prisma.user.findUnique({
      where: { id: adminUser.id },
      select: { name: true }
    });

    // Send email notification to employee
    if (updatedUser) {
      try {
        await notifyEmployeeRoleAssigned({
          employeeEmail: updatedUser.email,
          employeeName: updatedUser.name,
          role: updatedUser.role,
          jobTitle: updatedUser.employee?.jobTitle || undefined,
          departmentName: updatedUser.department?.name || undefined,
          managerName: updatedUser.employee?.manager?.user?.name || undefined,
          organizationName: updatedUser.tenant?.name || 'Zenora',
          assignedBy: assignedByUser?.name || 'Admin',
        });

        // Send email notification to manager if one is assigned
        if (updatedUser.employee?.manager?.user) {
          await notifyManagerNewEmployeeAssigned({
            managerEmail: updatedUser.employee.manager.user.email,
            managerName: updatedUser.employee.manager.user.name,
            employeeName: updatedUser.name,
            employeeEmail: updatedUser.email,
            role: updatedUser.role,
            jobTitle: updatedUser.employee?.jobTitle || undefined,
            departmentName: updatedUser.department?.name || undefined,
            organizationName: updatedUser.tenant?.name || 'Zenora',
            assignedBy: assignedByUser?.name || 'Admin',
          });
        }
      } catch (emailError) {
        console.error('Error sending role assignment email notifications:', emailError);
        // Don't fail the request if email sending fails
      }
    }

    // Invalidate employee-related caches (org-chart, managers, employees)
    await invalidateEmployeeRelatedCaches(adminUser.tenantId);

    return NextResponse.json({
      success: true,
      message: 'Role and designation updated successfully',
      user: {
        id: updatedUser?.id,
        email: updatedUser?.email,
        firstName: updatedUser?.firstName,
        lastName: updatedUser?.lastName,
        role: updatedUser?.role,
        jobTitle: updatedUser?.employee?.jobTitle,
        department: updatedUser?.department?.name,
      }
    });

  } catch (error: any) {
    console.error('Error assigning role:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to assign role',
        details: error.message
      },
      { status: 500 }
    );
  }
}
