import { prisma } from '../lib/prisma';

async function checkDomainSettings() {
  try {
    const settings = await prisma.tenantSettings.findMany({
      select: {
        id: true,
        tenantId: true,
        allowedEmailDomains: true,
        tenant: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log('📋 Email Domain Settings for All Tenants:\n');

    for (const setting of settings) {
      console.log(`Tenant: ${setting.tenant.name}`);
      console.log(`  Tenant ID: ${setting.tenantId}`);
      console.log(`  Allowed Domains: ${JSON.stringify(setting.allowedEmailDomains)}`);

      if (!setting.allowedEmailDomains || setting.allowedEmailDomains.length === 0) {
        console.log(`  ⚠️  No domains configured (allows all)`);
      } else if (setting.allowedEmailDomains.includes('*')) {
        console.log(`  ✅ Wildcard: All domains allowed`);
      } else {
        console.log(`  🔒 Restricted to: ${setting.allowedEmailDomains.join(', ')}`);
      }
      console.log();
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDomainSettings();
