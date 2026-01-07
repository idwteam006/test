// Load environment variables
import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('Usage: npx tsx scripts/check-user-by-email.ts <email>');
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenant: true,
        department: true,
        employee: {
          include: {
            department: true,
          }
        },
      },
    });

    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      return;
    }

    console.log('\n✅ User found:');
    console.log('ID:', user.id);
    console.log('Name:', user.firstName, user.lastName);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Status:', user.status);
    console.log('Tenant:', user.tenant.name);
    console.log('Department:', user.department?.name || 'None');
    console.log('Employee ID:', user.employeeId);
    console.log('Employee Record:', user.employee ? 'Yes' : 'No');
    if (user.employee) {
      console.log('  - Employee Number:', user.employee.employeeNumber);
      console.log('  - Job Title:', user.employee.jobTitle);
      console.log('  - Department:', user.employee.department?.name || 'None');
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
