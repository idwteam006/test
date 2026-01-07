import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function activateTenants() {
  try {
    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
      },
    });

    console.log('\n=== Current Tenants ===');
    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.name} (${tenant.slug})`);
      console.log(`   Status: ${tenant.isActive ? '✅ Active' : '❌ Inactive'}`);
      console.log(`   ID: ${tenant.id}\n`);
    });

    // Activate all inactive tenants
    const result = await prisma.tenant.updateMany({
      where: { isActive: false },
      data: { isActive: true },
    });

    console.log(`\n✅ Activated ${result.count} tenant(s)`);

    // Show updated status
    const updatedTenants = await prisma.tenant.findMany({
      select: {
        name: true,
        slug: true,
        isActive: true,
      },
    });

    console.log('\n=== Updated Tenants ===');
    updatedTenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.name} (${tenant.slug}): ${tenant.isActive ? '✅ Active' : '❌ Inactive'}`);
    });

  } catch (error) {
    console.error('Error activating tenants:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateTenants();
