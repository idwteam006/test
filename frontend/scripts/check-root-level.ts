import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'vijay.n@idwteam.com' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      employee: {
        select: {
          id: true,
          managerId: true,
          manager: {
            select: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('User:', user.firstName, user.lastName);
  console.log('Role:', user.role);
  console.log('Employee record:', user.employee ? 'Yes' : 'No');

  if (user.employee) {
    console.log('Manager ID:', user.employee.managerId || 'NULL (Root Level)');
    if (user.employee.manager) {
      console.log('Manager:', user.employee.manager.user.firstName, user.employee.manager.user.lastName);
    } else {
      console.log('*** This is a ROOT LEVEL employee (no manager) ***');
    }
  }

  // Count submitted timesheets
  const submittedCount = await prisma.timesheetEntry.count({
    where: {
      userId: user.id,
      status: 'SUBMITTED'
    }
  });

  console.log('\nSubmitted timesheets:', submittedCount);
}

main().finally(() => prisma.$disconnect());
