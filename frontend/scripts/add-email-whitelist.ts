import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔐 Setting up email domain whitelist...');

  const allowedDomains = ['addtechno.com', 'idwteam.com'];

  console.log(`📧 Allowed domains: ${allowedDomains.join(', ')}`);

  // Get all tenants
  const tenants = await prisma.tenant.findMany();

  if (tenants.length === 0) {
    console.log('❌ No tenants found!');
    return;
  }

  console.log(`\n📍 Found ${tenants.length} tenant(s)`);

  // Update settings for each tenant
  for (const tenant of tenants) {
    console.log(`\n🏢 Processing tenant: ${tenant.name} (${tenant.slug})`);

    // Check if tenant settings exist
    const existingSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });

    if (existingSettings) {
      // Update existing settings
      await prisma.tenantSettings.update({
        where: { tenantId: tenant.id },
        data: {
          allowedEmailDomains: allowedDomains,
        },
      });
      console.log('✅ Updated existing tenant settings');
    } else {
      // Create new settings
      await prisma.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          allowedEmailDomains: allowedDomains,
          companyName: tenant.name,
          workingHours: {
            monday: { start: '09:00', end: '17:00' },
            tuesday: { start: '09:00', end: '17:00' },
            wednesday: { start: '09:00', end: '17:00' },
            thursday: { start: '09:00', end: '17:00' },
            friday: { start: '09:00', end: '17:00' },
            saturday: { start: null, end: null },
            sunday: { start: null, end: null },
          },
          leavePolicies: {
            annual: 20,
            sick: 10,
            casual: 5,
          },
        },
      });
      console.log('✅ Created new tenant settings');
    }

    // Verify
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
      select: { allowedEmailDomains: true },
    });

    console.log(`📋 Current whitelist: ${JSON.stringify(settings?.allowedEmailDomains)}`);
  }

  console.log('\n✨ Email domain whitelist configured successfully!');
  console.log('\n📧 Only users with emails from these domains can login:');
  allowedDomains.forEach((domain) => console.log(`   - @${domain}`));
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
