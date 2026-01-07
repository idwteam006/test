// Load environment variables
import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateTenantName() {
  try {
    const tenantId = process.argv[2];
    const newName = process.argv[3];
    
    if (!tenantId || !newName) {
      console.log('Usage: npx tsx scripts/update-tenant-name.ts <tenantId> <newName>');
      console.log('\nAvailable tenants:');
      
      const tenants = await prisma.tenant.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
        }
      });
      
      tenants.forEach(tenant => {
        console.log(`- ${tenant.name} (${tenant.slug})`);
        console.log(`  ID: ${tenant.id}`);
      });
      return;
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { name: newName }
    });

    console.log(`✓ Tenant name updated successfully!`);
    console.log(`  Old/New Name: ${newName}`);
    console.log(`  ID: ${updated.id}`);
    console.log(`  Slug: ${updated.slug}`);
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateTenantName();
