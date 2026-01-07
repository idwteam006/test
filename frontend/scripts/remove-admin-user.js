const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeAdminUser() {
  try {
    console.log('🔍 Finding info@addtechno.com user...\n');

    const user = await prisma.user.findUnique({
      where: { email: 'info@addtechno.com' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      }
    });

    if (!user) {
      console.log('❌ User not found with email: info@addtechno.com');
      return;
    }

    console.log('Found user:');
    console.log('  Name:', user.firstName, user.lastName);
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Status:', user.status);
    console.log('\n🗑️  Deleting user...\n');

    await prisma.user.delete({
      where: { id: user.id }
    });

    console.log('✅ User deleted successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

removeAdminUser();
