const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('🔍 Creating admin user: info@addtechno.com\n');

    // Get tenant
    const tenant = await prisma.tenant.findFirst({
      select: {
        id: true,
        name: true,
      }
    });

    if (!tenant) {
      console.error('❌ No tenant found');
      return;
    }

    console.log('Tenant:', tenant.name);

    // Get department
    const department = await prisma.department.findFirst({
      where: {
        tenantId: tenant.id,
      },
      select: {
        id: true,
        name: true,
      }
    });

    if (!department) {
      console.error('❌ No department found');
      return;
    }

    console.log('Department:', department.name);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'info@addtechno.com' }
    });

    if (existingUser) {
      console.log('⚠️  User already exists with email: info@addtechno.com');
      return;
    }

    // Generate random password (will be hashed, not used since we use magic links)
    const tempPassword = Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'info@addtechno.com',
        firstName: 'Admin',
        lastName: 'Addtech',
        name: 'Admin Addtech',
        role: 'ADMIN',
        status: 'ACTIVE',
        tenantId: tenant.id,
        departmentId: department.id,
        password: hashedPassword,
        emailVerified: true,
        employeeId: 'EMP-ADMIN-001',
      }
    });

    console.log('\n✅ Admin user created successfully!');
    console.log('  Email:', user.email);
    console.log('  Name:', user.firstName, user.lastName);
    console.log('  Role:', user.role);
    console.log('  Status:', user.status);
    console.log('  Employee ID:', user.employeeId);
    console.log('\n📧 You can now login with: info@addtechno.com');
    console.log('💡 Use magic link (OTP) to login - no password needed!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
