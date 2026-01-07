import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function revertAdminUsers() {
  const emails = ['chetan.s@idwteam.com', 'nilesh.s@idwteam.com'];

  console.log('🔄 Reverting admin users to pure ADMIN role (removing employee records)...\n');

  for (const email of emails) {
    console.log('═'.repeat(70));
    console.log(`Processing: ${email}`);
    console.log('═'.repeat(70));

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        employee: true,
      }
    });

    if (!user) {
      console.log('❌ User not found\n');
      continue;
    }

    console.log(`Current state:`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Has employee record: ${user.employee ? 'Yes' : 'No'}`);
    console.log(`  Employee ID: ${user.employeeId || 'null'}`);
    console.log(`  Department ID: ${user.departmentId || 'null'}`);

    // Delete employee record if exists
    if (user.employee) {
      console.log('\n🗑️  Deleting employee record...');

      // Delete team memberships first
      await prisma.teamMember.deleteMany({
        where: { employeeId: user.employee.id }
      });
      console.log('  ✓ Deleted team memberships');

      // Delete employee record
      await prisma.employee.delete({
        where: { id: user.employee.id }
      });
      console.log('  ✓ Deleted employee record');
    }

    // Update user to remove employee and department references
    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'ADMIN',
        employeeId: null,
        departmentId: null,
      }
    });
    console.log('✓ Updated user: role=ADMIN, employeeId=null, departmentId=null');

    // Verify final state
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        role: true,
        employeeId: true,
        departmentId: true,
      }
    });

    console.log('\n✅ Final state:');
    console.log(`  Role: ${updatedUser?.role}`);
    console.log(`  Employee ID: ${updatedUser?.employeeId || 'null'}`);
    console.log(`  Department ID: ${updatedUser?.departmentId || 'null'}`);
    console.log();
  }

  console.log('═'.repeat(70));
  console.log('✅ Completed! Both users are now pure ADMINs without employee records.');
  console.log('═'.repeat(70));

  await prisma.$disconnect();
}

revertAdminUsers().catch(console.error);
