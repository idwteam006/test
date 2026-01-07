import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

// Default leave policies (fallback)
const DEFAULT_LEAVE_POLICIES: Record<string, number> = {
  ANNUAL: 20,
  SICK: 10,
  PERSONAL: 5,
  MATERNITY: 90,
  PATERNITY: 15,
  UNPAID: 0,
};

// POST /api/admin/leave/reset-balance - Reset employee leave balance to org default
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Allow ADMIN, HR, or MANAGER to reset balances
    // Also allow any user to reset their own balance
    const body = await request.json();
    const { employeeId, leaveType, year } = body;

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    const targetYear = year || new Date().getFullYear();

    console.log(`[Leave Reset] Attempting reset - User: ${user.id}, Role: ${user.role}, EmployeeId: ${employeeId}, Year: ${targetYear}`);

    // Get tenant leave policies
    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: { leavePolicies: true },
    });

    const orgLeavePolicies = {
      ...DEFAULT_LEAVE_POLICIES,
      ...(tenantSettings?.leavePolicies as Record<string, number> || {}),
    };

    // Get the current user's employee record to check if they're resetting their own balance
    const currentUserEmployee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    const isOwnBalance = currentUserEmployee?.id === employeeId;
    const isPrivilegedRole = user.role === 'ADMIN' || user.role === 'HR' || user.role === 'MANAGER';

    // Check authorization: must be resetting own balance OR have privileged role
    if (!isOwnBalance && !isPrivilegedRole) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to reset this balance' },
        { status: 403 }
      );
    }

    // Verify employee belongs to same tenant
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        tenantId: user.tenantId,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!employee) {
      console.log(`[Leave Reset] Employee not found - ID: ${employeeId}, TenantId: ${user.tenantId}`);
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    console.log(`[Leave Reset] Found employee: ${employee.user.email}`);

    // If leaveType specified, reset only that type; otherwise reset all
    const leaveTypesToReset = leaveType
      ? [leaveType]
      : ['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'UNPAID'];

    const results: any[] = [];

    for (const type of leaveTypesToReset) {
      const defaultBalance = orgLeavePolicies[type] ?? 0;

      console.log(`[Leave Reset] Processing ${type} - target balance: ${defaultBalance}`);

      // Check if balance record exists
      const existingBalance = await prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveType_year: {
            employeeId,
            leaveType: type,
            year: targetYear,
          },
        },
      });

      console.log(`[Leave Reset] Existing ${type} balance:`, existingBalance ? `id=${existingBalance.id}, balance=${existingBalance.balance}` : 'not found');

      if (existingBalance) {
        // Update existing balance to org default
        const updated = await prisma.leaveBalance.update({
          where: { id: existingBalance.id },
          data: {
            balance: defaultBalance,
            updatedAt: new Date(),
          },
        });

        // Verify the update was successful by re-fetching
        const verified = await prisma.leaveBalance.findUnique({
          where: { id: existingBalance.id },
        });

        console.log(`[Leave Reset] Updated ${type}: ${existingBalance.balance} -> ${defaultBalance}`);
        console.log(`[Leave Reset] Verified ${type}: balance in DB is now ${verified?.balance}`);

        results.push({
          leaveType: type,
          previousBalance: existingBalance.balance,
          newBalance: defaultBalance,
          status: 'reset',
        });
      } else {
        // Create new balance with org default
        const created = await prisma.leaveBalance.create({
          data: {
            tenantId: user.tenantId,
            employeeId,
            leaveType: type as any,
            balance: defaultBalance,
            year: targetYear,
          },
        });

        console.log(`[Leave Reset] Created ${type}: new balance=${defaultBalance}, id=${created.id}`);

        results.push({
          leaveType: type,
          previousBalance: null,
          newBalance: defaultBalance,
          status: 'created',
        });
      }
    }

    console.log(`[Leave Reset] User ${user.id} (${user.role}) reset balance for employee ${employeeId}:`, JSON.stringify(results));

    return NextResponse.json({
      success: true,
      message: `Leave balance reset successfully for ${employee.user.firstName} ${employee.user.lastName}`,
      employee: {
        id: employee.id,
        name: `${employee.user.firstName} ${employee.user.lastName}`,
        email: employee.user.email,
      },
      year: targetYear,
      results,
    });
  } catch (error) {
    console.error('Error resetting leave balance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset leave balance' },
      { status: 500 }
    );
  }
}
