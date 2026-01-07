import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        email: 'vijay.n@idwteam.com'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        tenantId: true
      }
    });

    if (!user) {
      console.log('User vijay.n@idwteam.com not found');
      return;
    }

    console.log('User found:');
    console.log(JSON.stringify(user, null, 2));
    console.log('\n================================================================================\n');

    const latestEntry = await prisma.timesheetEntry.findFirst({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        task: {
          select: {
            id: true,
            name: true
          }
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!latestEntry) {
      console.log('No timesheet entries found for this user');
      return;
    }

    console.log('Latest Timesheet Entry:');
    console.log(JSON.stringify(latestEntry, null, 2));
    console.log('\n================================================================================\n');

    const allEntries = await prisma.timesheetEntry.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        workDate: 'desc'
      },
      select: {
        id: true,
        workDate: true,
        hoursWorked: true,
        status: true,
        description: true,
        createdAt: true,
        project: {
          select: {
            name: true
          }
        }
      },
      take: 10
    });

    console.log('Total entries retrieved:', allEntries.length);
    console.log('\nLast 10 entries summary:');
    allEntries.forEach((entry, index) => {
      console.log('\nEntry', index + 1);
      console.log('  ID:', entry.id);
      console.log('  Work Date:', entry.workDate.toISOString().split('T')[0]);
      console.log('  Hours:', entry.hoursWorked);
      console.log('  Status:', entry.status);
      console.log('  Project:', entry.project?.name || 'N/A');
      console.log('  Description:', entry.description?.substring(0, 60));
      console.log('  Created:', entry.createdAt.toISOString());
    });

    console.log('\n================================================================================\n');
    const statusCounts = await prisma.timesheetEntry.groupBy({
      by: ['status'],
      where: {
        userId: user.id
      },
      _count: {
        status: true
      },
      _sum: {
        hoursWorked: true
      }
    });

    console.log('Entries by Status:');
    statusCounts.forEach(stat => {
      console.log('  ' + stat.status + ':', stat._count.status, 'entries,', stat._sum.hoursWorked, 'total hours');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
