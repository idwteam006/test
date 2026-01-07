import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLeaveBalances() {
  const email = 'info@addtechno.com';

  console.log(`\n=== Checking leave balances for ${email} ===\n`);

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, tenantId: true }
  });

  if (!user) {
    console.log('User not found!');
    return;
  }

  console.log('User:', user);

  // Find employee
  const employee = await prisma.employee.findUnique({
    where: { userId: user.id },
    select: { id: true }
  });

  if (!employee) {
    console.log('Employee record not found!');
    return;
  }

  console.log('Employee ID:', employee.id);

  // Find all leave balances
  const balances = await prisma.leaveBalance.findMany({
    where: { employeeId: employee.id },
    orderBy: [{ year: 'asc' }, { leaveType: 'asc' }]
  });

  console.log(`\nFound ${balances.length} balance records:\n`);

  for (const bal of balances) {
    const isProblematic = bal.balance < 0 ? ' ⚠️ NEGATIVE' : '';
    console.log(`  Year ${bal.year} | ${bal.leaveType.padEnd(10)} | Balance: ${bal.balance}${isProblematic}`);
    console.log(`    ID: ${bal.id}`);
    console.log(`    Updated: ${bal.updatedAt}`);
  }

  // Now let's fix the problematic ones
  console.log('\n=== Fixing negative balances ===\n');

  const DEFAULT_BALANCES: Record<string, number> = {
    ANNUAL: 20,
    SICK: 10,
    PERSONAL: 5,
    MATERNITY: 90,
    PATERNITY: 15,
    UNPAID: 0,
  };

  for (const bal of balances) {
    if (bal.balance < 0) {
      const newBalance = DEFAULT_BALANCES[bal.leaveType] || 0;
      console.log(`Fixing ${bal.leaveType} for year ${bal.year}: ${bal.balance} -> ${newBalance}`);

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
      console.log(`  Verified: balance is now ${updated?.balance}`);
    }
  }

  console.log('\n=== Done ===\n');
}

checkLeaveBalances()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
