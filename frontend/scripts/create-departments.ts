import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDepartments() {
  try {
    // Get ALL active tenants
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    });

    if (tenants.length === 0) {
      console.log('No active tenants found');
      return;
    }

    console.log(`Found ${tenants.length} active tenant(s)\n`);

    const defaultDepartments = [
      'Engineering',
      'Human Resources',
      'Finance',
      'Marketing',
      'Sales',
      'Operations',
      'Customer Support',
      'Product Management'
    ];

    // Create departments for each tenant
    for (const tenant of tenants) {
      console.log(`\n🏢 Processing tenant: ${tenant.name} (${tenant.id})`);
      console.log('─'.repeat(60));

      for (const name of defaultDepartments) {
        // Check if department already exists
        const existing = await prisma.department.findFirst({
          where: {
            tenantId: tenant.id,
            name: { equals: name, mode: 'insensitive' }
          }
        });

        if (existing) {
          console.log(`  ✓ Already exists: ${name}`);
        } else {
          const dept = await prisma.department.create({
            data: {
              name,
              tenantId: tenant.id
            }
          });
          console.log(`  ✅ Created: ${name} (${dept.id})`);
        }
      }

      // Show all departments for this tenant
      const allDepts = await prisma.department.findMany({
        where: { tenantId: tenant.id },
        include: {
          _count: {
            select: { employees: true, users: true }
          }
        },
        orderBy: { name: 'asc' }
      });

      console.log(`\n  📋 Total departments for ${tenant.name}: ${allDepts.length}`);
      allDepts.forEach(dept => {
        console.log(`     - ${dept.name} | Employees: ${dept._count.employees} | Users: ${dept._count.users}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Department creation completed for all tenants!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error creating departments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDepartments();
