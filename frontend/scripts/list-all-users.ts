// Load environment variables
import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        department: true,
        employee: true,
      },
      orderBy: {
        role: 'asc',
      },
    });

    console.log('\n📋 Active Users:');
    console.log('='.repeat(80));

    users.forEach((user) => {
      console.log(`\n${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Department: ${user.department?.name || 'None'}`);
      console.log(`  Has Employee Record: ${user.employee ? 'Yes' : 'No'}`);
      if (user.employee) {
        console.log(`  Employee Number: ${user.employee.employeeNumber}`);
        console.log(`  Job Title: ${user.employee.jobTitle}`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log(`Total: ${users.length} active users`);
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
