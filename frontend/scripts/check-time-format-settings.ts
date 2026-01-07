import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Get all tenant settings
    const tenantSettings = await prisma.tenantSettings.findMany({
      select: {
        id: true,
        tenantId: true,
        timeFormat: true,
        dateFormat: true,
        timezone: true,
        weekStartDay: true,
        tenant: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('='.repeat(80));
    console.log('TENANT TIME & DATE SETTINGS');
    console.log('='.repeat(80));
    console.log('');

    if (tenantSettings.length === 0) {
      console.log('No tenant settings found in database');
      return;
    }

    tenantSettings.forEach((settings, index) => {
      console.log((index + 1) + '. Tenant: ' + settings.tenant.name);
      console.log('   Tenant ID: ' + settings.tenantId);
      console.log('   Time Format: ' + (settings.timeFormat || 'NOT SET'));
      console.log('   Date Format: ' + (settings.dateFormat || 'NOT SET'));
      console.log('   Timezone: ' + (settings.timezone || 'NOT SET'));
      console.log('   Week Start Day: ' + (settings.weekStartDay || 'NOT SET'));
      console.log('');
    });

    console.log('='.repeat(80));

    // Check if vijay's tenant has time format configured
    const vijayUser = await prisma.user.findFirst({
      where: {
        email: 'vijay.n@idwteam.com'
      },
      select: {
        tenantId: true,
        firstName: true,
        lastName: true
      }
    });

    if (vijayUser) {
      const vijayTenantSettings = await prisma.tenantSettings.findUnique({
        where: {
          tenantId: vijayUser.tenantId
        },
        select: {
          timeFormat: true,
          dateFormat: true,
          timezone: true,
          weekStartDay: true
        }
      });

      console.log('\nVijays Tenant Settings:');
      console.log('  User: ' + vijayUser.firstName + ' ' + vijayUser.lastName);
      console.log('  Time Format: ' + (vijayTenantSettings?.timeFormat || 'NOT SET'));
      console.log('  Date Format: ' + (vijayTenantSettings?.dateFormat || 'NOT SET'));
      console.log('  Timezone: ' + (vijayTenantSettings?.timezone || 'NOT SET'));
      console.log('  Week Start Day: ' + (vijayTenantSettings?.weekStartDay || 'NOT SET'));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
