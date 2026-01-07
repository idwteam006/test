// Load environment variables
import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function manageSuperAdmins() {
  try {
    // Find all SUPER_ADMIN users
    const superAdmins = await prisma.user.findMany({
      where: {
        role: 'SUPER_ADMIN',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    console.log('\n📋 Current SUPER_ADMIN Users:');
    console.log('='.repeat(80));
    superAdmins.forEach((user) => {
      console.log(`  ${user.firstName} ${user.lastName} (${user.email}) - ${user.status}`);
    });
    console.log('='.repeat(80));
    console.log(`Total: ${superAdmins.length} super-admin(s)\n`);

    // Find users to demote (all except nbhupathi@gmail.com)
    const usersToRemove = superAdmins.filter(
      (user) => user.email !== 'nbhupathi@gmail.com'
    );

    if (usersToRemove.length === 0) {
      console.log('✅ No super-admin users to remove. Only nbhupathi@gmail.com has SUPER_ADMIN role.');
      return;
    }

    console.log(`\n⚠️  Found ${usersToRemove.length} super-admin(s) to demote:\n`);
    usersToRemove.forEach((user) => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.email})`);
    });

    console.log('\n🔄 Demoting users to ADMIN role...\n');

    // Update users to ADMIN role
    for (const user of usersToRemove) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
      });
      console.log(`  ✓ Demoted: ${user.email} → ADMIN`);
    }

    // Verify the changes
    const remainingSuperAdmins = await prisma.user.findMany({
      where: {
        role: 'SUPER_ADMIN',
      },
      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    console.log('\n✅ Operation Complete!');
    console.log('='.repeat(80));
    console.log('Remaining SUPER_ADMIN Users:');
    remainingSuperAdmins.forEach((user) => {
      console.log(`  ${user.firstName} ${user.lastName} (${user.email})`);
    });
    console.log('='.repeat(80));
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

manageSuperAdmins();
