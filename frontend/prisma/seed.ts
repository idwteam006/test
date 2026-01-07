/**
 * Prisma Database Seed Script
 * Creates demo users for all roles
 */

import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo organization
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
      isActive: true,
    },
  });

  console.log('✅ Created tenant:', tenant.name);

  // Create departments for IT company
  const departments = [
    'Engineering',
    'Product',
    'Sales',
    'Marketing',
    'Human Resources',
    'Finance',
    'Operations',
    'Customer Support',
    'Data & Analytics',
    'DevOps',
    'QA & Testing',
    'Administration',
  ];

  for (const deptName of departments) {
    // Check if department exists
    const existing = await prisma.department.findFirst({
      where: {
        name: deptName,
        tenantId: tenant.id,
      },
    });

    if (!existing) {
      await prisma.department.create({
        data: {
          name: deptName,
          tenantId: tenant.id,
        },
      });
      console.log(`✅ Created department: ${deptName}`);
    } else {
      console.log(`⏭️  Department already exists: ${deptName}`);
    }
  }

  // Demo password for all users
  const demoPassword = await hashPassword('Demo@123');

  // Create demo users
  const users = [
    {
      email: 'admin@demo.com',
      name: 'Admin User',
      role: Role.ADMIN,
    },
    {
      email: 'manager@demo.com',
      name: 'Manager User',
      role: Role.MANAGER,
    },
    {
      email: 'accountant@demo.com',
      name: 'Accountant User',
      role: Role.ACCOUNTANT,
    },
    {
      email: 'employee@demo.com',
      name: 'Employee User',
      role: Role.EMPLOYEE,
    },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        name: userData.name,
        firstName: userData.name.split(' ')[0] || userData.name,
        lastName: userData.name.split(' ').slice(1).join(' ') || '',
        password: demoPassword,
        role: userData.role,
        tenantId: tenant.id,
        isActive: true,
        emailVerified: true,
      },
    });

    console.log(`✅ Created user: ${user.email} (${user.role})`);
  }

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
