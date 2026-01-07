const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function checkAdminUsers() {
  console.log('🔍 Checking Admin/HR/Manager Users...\n');

  try {
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        employeeId: true,
        createdAt: true,
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
      orderBy: {
        role: 'asc',
      }
    });

    console.log(`Found ${users.length} users with admin privileges\n`);
    console.log('='.repeat(80));

    users.forEach((user, idx) => {
      console.log(`\n${idx + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Employee ID: ${user.employeeId}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Tenant: ${user.tenant.name}`);
      console.log(`   Department: ${user.department?.name || 'N/A'}`);
      console.log(`   Created: ${user.createdAt.toISOString().split('T')[0]}`);

      if (user.status === 'ACTIVE') {
        console.log(`   ✅ Can login to application`);
      } else {
        console.log(`   ⚠️  Cannot login - Status: ${user.status}`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Summary:\n');

    // Count by role
    const byRole = {};
    users.forEach(u => {
      byRole[u.role] = (byRole[u.role] || 0) + 1;
    });

    console.log('By Role:');
    Object.keys(byRole).sort().forEach(role => {
      console.log(`  ${role}: ${byRole[role]}`);
    });

    // Count by status
    const byStatus = {};
    users.forEach(u => {
      byStatus[u.status] = (byStatus[u.status] || 0) + 1;
    });

    console.log('\nBy Status:');
    Object.keys(byStatus).sort().forEach(status => {
      console.log(`  ${status}: ${byStatus[status]}`);
    });

    // Active users
    const activeUsers = users.filter(u => u.status === 'ACTIVE');
    console.log(`\n✅ Active users who can login: ${activeUsers.length}`);

    if (activeUsers.length > 0) {
      console.log('\n📧 Login Credentials (Email + OTP):');
      activeUsers.forEach(u => {
        console.log(`\n  ${u.role}:`);
        console.log(`    Email: ${u.email}`);
        console.log(`    Name: ${u.firstName} ${u.lastName}`);
      });

      console.log('\n💡 Login Instructions:');
      console.log('   1. Go to: https://zenora-alpha.vercel.app/auth/login');
      console.log('   2. Enter one of the emails above');
      console.log('   3. Check email for OTP code');
      console.log('   4. Enter OTP to login');
    } else {
      console.log('\n⚠️  No active admin users found!');
      console.log('   You need to activate at least one admin user to login.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUsers();