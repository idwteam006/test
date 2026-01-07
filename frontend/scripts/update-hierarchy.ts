import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateHierarchy() {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'add-technologies' }
  });

  if (!tenant) {
    console.log('Tenant not found');
    return;
  }

  // Get key employees
  const getEmployee = async (email: string) => {
    return prisma.employee.findFirst({
      where: { tenantId: tenant.id, user: { email } },
      include: { user: { select: { firstName: true, lastName: true, email: true } } }
    });
  };

  const prakashRao = await getEmployee('admin4@addtechno.com');
  const adminAddtech = await getEmployee('info@addtechno.com');
  const techLead = await getEmployee('tech@addtechno.com');
  const bhupathi = await getEmployee('bhupathi@addtechno.com');
  const sneha = await getEmployee('sneha.pm@addtechno.com');
  const ravi = await getEmployee('ravi.sales@addtechno.com');
  const kiran = await getEmployee('kiran.ops@addtechno.com');

  if (!prakashRao || !adminAddtech) {
    console.log('Required employees not found');
    return;
  }

  console.log('Updating hierarchy...\n');

  // 1. Admin Addtech reports to Prakash Rao (already set)
  console.log('1. Admin Addtech reports to Prakash Rao - already set');

  // 2. Tech Lead reports to Admin Addtech
  if (techLead) {
    await prisma.employee.update({
      where: { id: techLead.id },
      data: { managerId: adminAddtech.id }
    });
    console.log('2. Tech Lead now reports to Admin Addtech');
  }

  // 3. Bhupathi Kumar (HR) reports to Admin Addtech
  if (bhupathi) {
    await prisma.employee.update({
      where: { id: bhupathi.id },
      data: { managerId: adminAddtech.id }
    });
    console.log('3. Bhupathi Kumar (HR) now reports to Admin Addtech');
  }

  // 4. Sneha Iyer reports to Admin Addtech
  if (sneha) {
    await prisma.employee.update({
      where: { id: sneha.id },
      data: { managerId: adminAddtech.id }
    });
    console.log('4. Sneha Iyer now reports to Admin Addtech');
  }

  // 5. Ravi Krishnan reports to Admin Addtech
  if (ravi) {
    await prisma.employee.update({
      where: { id: ravi.id },
      data: { managerId: adminAddtech.id }
    });
    console.log('5. Ravi Krishnan now reports to Admin Addtech');
  }

  // 6. Kiran Sharma reports to Admin Addtech
  if (kiran) {
    await prisma.employee.update({
      where: { id: kiran.id },
      data: { managerId: adminAddtech.id }
    });
    console.log('6. Kiran Sharma now reports to Admin Addtech');
  }

  console.log('\nHierarchy updated successfully!');
  await prisma.$disconnect();
}

updateHierarchy().catch(console.error);
