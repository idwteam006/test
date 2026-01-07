const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEmployeeStatus() {
  console.log('🔍 Checking amy.barnes@demo.com...\n');

  const amy = await prisma.user.findUnique({
    where: { email: 'amy.barnes@demo.com' },
    include: {
      employee: true,
      employeeProfile: {
        select: {
          id: true,
          dateOfBirth: true,
          personalEmail: true,
          highestQualification: true,
          yearsOfExperience: true
        }
      },
      department: true
    }
  });

  if (!amy) {
    console.log('❌ amy.barnes@demo.com NOT FOUND!\n');
  } else {
    console.log('✅ User Found:');
    console.log('   Email:', amy.email);
    console.log('   Name:', amy.firstName, amy.lastName);
    console.log('   Role:', amy.role);
    console.log('   Status:', amy.status);
    console.log('   Employee ID:', amy.employeeId);
    console.log('   Department:', amy.department?.name || 'N/A');
    console.log('\n📋 Employee Record:', amy.employee ? 'EXISTS' : 'MISSING');
    if (amy.employee) {
      console.log('   Job Title:', amy.employee.jobTitle);
      console.log('   Employee Number:', amy.employee.employeeNumber);
      console.log('   Employment Type:', amy.employee.employmentType);
      console.log('   Employee Status:', amy.employee.status);
    }
    console.log('\n👤 Employee Profile:', amy.employeeProfile ? 'EXISTS' : 'MISSING');
    if (amy.employeeProfile) {
      console.log('   Education:', amy.employeeProfile.highestQualification);
      console.log('   Experience:', amy.employeeProfile.yearsOfExperience, 'years');
      console.log('   Personal Email:', amy.employeeProfile.personalEmail);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n🔍 Checking ALL seeded employee accounts status...\n');

  const allEmployees = await prisma.user.findMany({
    where: {
      email: { contains: '@demo.com' },
      role: 'EMPLOYEE'
    },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      employeeId: true,
      employee: {
        select: {
          status: true
        }
      }
    },
    orderBy: { email: 'asc' }
  });

  console.log('Total EMPLOYEE accounts:', allEmployees.length);
  console.log('');

  const activeUsers = allEmployees.filter(e => e.status === 'ACTIVE');
  const inactiveUsers = allEmployees.filter(e => e.status !== 'ACTIVE');

  console.log('✅ ACTIVE:', activeUsers.length);
  console.log('❌ INACTIVE:', inactiveUsers.length);

  if (inactiveUsers.length > 0) {
    console.log('\n⚠️  INACTIVE Users:');
    inactiveUsers.forEach(u => {
      console.log('   •', u.email, '-', u.status);
    });
  }

  console.log('\n📊 Sample Active Employees:');
  activeUsers.slice(0, 10).forEach((u, idx) => {
    console.log('   ' + (idx + 1) + '.', u.email, '- User:', u.status, '| Employee:', u.employee?.status || 'N/A');
  });

  if (activeUsers.length > 10) {
    console.log('   ... and', activeUsers.length - 10, 'more');
  }
}

checkEmployeeStatus()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
