const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function addAdminUser() {
  const email = 'nagavijay@hotmail.com';
  const firstName = 'Naga Vijay';
  const lastName = 'Bhupathi';

  console.log('👤 Adding new admin user...\n');
  console.log('Email:', email);
  console.log('Name:', firstName, lastName);
  console.log('');

  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.log('⚠️  User already exists with this email');
      console.log('   User ID:', existing.id);
      console.log('   Status:', existing.status);
      console.log('   Role:', existing.role);

      if (existing.status === 'ACTIVE') {
        console.log('\n✅ User is already active and can login');
      } else {
        console.log('\n🔄 Updating user status to ACTIVE...');
        const updated = await prisma.user.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE' },
        });
        console.log('✅ User activated successfully');
      }

      await prisma.$disconnect();
      return;
    }

    // Get the Demo Organization tenant
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { name: 'Demo Organization' },
          { name: { contains: 'Demo' } }
        ]
      }
    });

    if (!tenant) {
      console.log('❌ Demo Organization tenant not found');
      console.log('   Creating new tenant...');

      const newTenant = await prisma.tenant.create({
        data: {
          name: 'Demo Organization',
          domain: 'demo.zenora.ai',
          settings: {},
        },
      });

      console.log('✅ Tenant created:', newTenant.id);
    }

    const tenantId = tenant ? tenant.id : (await prisma.tenant.findFirst()).id;

    // Get or create Administration department
    let department = await prisma.department.findFirst({
      where: {
        name: 'Administration',
        tenantId: tenantId,
      },
    });

    if (!department) {
      department = await prisma.department.create({
        data: {
          name: 'Administration',
          tenantId: tenantId,
        },
      });
      console.log('✅ Created Administration department');
    }

    // Generate unique employee ID
    const timestamp = Date.now();
    const employeeId = `EMP-${timestamp}`;

    // Create the admin user (passwordless auth, so password is placeholder)
    const user = await prisma.user.create({
      data: {
        email: email,
        name: `${firstName} ${lastName}`,
        firstName: firstName,
        lastName: lastName,
        password: 'passwordless', // Placeholder - using OTP auth
        role: 'ADMIN',
        status: 'ACTIVE',
        employeeId: employeeId,
        tenantId: tenantId,
        departmentId: department.id,
      },
    });

    console.log('\n✅ Admin user created successfully!\n');
    console.log('User Details:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Name:', user.firstName, user.lastName);
    console.log('  Employee ID:', user.employeeId);
    console.log('  Role:', user.role);
    console.log('  Status:', user.status);
    console.log('  Tenant ID:', user.tenantId);
    console.log('  Department ID:', user.departmentId);
    console.log('');
    console.log('🔐 Login Instructions:');
    console.log('   1. Go to: https://zenora-alpha.vercel.app/auth/login');
    console.log('   2. Enter email:', email);
    console.log('   3. Check email for OTP code');
    console.log('   4. Enter OTP to login');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'P2002') {
      console.error('   Unique constraint violation - user may already exist');
    }
  } finally {
    await prisma.$disconnect();
  }
}

addAdminUser();
