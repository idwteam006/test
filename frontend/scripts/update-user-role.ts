import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateUserRole() {
  const email = 'nbhupathi@gmail.com';

  // First, find the user
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, tenantId: true }
  });

  if (!user) {
    console.log(`User with email ${email} not found`);
    return;
  }

  console.log('Current user data:', user);

  // Update the role to SUPER_ADMIN
  const updatedUser = await prisma.user.update({
    where: { email },
    data: { role: 'SUPER_ADMIN' },
    select: { id: true, email: true, firstName: true, lastName: true, role: true }
  });

  console.log('Updated user data:', updatedUser);
  console.log('\n✅ User role updated to ADMIN successfully!');
  console.log('You can now access /super-admin');
}

updateUserRole()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
