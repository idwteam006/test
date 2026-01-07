const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function disableDevMode() {
  try {
    console.log('🔧 Disabling Development Mode (Switching to Production)...\n');

    const settings = await prisma.tenantSettings.updateMany({
      data: {
        isDevelopmentMode: false,
      }
    });

    console.log('✅ Production Mode ENABLED for all tenants');
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

    console.log('\n🔐 Production Mode Active:');
    console.log('✅ Random 6-digit OTP codes');
    console.log('✅ Email sending: ENABLED via SMTP');
    console.log('✅ Secure authentication flow\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

disableDevMode();
