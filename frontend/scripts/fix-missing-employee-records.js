const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMissingEmployeeRecords() {
  try {
    console.log('🔍 Finding users without Employee records...\n');

    // Get ADD Technologies tenant
    const tenant = await prisma.tenant.findFirst({
      where: { name: 'ADD Technologies' }
    });

    if (!tenant) {
      console.log('❌ Tenant not found');
      return;
    }

    // Get manager for reporting
    const manager = await prisma.employee.findFirst({
      where: {
        user: {
          tenantId: tenant.id,
          role: 'MANAGER'
        }
      }
    });

    if (!manager) {
      console.log('❌ No manager found');
      return;
    }

    // Get Engineering department
    const engDept = await prisma.department.findFirst({
      where: {
        tenantId: tenant.id,
        name: 'Engineering'
      }
    });

    // Find all users without Employee records in this tenant
    const usersWithoutEmployee = await prisma.user.findMany({
      where: {
        tenantId: tenant.id,
        employee: null,
        role: { in: ['EMPLOYEE', 'ADMIN', 'MANAGER', 'HR', 'ACCOUNTANT'] }
      }
    });

    console.log(`Found ${usersWithoutEmployee.length} users without Employee records:\n`);

    for (const user of usersWithoutEmployee) {
      console.log(`Creating Employee record for ${user.email}...`);

      const jobTitleMap = {
        'alice.smith@addtechno.com': 'Senior Software Engineer',
        'bob.johnson@addtechno.com': 'Frontend Developer',
        'admin@addtechno.com': 'System Administrator',
      };

      await prisma.employee.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          employeeNumber: user.employeeId || `EMP${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          jobTitle: jobTitleMap[user.email] || 'Employee',
          departmentId: engDept?.id || null,
          managerId: manager.id,
          startDate: new Date(),
          employmentType: 'FULL_TIME',
          status: 'ACTIVE',
          emergencyContacts: [],
        }
      });

      console.log(`✅ Created Employee record for ${user.email}`);
    }

    console.log('\n✅ Done! All users now have Employee records.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissingEmployeeRecords();
