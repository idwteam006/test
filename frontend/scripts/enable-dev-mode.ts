import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enableDevelopmentMode() {
  console.log('\n=== Enabling Development Mode ===\n');

  // Get or create global settings
  let settings = await prisma.globalSettings.findFirst();

  if (!settings) {
    console.log('No global settings found. Creating new settings with development mode enabled...');
    settings = await prisma.globalSettings.create({
      data: {
        siteName: 'Zenora.ai',
        supportEmail: 'support@zenora.ai',
        maxTenantsPerDay: 10,
        requireEmailVerification: true,
        allowPublicRegistration: false,
        maintenanceMode: false,
        sessionTimeout: 3600,
        maxLoginAttempts: 5,
        isDevelopmentMode: true,
      },
    });
    console.log('Created new settings with development mode ENABLED');
  } else {
    console.log('Current settings:', {
      id: settings.id,
      isDevelopmentMode: settings.isDevelopmentMode,
    });

    // Update to enable development mode
    settings = await prisma.globalSettings.update({
      where: { id: settings.id },
      data: { isDevelopmentMode: true },
    });

    console.log('Updated settings - Development mode is now ENABLED');
  }

  console.log('\nFinal settings:', {
    id: settings.id,
    siteName: settings.siteName,
    isDevelopmentMode: settings.isDevelopmentMode,
  });

  console.log('\n=== Done ===');
  console.log('Super admin OTP will now use static code: 123456\n');
}

enableDevelopmentMode()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
