import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTenantSettings() {
  // Get IDW Team tenant settings
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'idw-team' },
    include: { settings: true }
  });

  if (!tenant) {
    console.log('Tenant not found');
    return;
  }

  console.log('=== IDW Team Tenant Settings ===');
  console.log('Tenant ID:', tenant.id);
  console.log('Name:', tenant.name);
  console.log('Is Active:', tenant.isActive);
  console.log('');
  console.log('=== Email Domain Settings ===');
  console.log('Allowed Email Domains:', JSON.stringify(tenant.settings?.allowedEmailDomains, null, 2));
  console.log('Is Development Mode:', tenant.settings?.isDevelopmentMode);
  console.log('');

  // Check all tenants and their email domain settings
  console.log('=== All Active Tenants Email Settings ===');
  const allTenants = await prisma.tenant.findMany({
    where: { isActive: true },
    include: { settings: true }
  });

  for (const t of allTenants) {
    console.log(`\nTenant: ${t.name} (slug: ${t.slug})`);
    console.log('  Allowed Domains:', JSON.stringify(t.settings?.allowedEmailDomains));
    console.log('  Dev Mode:', t.settings?.isDevelopmentMode);
  }

  // Check Global Settings
  console.log('\n=== Global Settings ===');
  const globalSettings = await prisma.globalSettings.findFirst();
  if (globalSettings) {
    console.log('Site Name:', globalSettings.siteName);
    console.log('Allow Public Registration:', globalSettings.allowPublicRegistration);
    console.log('Require Email Verification:', globalSettings.requireEmailVerification);
    console.log('Is Development Mode:', globalSettings.isDevelopmentMode);
  }

  await prisma.$disconnect();
}

checkTenantSettings().catch(console.error);
