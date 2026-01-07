const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showDemoAccounts() {
  console.log('🔐 DEMO LOGIN ACCOUNTS\n');
  console.log('='.repeat(80));
  console.log('\n📧 OTP Code (Development Mode): 123456\n');
  console.log('='.repeat(80));

  const roles = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'EMPLOYEE'];

  for (const role of roles) {
    console.log(`\n👤 ${role} ACCOUNTS`);
    console.log('-'.repeat(80));

    const users = await prisma.user.findMany({
      where: {
        role: role,
        status: 'ACTIVE'
      },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        department: {
          select: {
            name: true,
          }
        },
        tenant: {
          select: {
            name: true,
          }
        }
      },
      orderBy: {
        email: 'asc',
      },
      take: 5
    });

    if (users.length === 0) {
      console.log(`   ❌ No active ${role} users found\n`);
    } else {
      users.forEach((user, idx) => {
        console.log(`   ${idx + 1}. Email: ${user.email}`);
        console.log(`      Name: ${user.firstName} ${user.lastName}`);
        console.log(`      Employee ID: ${user.employeeId || 'N/A'}`);
        console.log(`      Department: ${user.department?.name || 'N/A'}`);
        console.log(`      Tenant: ${user.tenant.name}`);
        console.log('');
      });

      if (users.length === 5) {
        const total = await prisma.user.count({
          where: { role: role, status: 'ACTIVE' }
        });
        if (total > 5) {
          console.log(`   ... and ${total - 5} more ${role} users\n`);
        }
      }
    }
  }

  console.log('='.repeat(80));
  console.log('\n💡 How to Login:');
  console.log('   1. Go to: http://localhost:3000/auth/login');
  console.log('   2. Enter any email from above');
  console.log('   3. Click "Request Code"');
  console.log('   4. Enter OTP: 123456');
  console.log('   5. Click "Verify Code"');
  console.log('\n='.repeat(80));
}

showDemoAccounts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
