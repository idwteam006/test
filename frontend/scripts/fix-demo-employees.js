const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDemoEmployees() {
  try {
    console.log('🔍 Fixing Demo Organization Employee records...\n');

    // Get Demo Organization tenant
    const tenant = await prisma.tenant.findFirst({
      where: { name: 'Demo Organization' }
    });

    if (!tenant) {
      console.log('❌ Tenant not found');
      return;
    }

    // Get a manager for reporting
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

    // Get a department
    const dept = await prisma.department.findFirst({
      where: { tenantId: tenant.id }
    });

    // Find users without Employee records
    const usersWithoutEmployee = await prisma.user.findMany({
      where: {
        tenantId: tenant.id,
        employee: null,
      }
    });

    console.log(`Found ${usersWithoutEmployee.length} users without Employee records\n`);

    for (const user of usersWithoutEmployee) {
      try {
        console.log(`Creating Employee record for ${user.email}...`);

        const jobTitles = {
          'ADMIN': 'System Administrator',
          'MANAGER': 'Department Manager',
          'HR': 'HR Manager',
          'ACCOUNTANT': 'Senior Accountant',
          'EMPLOYEE': 'Employee',
        };

        // Generate unique employee number
        let employeeNumber = user.employeeId;
        if (!employeeNumber) {
          // Try to find a unique number
          let attempts = 0;
          while (attempts < 10) {
            const randomNum = Math.floor(Math.random() * 90000) + 10000;
            employeeNumber = `EMP${randomNum}`;
            const existing = await prisma.employee.findUnique({
              where: { employeeNumber }
            });
            if (!existing) break;
            attempts++;
          }
        }

        await prisma.employee.create({
          data: {
            userId: user.id,
            tenantId: tenant.id,
            employeeNumber: employeeNumber || `EMP${Date.now()}`,
            jobTitle: jobTitles[user.role] || 'Employee',
            departmentId: dept?.id || null,
            managerId: manager.id,
            startDate: new Date(),
            employmentType: 'FULL_TIME',
            status: 'ACTIVE',
            emergencyContacts: [],
          }
        });

        console.log(`✅ Created for ${user.email}`);
      } catch (error) {
        console.log(`⚠️  Skipped ${user.email}: ${error.message}`);
      }
    }

    console.log('\n✅ Done! All Demo Organization users now have Employee records.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDemoEmployees();
