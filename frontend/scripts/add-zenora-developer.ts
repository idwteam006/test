/**
 * Add Developer User to Zenora Organization
 * Creates developer@zenora.ai user with EMPLOYEE role
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Adding developer user to Zenora organization...\n');

  try {
    // Find or create Zenora tenant
    let tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { slug: 'zenora' },
          { name: { contains: 'zenora', mode: 'insensitive' } },
        ],
      },
    });

    if (!tenant) {
      console.log('📦 Zenora tenant not found, creating...');
      tenant = await prisma.tenant.create({
        data: {
          name: 'Zenora',
          slug: 'zenora',
          isActive: true,
        },
      });
      console.log(`✅ Created tenant: ${tenant.name}`);
    } else {
      console.log(`📦 Using existing tenant: ${tenant.name} (${tenant.id})`);
    }

    // Get or create Engineering department
    let department = await prisma.department.findFirst({
      where: {
        tenantId: tenant.id,
        name: 'Engineering',
      },
    });

    if (!department) {
      department = await prisma.department.create({
        data: {
          name: 'Engineering',
          tenantId: tenant.id,
        },
      });
      console.log(`✅ Created department: ${department.name}`);
    } else {
      console.log(`📁 Using department: ${department.name}`);
    }

    // Create or update developer@zenora.ai
    const developerEmail = 'developer@zenora.ai';
    let developerUser = await prisma.user.findUnique({
      where: { email: developerEmail },
    });

    const employeeNumber = `EMP-${Date.now().toString(36).toUpperCase()}`;

    if (developerUser) {
      developerUser = await prisma.user.update({
        where: { email: developerEmail },
        data: {
          firstName: 'Developer',
          lastName: 'Zenora',
          role: 'EMPLOYEE',
          status: 'ACTIVE',
          emailVerified: true,
          tenantId: tenant.id,
          departmentId: department.id,
        },
      });
      console.log(`✅ Updated ${developerEmail}`);
    } else {
      developerUser = await prisma.user.create({
        data: {
          email: developerEmail,
          name: 'Developer Zenora',
          firstName: 'Developer',
          lastName: 'Zenora',
          password: '', // Passwordless auth
          role: 'EMPLOYEE',
          status: 'ACTIVE',
          tenantId: tenant.id,
          departmentId: department.id,
          employeeId: employeeNumber,
          emailVerified: true,
        },
      });
      console.log(`✅ Created ${developerEmail} as EMPLOYEE`);
    }

    // Create employee record if not exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { userId: developerUser.id },
    });

    if (!existingEmployee) {
      await prisma.employee.create({
        data: {
          userId: developerUser.id,
          tenantId: tenant.id,
          departmentId: department.id,
          employeeNumber: employeeNumber,
          jobTitle: 'Software Developer',
          employmentType: 'FULL_TIME',
          startDate: new Date(),
          status: 'ACTIVE',
          emergencyContacts: {},
        },
      });
      console.log('✅ Created employee record');
    } else {
      console.log('⏭️  Employee record already exists');
    }

    // Display user info
    console.log('\n📋 User Details:\n');
    const userDetails = await prisma.user.findUnique({
      where: { email: developerEmail },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        tenantId: true,
        departmentId: true,
        employeeId: true,
      },
    });

    const tenantInfo = await prisma.tenant.findUnique({
      where: { id: userDetails?.tenantId || '' },
      select: { name: true },
    });

    const deptInfo = await prisma.department.findUnique({
      where: { id: userDetails?.departmentId || '' },
      select: { name: true },
    });

    const empInfo = await prisma.employee.findUnique({
      where: { userId: developerUser.id },
      select: { jobTitle: true, employmentType: true },
    });

    console.log({
      email: userDetails?.email,
      name: `${userDetails?.firstName} ${userDetails?.lastName}`,
      role: userDetails?.role,
      status: userDetails?.status,
      tenant: tenantInfo?.name,
      department: deptInfo?.name,
      jobTitle: empInfo?.jobTitle,
      employmentType: empInfo?.employmentType,
    });

    console.log('\n✅ Developer user added successfully!');
    console.log('\n🔐 Login Instructions:');
    console.log('1. Go to /auth/login');
    console.log('2. Enter email: developer@zenora.ai');
    console.log('3. Check your email for the 6-digit OTP code');
    console.log('4. Enter the code to login');

  } catch (error) {
    console.error('❌ Error adding developer user:', error);
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
