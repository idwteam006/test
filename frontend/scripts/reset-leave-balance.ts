import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default leave policies (fallback)
const DEFAULT_LEAVE_POLICIES: Record<string, number> = {
  ANNUAL: 20,
  SICK: 10,
  PERSONAL: 5,
  MATERNITY: 90,
  PATERNITY: 15,
  UNPAID: 0,
};

async function resetLeaveBalance() {
  const email = 'info@addtechno.com';

  try {
    // Find the user
    const user = await prisma.user.findFirst({
      where: { email },
      include: { employee: true },
    });

    if (!user) {
      console.log('User not found:', email);
      await prisma.$disconnect();
      return;
    }

    if (!user.employee) {
      console.log('No employee record for user:', email);
      await prisma.$disconnect();
      return;
    }

    console.log('=== USER INFO ===');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Name:', user.firstName, user.lastName);
    console.log('Tenant ID:', user.tenantId);
    console.log('Employee ID:', user.employee.id);

    // Get tenant leave policies
    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: { leavePolicies: true },
    });

    const orgLeavePolicies = {
      ...DEFAULT_LEAVE_POLICIES,
      ...(tenantSettings?.leavePolicies as Record<string, number> || {}),
    };

    console.log('\n=== ORG LEAVE POLICIES ===');
    console.log(orgLeavePolicies);

    // Get current balances
    const currentYear = new Date().getFullYear();
    const existingBalances = await prisma.leaveBalance.findMany({
      where: {
        employeeId: user.employee.id,
        year: currentYear,
      },
    });

    console.log('\n=== CURRENT BALANCES (before reset) ===');
    existingBalances.forEach(b => {
      console.log(`${b.leaveType}: ${b.balance} days`);
    });

    // Reset all leave types for current year
    const leaveTypes = ['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'UNPAID'];
    const results: any[] = [];

    for (const leaveType of leaveTypes) {
      const defaultBalance = orgLeavePolicies[leaveType] ?? 0;
      const existing = existingBalances.find(b => b.leaveType === leaveType);

      if (existing) {
        // Update existing balance to org default
        await prisma.leaveBalance.update({
          where: { id: existing.id },
          data: {
            balance: defaultBalance,
            updatedAt: new Date(),
          },
        });
        results.push({
          leaveType,
          previousBalance: existing.balance,
          newBalance: defaultBalance,
          status: 'reset',
        });
      } else {
        // Create new balance with org default
        await prisma.leaveBalance.create({
          data: {
            tenantId: user.tenantId,
            employeeId: user.employee.id,
            leaveType: leaveType as any,
            balance: defaultBalance,
            year: currentYear,
          },
        });
        results.push({
          leaveType,
          previousBalance: null,
          newBalance: defaultBalance,
          status: 'created',
        });
      }
    }

    console.log('\n=== RESET RESULTS ===');
    results.forEach(r => {
      const prev = r.previousBalance !== null ? r.previousBalance : 'N/A';
      console.log(`${r.leaveType}: ${prev} -> ${r.newBalance} (${r.status})`);
    });

    // Verify the new balances
    const newBalances = await prisma.leaveBalance.findMany({
      where: {
        employeeId: user.employee.id,
        year: currentYear,
      },
    });

    console.log('\n=== NEW BALANCES (after reset) ===');
    newBalances.forEach(b => {
      console.log(`${b.leaveType}: ${b.balance} days`);
    });

    console.log('\n✅ Leave balance reset successfully for', user.firstName, user.lastName);

  } catch (error) {
    console.error('Error resetting leave balance:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetLeaveBalance();
