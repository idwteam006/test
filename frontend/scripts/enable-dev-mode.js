const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function enableDevMode() {
  try {
    console.log('🔧 Enabling Development Mode...\n');

    const settings = await prisma.tenantSettings.updateMany({
      data: {
        isDevelopmentMode: true,
      }
    });

    console.log('✅ Development Mode ENABLED for all tenants');
    console.log('Updated:', settings.count, 'tenant(s)\n');

    const allSettings = await prisma.tenantSettings.findMany({
      select: {
        companyName: true,
        isDevelopmentMode: true,
      }
    });

    console.log('Current Settings:');
    allSettings.forEach(s => {
      console.log('  •', s.companyName, ':', s.isDevelopmentMode ? '🚧 DEV MODE' : '✅ PROD MODE');
    });

    console.log('\n🔑 Static OTP for testing: 123456');
    console.log('📧 Email sending: DISABLED');
    console.log('✅ All users (Admin, Manager, HR, Employee) can login with OTP: 123456\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enableDevMode();
