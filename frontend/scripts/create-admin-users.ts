/**
 * Create Admin Users
 * Creates info@addtechno.com (ADMIN) and bhupathi@addtechno.com (MANAGER/HR)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Creating admin users...\n');

  try {
    // Get the first tenant
    const tenant = await prisma.tenant.findFirst();

    if (!tenant) {
      console.error('❌ No tenant found in database. Please run seed first.');
      process.exit(1);
    }

    console.log(`📦 Using tenant: ${tenant.name} (${tenant.id})\n`);

    // Get or create a department
    let department = await prisma.department.findFirst({
      where: { tenantId: tenant.id },
    });

    if (!department) {
      console.log('📁 No department found, creating default department...');
      department = await prisma.department.create({
        data: {
          name: 'Administration',
          tenantId: tenant.id,
        },
      });
      console.log(`✅ Created department: ${department.name}`);
    }

    console.log(`📁 Using department: ${department.name}\n`);

    // 1. Create or update info@addtechno.com as ADMIN
    const adminEmail = 'info@addtechno.com';
    let adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (adminUser) {
      adminUser = await prisma.user.update({
        where: { email: adminEmail },
        data: {
          role: 'ADMIN',
          status: 'ACTIVE',
          emailVerified: true,
        },
      });
      console.log(`✅ Updated ${adminEmail} to ADMIN`);
    } else {
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'Admin User',
          firstName: 'Admin',
          lastName: 'User',
          password: '', // No password for passwordless auth
          role: 'ADMIN',
          status: 'ACTIVE',
          tenantId: tenant.id,
          departmentId: department.id,
          employeeId: 'EMP-ADMIN-001',
          emailVerified: true,
        },
      });
      console.log(`✅ Created ${adminEmail} as ADMIN`);
    }

    // 2. Create or update bhupathi@addtechno.com as MANAGER (HR)
    const hrEmail = 'bhupathi@addtechno.com';
    let hrUser = await prisma.user.findUnique({
      where: { email: hrEmail },
    });

    if (hrUser) {
      hrUser = await prisma.user.update({
        where: { email: hrEmail },
        data: {
          role: 'MANAGER',
          status: 'ACTIVE',
          emailVerified: true,
        },
      });
      console.log(`✅ Updated ${hrEmail} to MANAGER (HR)`);
    } else {
      hrUser = await prisma.user.create({
        data: {
          email: hrEmail,
          name: 'Bhupathi HR',
          firstName: 'Bhupathi',
          lastName: 'HR',
          password: '', // No password for passwordless auth
          role: 'MANAGER',
          status: 'ACTIVE',
          tenantId: tenant.id,
          departmentId: department.id,
          employeeId: 'EMP-HR-001',
          emailVerified: true,
        },
      });
      console.log(`✅ Created ${hrEmail} as MANAGER (HR)`);
    }

    // 3. Display all users
    console.log('\n📋 All Users:\n');

    const allUsers = await prisma.user.findMany({
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

    console.table(allUsers);

    console.log('\n✅ Admin users created successfully!');
    console.log('\n🔐 Login Instructions:');
    console.log('1. Go to /auth/login');
    console.log('2. Enter your email (info@addtechno.com or bhupathi@addtechno.com)');
    console.log('3. Check your email for the 6-digit code');
    console.log('4. Enter the code or click the magic link');
    console.log('5. You will be logged in automatically!');

  } catch (error) {
    console.error('❌ Error creating admin users:', error);
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
