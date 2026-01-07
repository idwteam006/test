import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
  const email = 'nbhupathi@gmail.com';

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      tenantId: true,
      tenant: {
        select: {
          id: true,
          name: true,
          isActive: true,
        }
      }
    }
  });

  if (!user) {
    console.log(`User with email ${email} not found`);
    return;
  }

  console.log('User data:', JSON.stringify(user, null, 2));
  console.log('\n--- Status Check ---');
  console.log('User status:', user.status);
  console.log('Tenant active:', user.tenant.isActive);

  // Check if status needs to be updated
  if (user.status !== 'ACTIVE') {
    console.log('\n⚠️  User status is not ACTIVE. Updating...');
    await prisma.user.update({
      where: { email },
      data: { status: 'ACTIVE' }
    });
    console.log('✅ User status updated to ACTIVE');
  }
}

checkUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
