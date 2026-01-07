const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllUsers() {
  try {
    console.log('📧 ALL LOGIN EMAILS BY ROLE\n');
    console.log('='.repeat(80));

    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        employeeId: true,
        tenant: {
          select: {
            name: true,
          }
        },
        department: {
          select: {
            name: true,
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { firstName: 'asc' }
      ]
    });

    console.log(`\nFound ${users.length} ACTIVE users\n`);

    // Group by role
    const byRole = users.reduce((acc, user) => {
      if (!acc[user.role]) acc[user.role] = [];
      acc[user.role].push(user);
      return acc;
    }, {});

    // Display by role
    ['ADMIN', 'MANAGER', 'EMPLOYEE', 'ACCOUNTANT', 'HR'].forEach(role => {
      if (byRole[role]) {
        console.log(`\n🔹 ${role} ROLE (${byRole[role].length} users)`);
        console.log('-'.repeat(80));

        byRole[role].forEach((user, idx) => {
          console.log(`\n${idx + 1}. ${user.firstName} ${user.lastName}`);
          console.log(`   📧 Email: ${user.email}`);
          console.log(`   🏢 Tenant: ${user.tenant.name}`);
          console.log(`   🏭 Department: ${user.department?.name || 'N/A'}`);
          console.log(`   🆔 Employee ID: ${user.employeeId || 'N/A'}`);
          console.log(`   ✅ Status: ${user.status}`);
        });
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n🔑 DEVELOPMENT MODE LOGIN:');
    console.log('   OTP Code: 123456');
    console.log('   Works for ALL users listed above\n');

    console.log('📝 QUICK REFERENCE:');
    console.log('-'.repeat(80));

    // Admins
    const admins = byRole['ADMIN'] || [];
    if (admins.length > 0) {
      console.log('\nADMINS:');
      admins.forEach(u => console.log(`  • ${u.email}`));
    }

    // Managers
    const managers = byRole['MANAGER'] || [];
    if (managers.length > 0) {
      console.log('\nMANAGERS:');
      managers.forEach(u => console.log(`  • ${u.email}`));
    }

    // Employees
    const employees = byRole['EMPLOYEE'] || [];
    if (employees.length > 0) {
      console.log('\nEMPLOYEES:');
      employees.forEach(u => console.log(`  • ${u.email}`));
    }

    // HR
    const hr = byRole['HR'] || [];
    if (hr.length > 0) {
      console.log('\nHR:');
      hr.forEach(u => console.log(`  • ${u.email}`));
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAllUsers();
