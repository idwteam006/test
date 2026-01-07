const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:FlrOdwpwIfYJRYbKQkGmbFAgQWDxTHcZ@interchange.proxy.rlwy.net:34268/railway',
    },
  },
});

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      include: {
        employee: true,
        department: true,
        tenant: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log('\n=== USERS IN DATABASE ===');
    console.log(`Total users: ${users.length}\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Employee ID: ${user.employeeId || 'None'}`);
      console.log(`   Has Employee Record: ${user.employee ? 'Yes' : 'No'}`);
      if (user.employee) {
        console.log(`   Employee Number: ${user.employee.employeeNumber}`);
        console.log(`   Job Title: ${user.employee.jobTitle || 'Not set'}`);
      }
      console.log(`   Department: ${user.department?.name || 'Not set'}`);
      console.log(`   Tenant: ${user.tenant.name}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error checking users:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkUsers();
