// Load environment variables
import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteUser(email: string) {
  try {
    console.log(`Searching for user with email: ${email}...`);

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        employee: true,
      }
    });

    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      return;
    }

    console.log(`Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`Role: ${user.role}, Status: ${user.status}`);

    // Delete associated employee record if exists
    if (user.employeeId) {
      console.log(`Deleting employee record ${user.employeeId}...`);
      await prisma.employee.delete({
        where: { id: user.employeeId }
      });
      console.log('✓ Employee record deleted');
    }

    // Delete the user
    console.log(`Deleting user ${user.id}...`);
    await prisma.user.delete({
      where: { id: user.id }
    });

    console.log(`✓ User ${email} deleted successfully!`);
  } catch (error: any) {
    console.error('Error deleting user:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2] || 'tech@addtechno.com';
deleteUser(email);
