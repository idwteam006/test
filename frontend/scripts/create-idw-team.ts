import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createIDWTeam() {
  try {
    const targetEmail = 'vijay.n@idwteam.com';

    // 1. Find the existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: targetEmail },
      include: {
        tenant: true
      }
    });

    if (!existingUser) {
      console.error(`❌ User with email ${targetEmail} not found`);
      return;
    }

    console.log(`\n📧 Found user: ${existingUser.name} <${existingUser.email}>`);
    console.log(`   Current tenant: ${existingUser.tenant.name} (${existingUser.tenant.slug})`);
    console.log(`   Current role: ${existingUser.role}`);

    // 2. Check if IDW Team already exists
    const existingIDWTenant = await prisma.tenant.findUnique({
      where: { slug: 'idw-team' }
    });

    if (existingIDWTenant) {
      console.log(`\n✅ IDW Team organization already exists!`);
      console.log(`   ID: ${existingIDWTenant.id}`);
      console.log(`   Slug: ${existingIDWTenant.slug}`);
      console.log(`   Status: ${existingIDWTenant.isActive ? 'Active' : 'Inactive'}`);

      // Just update the user's tenant
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          tenantId: existingIDWTenant.id,
          role: 'ADMIN',
        }
      });

      console.log(`\n✅ Moved user to IDW Team organization`);
      return;
    }

    // 3. Create IDW Team organization with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: 'IDW Team',
          slug: 'idw-team',
          isActive: true,
        },
      });

      console.log(`\n✅ Created tenant: ${tenant.name} (${tenant.slug})`);

      // Create tenant settings
      const settings = await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          companyName: 'IDW Team',
          workingHours: { start: '09:00', end: '17:00', days: [1, 2, 3, 4, 5] },
          leavePolicies: { annualLeave: 20, sickLeave: 10 },
          subscriptionPlan: 'FREE',
          subscriptionStatus: 'TRIAL',
        },
      });

      console.log(`✅ Created tenant settings`);

      // Update user to move to new tenant and make admin
      const updatedUser = await tx.user.update({
        where: { id: existingUser.id },
        data: {
          tenantId: tenant.id,
          role: 'ADMIN',
        },
      });

      console.log(`✅ Moved user to new tenant and promoted to ADMIN`);

      return { tenant, settings, user: updatedUser };
    });

    console.log(`\n🎉 Successfully created IDW Team organization!`);
    console.log(`\n=== Summary ===`);
    console.log(`Organization: ${result.tenant.name}`);
    console.log(`Slug: ${result.tenant.slug}`);
    console.log(`Admin: ${result.user.name} <${result.user.email}>`);
    console.log(`Status: Active`);
    console.log(`\n✅ User can now login with OTP at: ${result.user.email}`);

  } catch (error) {
    console.error('❌ Error creating IDW Team:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createIDWTeam();
