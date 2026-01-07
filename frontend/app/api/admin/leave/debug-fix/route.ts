import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

// Default leave policies
const DEFAULT_LEAVE_POLICIES: Record<string, number> = {
  ANNUAL: 20,
  SICK: 10,
  PERSONAL: 5,
  MATERNITY: 90,
  PATERNITY: 15,
  UNPAID: 0,
};

// GET /api/admin/leave/debug-fix - Check and optionally fix leave balances
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow ADMIN role
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fix = searchParams.get('fix') === 'true';
    const targetEmail = searchParams.get('email') || user.email;

    console.log(`[Debug Fix] Checking balances for email: ${targetEmail}, fix=${fix}`);

    // Find user by email
    const targetUser = await prisma.user.findFirst({
      where: {
        email: targetEmail,
        tenantId: user.tenantId,
      },
      select: { id: true, email: true, tenantId: true }
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Find employee
    const employee = await prisma.employee.findUnique({
      where: { userId: targetUser.id },
      select: { id: true }
    });

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee record not found' }, { status: 404 });
    }

    // Get all leave balances for this employee
    const balances = await prisma.leaveBalance.findMany({
      where: { employeeId: employee.id },
      orderBy: [{ year: 'asc' }, { leaveType: 'asc' }]
    });

    const results: any[] = [];
    const fixes: any[] = [];

    for (const bal of balances) {
      const isProblematic = bal.balance < 0;
      const record = {
        id: bal.id,
        year: bal.year,
        leaveType: bal.leaveType,
        balance: bal.balance,
        updatedAt: bal.updatedAt,
        isProblematic,
      };
      results.push(record);

      if (isProblematic && fix) {
        const newBalance = DEFAULT_LEAVE_POLICIES[bal.leaveType] || 0;

        await prisma.leaveBalance.update({
          where: { id: bal.id },
          data: {
            balance: newBalance,
            updatedAt: new Date()
          }
        });

        // Verify
        const updated = await prisma.leaveBalance.findUnique({
          where: { id: bal.id }
        });

        fixes.push({
          id: bal.id,
          year: bal.year,
          leaveType: bal.leaveType,
          oldBalance: bal.balance,
          newBalance: updated?.balance,
          success: updated?.balance === newBalance
        });
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        email: targetUser.email,
        employeeId: employee.id,
      },
      balanceCount: balances.length,
      problematicCount: results.filter(r => r.isProblematic).length,
      balances: results,
      fixes: fix ? fixes : undefined,
      message: fix ? `Fixed ${fixes.length} problematic balance(s)` : 'Use ?fix=true to fix problematic balances'
    });
  } catch (error) {
    console.error('Error in debug-fix:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check/fix balances' },
      { status: 500 }
    );
  }
}
