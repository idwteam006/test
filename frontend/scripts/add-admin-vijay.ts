import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'vijay.n@idwteam.com';
  const password = 'Admin@123';

  console.log(`\n🔐 Creating admin user: ${email}`);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log('❌ User already exists!');
    return;
  }

  // Get the existing tenant (assuming same as other admins)
  const tenant = await prisma.tenant.findFirst();

  if (!tenant) {
    console.log('❌ No tenant found! Please create a tenant first.');
    return;
  }

  console.log(`📍 Using tenant: ${tenant.name} (${tenant.slug})`);

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Vijay N',
      firstName: 'Vijay',
      lastName: 'N',
      role: 'ADMIN',
      status: 'ACTIVE',
      tenantId: tenant.id,
      emailVerified: true,
      employeeId: `EMP-${Date.now()}`,
    },
  });

  console.log('✅ Admin user created successfully!');
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Password: ${password}`);
  console.log(`👤 User ID: ${user.id}`);
  console.log(`🏢 Tenant: ${tenant.name}`);
  console.log('\n✨ You can now login with these credentials!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
