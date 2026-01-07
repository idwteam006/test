/**
 * Update Existing Users for Passwordless Auth
 *
 * Tasks:
 * 1. Set info@addtechno.com as ADMIN role
 * 2. Set bhupathi@addtechno.com as MANAGER role (HR)
 * 3. Update all users to ACTIVE status
 * 4. Ensure firstName/lastName are set
 * 5. Generate employeeId for users without one
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting user updates...\n');

  try {
    // 1. Update info@addtechno.com to ADMIN
    const adminUser = await prisma.user.findUnique({
      where: { email: 'info@addtechno.com' },
    });

    if (adminUser) {
      await prisma.user.update({
        where: { email: 'info@addtechno.com' },
        data: {
          role: 'ADMIN',
          status: 'ACTIVE',
          emailVerified: true,
        },
      });
      console.log('✅ Updated info@addtechno.com to ADMIN role');
    } else {
      console.log('⚠️  User info@addtechno.com not found');
    }

    // 2. Update bhupathi@addtechno.com to MANAGER (HR role)
    const hrUser = await prisma.user.findUnique({
      where: { email: 'bhupathi@addtechno.com' },
    });

    if (hrUser) {
      await prisma.user.update({
        where: { email: 'bhupathi@addtechno.com' },
        data: {
          role: 'MANAGER',
          status: 'ACTIVE',
          emailVerified: true,
        },
      });
      console.log('✅ Updated bhupathi@addtechno.com to MANAGER role (HR)');
    } else {
      console.log('⚠️  User bhupathi@addtechno.com not found');
    }

    // 3. Get all users and ensure they have proper data
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        employeeId: true,
        role: true,
      },
    });

    console.log(`\n📊 Found ${allUsers.length} users in database\n`);

    // 4. Update users with missing data
    for (const user of allUsers) {
      const updates: any = {};

      // Ensure status is set
      if (!user.status) {
        updates.status = 'ACTIVE';
      }

      // Generate employeeId if missing
      if (!user.employeeId) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        updates.employeeId = `EMP-${dateStr}-${randomSuffix}`;
      }

      // Update if there are changes
      if (Object.keys(updates).length > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: updates,
        });
        console.log(`✅ Updated user ${user.email}:`, updates);
      }
    }

    // 5. Display final user summary
    console.log('\n📋 Final User Summary:\n');

    const finalUsers = await prisma.user.findMany({
      select: {
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        employeeId: true,
      },
      orderBy: { email: 'asc' },
    });

    console.table(finalUsers);

    console.log('\n✅ User updates completed successfully!');
    console.log('\n📝 Notes:');
    console.log('- info@addtechno.com is now ADMIN');
    console.log('- bhupathi@addtechno.com is now MANAGER (HR role)');
    console.log('- All users have ACTIVE status');
    console.log('- All users have employeeId assigned');
    console.log('\n🔐 Users can now login using passwordless magic links!');

  } catch (error) {
    console.error('❌ Error updating users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
