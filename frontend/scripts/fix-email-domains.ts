import { prisma } from '../lib/prisma';

async function fixEmailDomains() {
  try {
    console.log('🔧 Fixing email domain restrictions...\n');

    // Get all tenant settings
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
      console.log(`\n📊 Updating: ${setting.tenant.name}`);
      console.log(`   Current domains:`, setting.allowedEmailDomains);

      // Update to allow all domains with wildcard
      const updated = await prisma.tenantSettings.update({
        where: { id: setting.id },
        data: {
          allowedEmailDomains: ['*'], // Allow all domains
        },
      });

      console.log(`   ✅ Updated to:`, updated.allowedEmailDomains);
      console.log('   🎉 All email domains are now allowed!');
    }

    console.log('\n\n✅ Email domain restrictions removed!');
    console.log('💡 You can now create users with any email domain.');
    console.log('\n📝 To restrict to specific domains later, update allowedEmailDomains to:');
    console.log('   ["adtechno.com", "addtechno.com", "example.com"]');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEmailDomains();
