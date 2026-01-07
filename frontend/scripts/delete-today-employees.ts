import { prisma } from '../lib/prisma';

/**
 * Delete all employees created today for testing
 * This allows clean testing of the employee creation flow
 */
async function deleteTodayEmployees() {
  try {
    console.log('🔍 Finding employees created today...\n');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Find employees created today
    const employees = await prisma.employee.findMany({
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (employees.length === 0) {
      console.log('✅ No employees created today. Database is clean.\n');
      return;
    }

    console.log(`Found ${employees.length} employee(s) created today:\n`);

    for (const emp of employees) {
      console.log(`  - ${emp.employeeNumber}: ${emp.user?.firstName} ${emp.user?.lastName} (${emp.user?.email})`);
    }

    console.log('\n🗑️  Deleting employees and their users...\n');

    // Delete in transaction
    for (const emp of employees) {
      await prisma.$transaction(async (tx) => {
        // Delete employee
        await tx.employee.delete({
          where: { id: emp.id },
        });

        // Delete user if exists
        if (emp.userId) {
          await tx.user.delete({
            where: { id: emp.userId },
          });
        }
      });

      console.log(`  ✅ Deleted: ${emp.user?.email}`);
    }

    console.log('\n✅ All employees created today have been deleted!');
    console.log('You can now create new users without conflicts.\n');

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

deleteTodayEmployees();
