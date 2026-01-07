// Load environment variables
import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTenant() {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
      }
    });

    console.log('Found tenants:');
    tenants.forEach(tenant => {
      console.log(`- ID: ${tenant.id}`);
      console.log(`  Name: ${tenant.name}`);
      console.log(`  Slug: ${tenant.slug}`);
      console.log('');
    });
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTenant();
