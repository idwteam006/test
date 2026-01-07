import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeSuperAdmin() {
  const email = 'nbhupathi@gmail.com';

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN' },
    });

    console.log('✅ User updated to SUPER_ADMIN:');
    console.log('   Email:', user.email);
    console.log('   Name:', user.name);
    console.log('   Role:', user.role);
    console.log('   ID:', user.id);
    console.log('\n🎉 You can now access /super-admin dashboard!');
  } catch (error: any) {
    if (error.code === 'P2025') {
      console.error(`❌ User not found: ${email}`);
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

makeSuperAdmin();
