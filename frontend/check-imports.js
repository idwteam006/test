const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkImports() {
  try {
    console.log('='.repeat(80));
    console.log('RECENT SYSTEM USERS & EMPLOYEE IMPORTS ANALYSIS');
    console.log('='.repeat(80));

    // Get all users created in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentUsers = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: oneDayAgo,
        },
      },
      include: {
        department: {
          select: {
            name: true,
          },
        },
        employee: {
          select: {
            employeeNumber: true,
            jobTitle: true,
            employmentType: true,
            status: true,
          },
        },
        tenant: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`\n📊 Total users created in last 24 hours: ${recentUsers.length}\n`);

    if (recentUsers.length === 0) {
      console.log('No recent imports found.\n');
      return;
    }

    // Group by tenant
    const byTenant = {};
    recentUsers.forEach(user => {
      const tenantName = user.tenant?.name || 'Unknown';
      if (!byTenant[tenantName]) {
        byTenant[tenantName] = [];
      }
      byTenant[tenantName].push(user);
    });

    for (const [tenantName, users] of Object.entries(byTenant)) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`TENANT: ${tenantName}`);
      console.log(`${'='.repeat(80)}\n`);

      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   Department: ${user.department?.name || 'Not assigned'}`);
        console.log(`   Email Verified: ${user.emailVerified ? 'Yes' : 'No'}`);

        if (user.employee) {
          console.log(`   Employee Number: ${user.employee.employeeNumber}`);
          console.log(`   Job Title: ${user.employee.jobTitle}`);
          console.log(`   Employment Type: ${user.employee.employmentType}`);
          console.log(`   Employee Status: ${user.employee.status}`);
        } else {
          console.log(`   Employee Record: Not created (System user only)`);
        }

        console.log(`   Created: ${user.createdAt.toLocaleString()}`);
        console.log('');
      });
    }

    // Statistics
    console.log(`\n${'='.repeat(80)}`);
    console.log('IMPORT STATISTICS');
    console.log(`${'='.repeat(80)}\n`);

    const withEmployee = recentUsers.filter(u => u.employee).length;
    const withoutEmployee = recentUsers.length - withEmployee;
    const byRole = {};
    const byDepartment = {};
    const byStatus = {};

    recentUsers.forEach(user => {
      // By role
      byRole[user.role] = (byRole[user.role] || 0) + 1;

      // By department
      const dept = user.department?.name || 'No Department';
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;

      // By status
      byStatus[user.status] = (byStatus[user.status] || 0) + 1;
    });

    console.log('User Type Breakdown:');
    console.log(`  System Users Only: ${withoutEmployee}`);
    console.log(`  Full Employees: ${withEmployee}\n`);

    console.log('By Role:');
    Object.entries(byRole).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`);
    });

    console.log('\nBy Department:');
    Object.entries(byDepartment).forEach(([dept, count]) => {
      console.log(`  ${dept}: ${count}`);
    });

    console.log('\nBy Status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Check for potential issues
    console.log(`\n${'='.repeat(80)}`);
    console.log('POTENTIAL ISSUES');
    console.log(`${'='.repeat(80)}\n`);

    const noDepartment = recentUsers.filter(u => !u.departmentId).length;
    const noEmployee = recentUsers.filter(u => !u.employee).length;
    const notVerified = recentUsers.filter(u => !u.emailVerified).length;
    const inactive = recentUsers.filter(u => u.status !== 'ACTIVE').length;

    if (noDepartment > 0) {
      console.log(`⚠️  ${noDepartment} user(s) without department assignment`);
    }
    if (noEmployee > 0) {
      console.log(`ℹ️  ${noEmployee} system user(s) without employee records (may be intentional)`);
    }
    if (notVerified > 0) {
      console.log(`ℹ️  ${notVerified} user(s) with unverified email (normal for new imports)`);
    }
    if (inactive > 0) {
      console.log(`⚠️  ${inactive} user(s) with non-ACTIVE status`);
    }

    if (noDepartment === 0 && inactive === 0) {
      console.log('✅ No issues found! All imports look good.');
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkImports();
