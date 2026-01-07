import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function grantSuperAdmin() {
  try {
    console.log('\n🔐 Granting Super Admin access...\n');

    const superAdminEmails = [
      'vijay.n@idwteam.com',
      'hima.p@idwteam.com',
    ];

    for (const email of superAdminEmails) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          tenant: true,
        },
      });

      if (!user) {
        console.log(`❌ User not found: ${email}`);
        continue;
      }

      // Update user to SUPER_ADMIN role
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          role: 'SUPER_ADMIN',
        },
      });

      console.log(`✅ ${user.name} (${email})`);
      console.log(`   Tenant: ${user.tenant.name}`);
      console.log(`   Role: ${user.role} → SUPER_ADMIN`);
      console.log('');
    }

    // Show all super admins
    console.log('=== Current Super Admins ===\n');
    const superAdmins = await prisma.user.findMany({
      where: {
        role: 'SUPER_ADMIN',
      },
      include: {
        tenant: true,
      },
      orderBy: {
        email: 'asc',
      },
    });

    superAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name} <${admin.email}>`);
      console.log(`   Tenant: ${admin.tenant.name} (${admin.tenant.slug})`);
      console.log(`   Status: ${admin.status}`);
      console.log('');
    });

    console.log(`Total Super Admins: ${superAdmins.length}\n`);
    console.log('✅ Super Admin access granted successfully!\n');

  } catch (error) {
    console.error('❌ Error granting super admin access:', error);
  } finally {
    await prisma.$disconnect();
  }
}

grantSuperAdmin();
