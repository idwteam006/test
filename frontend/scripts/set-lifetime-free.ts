import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setLifetimeFree() {
  try {
    console.log('\n🔧 Setting up lifetime free accounts...\n');

    // Target tenants
    const targetSlugs = ['idw-team', 'add-technologies'];

    for (const slug of targetSlugs) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug },
        include: { settings: true }
      });

      if (!tenant) {
        console.log(`❌ Tenant not found: ${slug}`);
        continue;
      }

      console.log(`📦 Processing: ${tenant.name} (${tenant.slug})`);

      // Update tenant settings for lifetime free account
      await prisma.tenantSettings.update({
        where: { tenantId: tenant.id },
        data: {
          subscriptionPlan: 'ENTERPRISE', // Best plan
          subscriptionStatus: 'ACTIVE', // Active status
          subscriptionExpiresAt: null, // No subscription expiry - LIFETIME
        }
      });

      console.log(`   ✅ Upgraded to LIFETIME FREE ENTERPRISE account`);
      console.log(`   • Plan: ENTERPRISE (unlimited features)`);
      console.log(`   • Status: ACTIVE`);
      console.log(`   • Expiry: NEVER (lifetime free)`);
      console.log(`   • Billing: NONE\n`);
    }

    // Show updated tenants
    console.log('=== Updated Tenant Settings ===\n');

    for (const slug of targetSlugs) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug },
        include: { settings: true }
      });

      if (tenant && tenant.settings) {
        console.log(`${tenant.name}:`);
        console.log(`  Plan: ${tenant.settings.subscriptionPlan}`);
        console.log(`  Status: ${tenant.settings.subscriptionStatus}`);
        console.log(`  Subscription Expires: ${tenant.settings.subscriptionExpiresAt || 'NEVER (Lifetime Free)'}`);
        console.log(`  Max Employees: ${tenant.settings.maxEmployees}`);
        console.log(`  Max Projects: ${tenant.settings.maxProjects}`);
        console.log(`  Max Storage: ${(tenant.settings.maxStorage / 1024 / 1024 / 1024).toFixed(2)} GB\n`);
      }
    }

    console.log('✅ Successfully configured lifetime free accounts!\n');

  } catch (error) {
    console.error('❌ Error setting lifetime free accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setLifetimeFree();
