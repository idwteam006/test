import { prisma } from '../lib/prisma';

async function checkAllowedDomains() {
  try {
    console.log('🔍 Checking allowed email domains...\n');

    const tenantSettings = await prisma.tenantSettings.findMany({
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

    if (tenantSettings.length === 0) {
      console.log('❌ No tenant settings found!');
      return;
    }

    for (const setting of tenantSettings) {
      console.log(`\n📊 Tenant: ${setting.tenant.name}`);
      console.log(`   Tenant ID: ${setting.tenantId}`);
      console.log(`   Settings ID: ${setting.id}`);
      console.log(`   Allowed Domains:`, setting.allowedEmailDomains);

      if (!setting.allowedEmailDomains || (Array.isArray(setting.allowedEmailDomains) && setting.allowedEmailDomains.length === 0)) {
        console.log('   ⚠️  WARNING: No email domains configured!');
        console.log('   💡 Suggestion: Add allowed domains or use "*" for all domains');
      }
    }

    console.log('\n\n💡 To add allowed domains, run:');
    console.log('   npm run fix-email-domains');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllowedDomains();
