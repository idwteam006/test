import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

interface LeavePolicy {
  ANNUAL: number;
  SICK: number;
  PERSONAL: number;
  MATERNITY: number;
  PATERNITY: number;
  UNPAID: number;
}

const DEFAULT_LEAVE_POLICY: LeavePolicy = {
  ANNUAL: 20,
  SICK: 10,
  PERSONAL: 5,
  MATERNITY: 90,
  PATERNITY: 15,
  UNPAID: 0,
};

// Calculate prorated leave for employees who joined mid-year
function calculateProratedLeave(
  annualDays: number,
  startDate: Date,
  allocationYear: number
): number {
  const yearStart = new Date(allocationYear, 0, 1);
  const yearEnd = new Date(allocationYear, 11, 31);

  // If employee started before the allocation year, give full allocation
  if (startDate <= yearStart) {
    return annualDays;
  }

  // If employee started after the allocation year, give 0
  if (startDate > yearEnd) {
    return 0;
  }

  // Calculate prorated based on months worked
  const monthsWorked = 12 - startDate.getMonth();
  const proratedDays = Math.round((annualDays / 12) * monthsWorked);

  return proratedDays;
}

// POST /api/admin/leave/allocate - Allocate leave balances for employees
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user || (user.role !== 'ADMIN' && user.role !== 'HR')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { year, employeeIds, prorated = true } = body;

    const allocationYear = year || new Date().getFullYear();

    // Get tenant settings for leave policies
    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: {
        leavePolicies: true,
        carryForwardLeave: true,
        maxCarryForwardDays: true,
      },
    });

    // Parse leave policies from tenant settings or use defaults
    let leavePolicies: LeavePolicy = DEFAULT_LEAVE_POLICY;
    if (tenantSettings?.leavePolicies) {
      try {
        leavePolicies = { ...DEFAULT_LEAVE_POLICY, ...(tenantSettings.leavePolicies as any) };
      } catch (e) {
        console.error('Failed to parse leave policies, using defaults');
      }
    }

    // Get employees to allocate
    const whereClause: any = {
      tenantId: user.tenantId,
      status: 'ACTIVE',
    };

    if (employeeIds && employeeIds.length > 0) {
      whereClause.id = { in: employeeIds };
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        leaveBalances: {
          where: {
            year: allocationYear,
          },
        },
      },
    });

    if (employees.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No employees found for allocation' },
        { status: 404 }
      );
    }

    const allocations: any[] = [];
    const errors: any[] = [];

    // Process carry-forward if enabled
    const previousYear = allocationYear - 1;
    const shouldCarryForward = tenantSettings?.carryForwardLeave || false;
    const maxCarryForward = tenantSettings?.maxCarryForwardDays || 0;

    for (const employee of employees) {
      try {
        const employeeAllocations: any = {
          employeeId: employee.id,
          employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
          year: allocationYear,
          allocations: [],
        };

        // Get previous year balances for carry-forward
        let carryForwardBalances: any = {};
        if (shouldCarryForward && maxCarryForward > 0) {
          const previousBalances = await prisma.leaveBalance.findMany({
            where: {
              employeeId: employee.id,
              year: previousYear,
              leaveType: 'ANNUAL', // Only ANNUAL leave can be carried forward
            },
          });

          previousBalances.forEach((bal) => {
            if (bal.balance > 0) {
              const carryForwardAmount = Math.min(bal.balance, maxCarryForward);
              carryForwardBalances[bal.leaveType] = carryForwardAmount;
            }
          });
        }

        // Allocate for each leave type
        for (const [leaveType, annualDays] of Object.entries(leavePolicies)) {
          const existingBalance = employee.leaveBalances.find(
            (bal) => bal.leaveType === leaveType
          );

          // Calculate allocation
          let allocationDays = annualDays;

          // Apply prorated calculation for new joiners
          if (prorated && leaveType === 'ANNUAL') {
            allocationDays = calculateProratedLeave(
              annualDays,
              employee.startDate,
              allocationYear
            );
          }

          // Add carry-forward if applicable
          const carryForward = carryForwardBalances[leaveType] || 0;
          const totalAllocation = allocationDays + carryForward;

          if (existingBalance) {
            // Update existing balance
            await prisma.leaveBalance.update({
              where: { id: existingBalance.id },
              data: {
                balance: totalAllocation,
                updatedAt: new Date(),
              },
            });

            employeeAllocations.allocations.push({
              leaveType,
              allocated: allocationDays,
              carryForward,
              total: totalAllocation,
              status: 'updated',
            });
          } else {
            // Create new balance
            await prisma.leaveBalance.create({
              data: {
                tenantId: user.tenantId,
                employeeId: employee.id,
                leaveType: leaveType as any,
                balance: totalAllocation,
                year: allocationYear,
              },
            });

            employeeAllocations.allocations.push({
              leaveType,
              allocated: allocationDays,
              carryForward,
              total: totalAllocation,
              status: 'created',
            });
          }
        }

        allocations.push(employeeAllocations);
      } catch (error) {
        console.error(`Failed to allocate for employee ${employee.id}:`, error);
        errors.push({
          employeeId: employee.id,
          employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
          error: 'Allocation failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      year: allocationYear,
      totalEmployees: employees.length,
      successCount: allocations.length,
      errorCount: errors.length,
      allocations,
      errors,
      settings: {
        carryForwardEnabled: shouldCarryForward,
        maxCarryForwardDays: maxCarryForward,
        proratedForNewJoiners: prorated,
      },
    });
  } catch (error) {
    console.error('Error allocating leave:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to allocate leave balances' },
      { status: 500 }
    );
  }
}

// GET /api/admin/leave/allocate - Get allocation status and history
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user || (user.role !== 'ADMIN' && user.role !== 'HR')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    // Get all employees with their balances for the year
    const employees = await prisma.employee.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            employeeId: true,
          },
        },
        leaveBalances: {
          where: { year },
        },
      },
      orderBy: {
        user: {
          firstName: 'asc',
        },
      },
    });

    // Get tenant settings
    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: {
        leavePolicies: true,
        carryForwardLeave: true,
        maxCarryForwardDays: true,
        autoAllocateLeave: true,
        leaveAllocationDay: true,
      },
    });

    const allocationStatus = employees.map((employee) => ({
      employeeId: employee.id,
      employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
      email: employee.user.email,
      employeeNumber: employee.user.employeeId,
      startDate: employee.startDate,
      balances: employee.leaveBalances.map((bal) => ({
        leaveType: bal.leaveType,
        balance: bal.balance,
        year: bal.year,
        lastUpdated: bal.updatedAt,
      })),
      hasAllocation: employee.leaveBalances.length > 0,
    }));

    const stats = {
      totalEmployees: employees.length,
      withAllocation: employees.filter((e) => e.leaveBalances.length > 0).length,
      withoutAllocation: employees.filter((e) => e.leaveBalances.length === 0).length,
    };

    return NextResponse.json({
      success: true,
      year,
      stats,
      employees: allocationStatus,
      settings: tenantSettings,
    });
  } catch (error) {
    console.error('Error fetching allocation status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch allocation status' },
      { status: 500 }
    );
  }
}
