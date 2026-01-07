import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

// Default leave policies (fallback if tenant settings don't have them)
const DEFAULT_LEAVE_POLICIES = {
  ANNUAL: 20,
  SICK: 10,
  PERSONAL: 5,
  MATERNITY: 90,
  PATERNITY: 15,
  UNPAID: 0,
};

// GET /api/employee/leave/balance - Fetch employee's leave balances
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const currentYear = new Date().getFullYear();
    const year = searchParams.get('year') || currentYear.toString();
    const yearNum = parseInt(year);

    console.log(`[Leave Balance] Fetching balances - UserId: ${user.id}, Year: ${yearNum}`);

    // Get employee record
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee record not found' }, { status: 404 });
    }

    // Get tenant settings to fetch organization-wide leave policies
    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: { leavePolicies: true },
    });

    // Merge tenant leave policies with defaults
    const orgLeavePolicies = {
      ...DEFAULT_LEAVE_POLICIES,
      ...(tenantSettings?.leavePolicies as Record<string, number> || {}),
    };

    // Get any existing leave balances for the year AND next year (to catch problematic future balances)
    const nextYear = yearNum + 1;
    const existingBalances = await prisma.leaveBalance.findMany({
      where: {
        employeeId: employee.id,
        tenantId: user.tenantId,
        year: { in: [yearNum, nextYear] },
      },
      orderBy: [
        { year: 'asc' },
        { leaveType: 'asc' },
      ],
    });

    console.log(`[Leave Balance] Found ${existingBalances.length} balance records for years ${yearNum} and ${nextYear}`);

    // Create a map of existing balances, prioritizing problematic ones (negative/zero)
    // Key: leaveType, Value: worst balance record for that type
    const existingBalanceMap = new Map<string, typeof existingBalances[0]>();
    for (const bal of existingBalances) {
      const existing = existingBalanceMap.get(bal.leaveType);
      // If no existing record, or if this one is more problematic (negative < zero < positive)
      if (!existing || bal.balance < existing.balance) {
        existingBalanceMap.set(bal.leaveType, bal);
      }
    }

    // Log any problematic balances found
    for (const bal of existingBalances) {
      if (bal.balance < 0) {
        console.log(`[Leave Balance] WARNING: Negative balance found - ${bal.leaveType} for year ${bal.year}: ${bal.balance}`);
      }
    }

    // Build the complete balance list using org settings as defaults
    // Only show the main leave types that employees typically use
    const mainLeaveTypes = ['ANNUAL', 'SICK', 'PERSONAL'] as const;

    const balances = mainLeaveTypes.map((leaveType) => {
      const existing = existingBalanceMap.get(leaveType);
      if (existing) {
        // Return existing balance (which may have been decremented from approvals)
        // Add year info for display
        return {
          ...existing,
          displayYear: existing.year, // So UI knows which year this is from
        };
      }
      // Return org-wide default (virtual balance - not stored in DB until needed)
      return {
        id: `default-${leaveType}-${yearNum}`,
        tenantId: user.tenantId,
        employeeId: employee.id,
        leaveType,
        balance: orgLeavePolicies[leaveType] || 0,
        year: yearNum,
        createdAt: new Date(),
        updatedAt: new Date(),
        isOrgDefault: true, // Flag to indicate this is from org settings
      };
    });

    return NextResponse.json({
      success: true,
      balances,
      orgPolicies: orgLeavePolicies, // Include org policies for reference
    });
  } catch (error) {
    console.error('Error fetching leave balances:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leave balances' },
      { status: 500 }
    );
  }
}
