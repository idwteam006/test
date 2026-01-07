import { prisma } from '../lib/prisma';

/**
 * Script to fix duplicate employee numbers
 * This will identify and fix any employees with duplicate numbers
 */
async function fixDuplicateEmployees() {
  try {
    console.log('🔍 Checking for duplicate employee numbers...\n');

    // Find all employee numbers with duplicates
    const duplicates = await prisma.$queryRaw<Array<{
      employeeNumber: string;
      count: bigint;
    }>>`
      SELECT
        "employeeNumber",
        COUNT(*) as count
      FROM "Employee"
      GROUP BY "employeeNumber"
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;

    if (duplicates.length === 0) {
      console.log('✅ No duplicate employee numbers found!\n');

      // Show current employee numbers
      const employees = await prisma.employee.findMany({
        select: {
          employeeNumber: true,
          createdAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      console.log('📋 Last 10 employees:');
      employees.forEach((emp) => {
        console.log(`   ${emp.employeeNumber} - ${emp.user?.firstName} ${emp.user?.lastName} (${new Date(emp.createdAt).toLocaleString()})`);
      });

      return;
    }

    console.log(`❌ Found ${duplicates.length} duplicate employee numbers:\n`);

    for (const dup of duplicates) {
      console.log(`   ${dup.employeeNumber}: ${Number(dup.count)} duplicates`);
    }

    console.log('\n🔧 Fixing duplicates...\n');

    // For each duplicate, keep the oldest and regenerate numbers for the rest
    for (const dup of duplicates) {
      const employees = await prisma.employee.findMany({
        where: { employeeNumber: dup.employeeNumber },
        orderBy: { createdAt: 'asc' },
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

      console.log(`\n📝 Fixing "${dup.employeeNumber}" (${employees.length} duplicates):`);

      // Keep the first one (oldest)
      const [original, ...duplicatesToFix] = employees;
      console.log(`   ✅ Keeping: ${original.user?.firstName} ${original.user?.lastName} (${original.employeeNumber})`);

      // Fix the rest
      for (let i = 0; i < duplicatesToFix.length; i++) {
        const emp = duplicatesToFix[i];

        // Generate a new unique employee number
        const createdDate = new Date(emp.createdAt);
        const dateStr = createdDate.toISOString().slice(0, 10).replace(/-/g, '');

        // Get count for that day
        const dayStart = new Date(createdDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(createdDate);
        dayEnd.setHours(23, 59, 59, 999);

        const countOnDay = await prisma.employee.count({
          where: {
            tenantId: emp.tenantId,
            createdAt: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        });

        // Use a higher number to ensure uniqueness
        const newNumber = `EMP-${dateStr}-${String(countOnDay + i + 1).padStart(3, '0')}`;

        // Update employee
        await prisma.employee.update({
          where: { id: emp.id },
          data: { employeeNumber: newNumber },
        });

        console.log(`   🔄 Updated: ${emp.user?.firstName} ${emp.user?.lastName}`);
        console.log(`      Old: ${emp.employeeNumber} → New: ${newNumber}`);
      }
    }

    console.log('\n✅ All duplicates fixed!\n');

    // Verify no more duplicates
    const remainingDuplicates = await prisma.$queryRaw<Array<{
      employeeNumber: string;
      count: bigint;
    }>>`
      SELECT
        "employeeNumber",
        COUNT(*) as count
      FROM "Employee"
      GROUP BY "employeeNumber"
      HAVING COUNT(*) > 1
    `;

    if (remainingDuplicates.length === 0) {
      console.log('✅ Verification: No duplicates remaining!\n');
    } else {
      console.log('⚠️  Warning: Some duplicates still exist:\n');
      remainingDuplicates.forEach((dup) => {
        console.log(`   ${dup.employeeNumber}: ${Number(dup.count)} duplicates`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

fixDuplicateEmployees();
