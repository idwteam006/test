// Load environment variables
import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEmailDomains() {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        settings: {
          select: {
            allowedEmailDomains: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log('\n📧 Email Domains Configuration:');
    console.log('='.repeat(80));

    for (const tenant of tenants) {
      const domains = (tenant.settings?.allowedEmailDomains as string[]) || ['*'];

      console.log(`\n🏢 ${tenant.name} (${tenant.slug})`);
      console.log(`   ID: ${tenant.id}`);
      console.log(`   Allowed Domains: ${domains.join(', ')}`);
    }

    console.log('\n' + '='.repeat(80));
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmailDomains();
