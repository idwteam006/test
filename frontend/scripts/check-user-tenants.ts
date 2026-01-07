// Load environment variables
import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserTenants() {
  try {
    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        tenant: true,
      },
      orderBy: {
        email: 'asc',
      },
    });

    console.log('\n📋 Users by Tenant:');
    console.log('='.repeat(100));

    // Group by tenant
    const tenantGroups = users.reduce((acc: any, user) => {
      const tenantName = user.tenant.name;
      if (!acc[tenantName]) {
        acc[tenantName] = [];
      }
      acc[tenantName].push(user);
      return acc;
    }, {});

    Object.entries(tenantGroups).forEach(([tenantName, users]: [string, any]) => {
      console.log(`\n🏢 Tenant: ${tenantName} (ID: ${users[0].tenantId})`);
      console.log('-'.repeat(100));
      users.forEach((user: any) => {
        console.log(`  ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`);
      });
    });

    console.log('\n' + '='.repeat(100));
    console.log(`Total Tenants: ${Object.keys(tenantGroups).length}`);
    console.log(`Total Users: ${users.length}`);
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserTenants();
