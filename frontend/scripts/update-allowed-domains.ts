import { prisma } from '../lib/prisma';

/**
 * Update allowed email domains for ADD Technologies tenant
 * Adds adtechno.com to the existing allowedEmailDomains
 */
async function updateAllowedDomains() {
  try {
    console.log('🔧 Updating allowed email domains for ADD Technologies...\n');

    // Find ADD Technologies tenant
    const tenant = await prisma.tenant.findFirst({
      where: { name: 'ADD Technologies' },
      select: { id: true, name: true },
    });

    if (!tenant) {
      console.error('❌ Tenant not found!');
      return;
    }

    console.log(`Found tenant: ${tenant.name} (${tenant.id})`);

    // Get current settings
    const currentSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
      select: { allowedEmailDomains: true },
    });

    console.log(`Current allowed domains: ${JSON.stringify(currentSettings?.allowedEmailDomains)}`);

    // Update to include both domains
    const updated = await prisma.tenantSettings.update({
      where: { tenantId: tenant.id },
      data: {
        allowedEmailDomains: ['addtechno.com', 'adtechno.com'], // Both domains
      },
    });

    console.log(`\n✅ Updated allowed domains: ${JSON.stringify(updated.allowedEmailDomains)}`);
    console.log('\nNow you can create users with both:');
    console.log('  - @addtechno.com (original)');
    console.log('  - @adtechno.com (newly added)');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAllowedDomains();
