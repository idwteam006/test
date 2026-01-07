// Load environment variables
import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createEmployeeRecord() {
  const email = process.argv[2];

  if (!email) {
    console.log('Usage: npx tsx scripts/create-employee-record.ts <email>');
    return;
  }

  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        department: true,
        employee: true,
      },
    });

    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      return;
    }

    if (user.employee) {
      console.log(`✅ User already has an employee record`);
      console.log(`   Employee Number: ${user.employee.employeeNumber}`);
      return;
    }

    console.log(`Creating employee record for ${user.firstName} ${user.lastName}...`);

    // Generate unique employee number
    const totalCount = await prisma.employee.count({
      where: {
        tenantId: user.tenantId,
      },
    });

    const employeeNumber = `EMP-${user.departmentId ? user.department?.name?.substring(0, 3).toUpperCase() : 'GEN'}-${String(totalCount + 1).padStart(3, '0')}`;

    // Create employee record
    const employee = await prisma.employee.create({
      data: {
        user: { connect: { id: user.id } },
        tenant: { connect: { id: user.tenantId } },
        department: user.departmentId ? { connect: { id: user.departmentId } } : undefined,
        employeeNumber,
        jobTitle: 'Employee',
        startDate: new Date(),
        employmentType: 'FULL_TIME',
        status: 'ACTIVE',
        emergencyContacts: [],
      },
    });

    // Update user with employeeId reference
    await prisma.user.update({
      where: { id: user.id },
      data: { employeeId: employee.id },
    });

    console.log(`✅ Employee record created successfully!`);
    console.log(`   Employee Number: ${employeeNumber}`);
    console.log(`   Employee ID: ${employee.id}`);
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createEmployeeRecord();
