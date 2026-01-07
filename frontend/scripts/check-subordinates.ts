import { prisma } from '../lib/prisma';

async function checkSubordinates() {
  try {
    console.log('Checking subordinates for user: info@addtechno.com\n');

    // Find user with employee and subordinates
    const user = await prisma.user.findUnique({
      where: {
        email: 'info@addtechno.com',
      },
      include: {
        employee: {
          include: {
            subordinates: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      console.log('❌ User not found with email: info@addtechno.com');
      return;
    }

    console.log('✅ User Found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log();

    if (!user.employee) {
      console.log('❌ User does not have an employee record');
      return;
    }

    console.log('✅ Employee Record:');
    console.log(`   Employee ID: ${user.employee.id}`);
    console.log(`   Employee Number: ${user.employee.employeeNumber || 'N/A'}`);
    console.log();

    const subordinates = user.employee.subordinates || [];

    if (subordinates.length === 0) {
      console.log('ℹ️  No subordinates found for this user');
      return;
    }

    console.log(`✅ Found ${subordinates.length} subordinate(s):\n`);

    subordinates.forEach((subordinate, index) => {
      console.log(`${index + 1}. ${subordinate.user.firstName} ${subordinate.user.lastName}`);
      console.log(`   Employee ID: ${subordinate.id}`);
      console.log(`   User ID: ${subordinate.user.id}`);
      console.log(`   Email: ${subordinate.user.email}`);
      console.log(`   Role: ${subordinate.user.role}`);
      console.log(`   Employee Number: ${subordinate.employeeNumber || 'N/A'}`);
      console.log();
    });

    console.log(`\n📊 Summary: User has ${subordinates.length} direct subordinate(s)`);

  } catch (error) {
    console.error('Error checking subordinates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubordinates();
