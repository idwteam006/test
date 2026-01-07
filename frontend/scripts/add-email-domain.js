const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addEmailDomain() {
  try {
    console.log('🔍 Finding tenant settings and adding hotmail.com domain...\n');

    // Get the tenant settings
    const settings = await prisma.tenantSettings.findFirst({
      select: {
        id: true,
        tenantId: true,
        companyName: true,
        allowedEmailDomains: true,
      }
    });

    if (!settings) {
      console.log('❌ No tenant settings found');
      return;
    }

    console.log('Found tenant:', settings.companyName);
    console.log('Current allowed domains:', settings.allowedEmailDomains);
    console.log('');

    // Parse the JSON domains
    let domains = settings.allowedEmailDomains ?
      (typeof settings.allowedEmailDomains === 'string' ?
        JSON.parse(settings.allowedEmailDomains) :
        settings.allowedEmailDomains) :
      ['*'];

    console.log('Parsed domains:', domains);

    // If it's ["*"], replace with actual domains
    if (domains.includes('*')) {
      domains = ['idwteam.com', 'addtechno.com', 'hotmail.com', 'gmail.com'];
      console.log('Replacing wildcard with specific domains:', domains);
    } else {
      // Add missing domains
      let added = [];
      if (!domains.includes('hotmail.com')) {
        domains.push('hotmail.com');
        added.push('hotmail.com');
      }
      if (!domains.includes('gmail.com')) {
        domains.push('gmail.com');
        added.push('gmail.com');
      }

      if (added.length > 0) {
        console.log('Adding domains:', added.join(', '));
      } else {
        console.log('ℹ️  All required domains already present');
        return;
      }
    }

    await prisma.tenantSettings.update({
      where: { id: settings.id },
      data: {
        allowedEmailDomains: domains,
      }
    });

    console.log('✅ Updated allowed email domains');
    console.log('New domains:', domains)

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addEmailDomain();
