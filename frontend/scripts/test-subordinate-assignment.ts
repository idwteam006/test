import { prisma } from '../lib/prisma';

/**
 * Test script to demonstrate subordinate auto-assignment logic
 * This simulates what happens when a project is created with a project manager
 */
async function testSubordinateAssignment() {
  try {
    console.log('Testing subordinate auto-assignment logic\n');

    const managerEmail = 'info@addtechno.com';

    // Fetch manager with subordinates (same query used in API)
    const manager = await prisma.user.findFirst({
      where: {
        email: managerEmail,
      },
      include: {
        employee: {
          include: {
            subordinates: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!manager || !manager.employee) {
      console.log('❌ Manager not found or has no employee record');
      return;
    }

    console.log('✅ Manager Found:');
    console.log(`   Name: ${manager.firstName} ${manager.lastName}`);
    console.log(`   Email: ${manager.email}`);
    console.log(`   Employee ID: ${manager.employee.id}`);
    console.log();

    const subordinates = manager.employee.subordinates || [];

    if (subordinates.length === 0) {
      console.log('ℹ️  No subordinates to auto-assign');
      return;
    }

    console.log(`✅ Found ${subordinates.length} subordinate(s) to auto-assign:\n`);

    subordinates.forEach((subordinate, index) => {
      console.log(`${index + 1}. ${subordinate.user.firstName} ${subordinate.user.lastName}`);
      console.log(`   Employee ID: ${subordinate.id}`);
      console.log(`   Email: ${subordinate.user.email}`);
      console.log(`   → Will be assigned as "Team Member" with default rate 0`);
      console.log();
    });

    console.log('\n📊 Summary:');
    console.log(`   Project Manager: ${manager.firstName} ${manager.lastName}`);
    console.log(`   Total team members (including manager): ${subordinates.length + 1}`);
    console.log(`   Auto-assigned subordinates: ${subordinates.length}`);
    console.log('\n✨ All subordinates will be automatically assigned when project is created!');

  } catch (error) {
    console.error('Error testing subordinate assignment:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSubordinateAssignment();
