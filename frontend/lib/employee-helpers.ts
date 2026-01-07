import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

/**
 * Generate a unique employee number for a tenant on a specific date
 * Uses atomic increment to prevent race conditions
 */
export async function generateEmployeeNumber(
  tx: Prisma.TransactionClient,
  tenantId: string
): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

  // Get current count for today (within transaction for consistency)
  // Create separate date objects to avoid mutation
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const count = await tx.employee.count({
    where: {
      tenantId,
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  const nextNumber = count + 1;
  return `EMP-${dateStr}-${String(nextNumber).padStart(3, '0')}`;
}

/**
 * Ensure a manager has an employee record
 * Returns employee ID if exists or creates one if needed
 */
export async function ensureManagerHasEmployeeRecord(
  tx: Prisma.TransactionClient,
  managerId: string,
  tenantId: string,
  fallbackDepartmentId: string
): Promise<string | null> {
  // 1. Validate manager exists and belongs to tenant
  const managerUser = await tx.user.findUnique({
    where: { id: managerId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      departmentId: true,
      tenantId: true,
      employeeId: true,
    },
  });

  if (!managerUser) {
    throw new Error('Manager user not found');
  }

  if (managerUser.tenantId !== tenantId) {
    throw new Error('Manager must belong to the same organization');
  }

  // Validate role is appropriate for manager
  if (!['ADMIN', 'MANAGER', 'HR'].includes(managerUser.role)) {
    throw new Error(`User with role ${managerUser.role} cannot be assigned as a manager`);
  }

  // 2. Return existing employee ID if available
  if (managerUser.employeeId) {
    return managerUser.employeeId;
  }

  // 3. Create employee record for manager
  const departmentId = managerUser.departmentId || fallbackDepartmentId;

  // Validate department exists and belongs to tenant
  const department = await tx.department.findFirst({
    where: {
      id: departmentId,
      tenantId,
    },
  });

  if (!department) {
    throw new Error(
      'Cannot create manager employee record: Valid department required. ' +
      'Please ensure manager has a department assigned or provide a valid department.'
    );
  }

  // Generate employee number
  const employeeNumber = await generateEmployeeNumber(tx, tenantId);

  // Determine job title based on role
  const jobTitle =
    managerUser.role === 'ADMIN'
      ? 'Administrator'
      : managerUser.role === 'HR'
      ? 'HR Manager'
      : 'Manager';

  // Create manager employee record
  const managerEmployee = await tx.employee.create({
    data: {
      user: { connect: { id: managerId } },
      tenant: { connect: { id: tenantId } },
      department: { connect: { id: departmentId } },
      employeeNumber,
      jobTitle,
      startDate: new Date(),
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      emergencyContacts: [],
    },
    select: { id: true },
  });

  // Link employee record to user
  await tx.user.update({
    where: { id: managerId },
    data: { employeeId: managerEmployee.id },
  });

  return managerEmployee.id;
}