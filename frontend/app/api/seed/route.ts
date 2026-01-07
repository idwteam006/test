/**
 * Database Seed API Route
 * Creates demo users for testing
 * WARNING: Remove this in production!
 */

import { NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST() {
  try {
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

    // Demo password for all users: Demo@123
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

    const createdUsers = [];

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

      createdUsers.push({
        email: user.email,
        role: user.role,
      });

      console.log(`✅ Created user: ${user.email} (${user.role})`);
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      tenant: {
        name: tenant.name,
        slug: tenant.slug,
      },
      users: createdUsers,
      demoCredentials: {
        password: 'Demo@123',
        note: 'Use this password for all demo accounts',
      },
    });
  } catch (error) {
    console.error('❌ Error seeding database:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
