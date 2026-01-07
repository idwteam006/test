import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listDemoOrgEmployees() {
  // Find demo-org tenant
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'demo-org' },
    include: { settings: true }
  });

  if (!tenant) {
    console.log('Tenant demo-org not found');
    return;
  }

  const companyName = tenant.settings?.companyName || tenant.name;
  console.log('\n=== Demo Org Employees ===\n');
  console.log(`📌 ${companyName} (Tenant: ${tenant.slug})`);
  console.log('─'.repeat(60));

  const employees = await prisma.employee.findMany({
    where: { tenantId: tenant.id },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        }
      },
      department: {
        select: { name: true }
      },
      manager: {
        include: {
          user: {
            select: { firstName: true, lastName: true }
          }
        }
      }
    },
    orderBy: { employeeNumber: 'asc' }
  });

  console.log(`Total: ${employees.length} employees\n`);

  for (const emp of employees) {
    const managerName = emp.manager
      ? `${emp.manager.user.firstName} ${emp.manager.user.lastName}`
      : '—';

    console.log(`👤 ${emp.user.firstName} ${emp.user.lastName}`);
    console.log(`   📧 ${emp.user.email}`);
    console.log(`   🏷️  ID: ${emp.employeeNumber}`);
    console.log(`   💼 ${emp.jobTitle} | ${emp.department.name}`);
    console.log(`   🔑 Role: ${emp.user.role}`);
    console.log(`   👔 Reports to: ${managerName}`);
    console.log('');
  }

  await prisma.$disconnect();
}

listDemoOrgEmployees();
