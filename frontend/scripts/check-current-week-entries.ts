import { PrismaClient } from '@prisma/client';
import { startOfWeek, endOfWeek, format, addDays } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  try {
    // Get current week (Monday start, like the UI)
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // 1 = Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    console.log('='.repeat(80));
    console.log('CURRENT WEEK ANALYSIS');
    console.log('='.repeat(80));
    console.log('');
    console.log('Today:', format(now, 'EEEE, MMMM d, yyyy'));
    console.log('Week Start (Monday):', format(weekStart, 'EEEE, MMMM d, yyyy'));
    console.log('Week End (Sunday):', format(weekEnd, 'EEEE, MMMM d, yyyy'));
    console.log('');
    console.log('Days in this week:');
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      console.log('  ' + format(day, 'EEE MMM d') + ' → ' + format(day, 'yyyy-MM-dd'));
    }
    console.log('');
    console.log('-'.repeat(80));
    console.log('');

    // Get Vijay's user
    const user = await prisma.user.findFirst({
      where: {
        email: 'vijay.n@idwteam.com'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    // Convert to UTC format like the API does
    const startDateStr = format(weekStart, 'yyyy-MM-dd');
    const endDateStr = format(weekEnd, 'yyyy-MM-dd');

    console.log('API Query Parameters:');
    console.log('  startDate:', startDateStr);
    console.log('  endDate:', endDateStr);
    console.log('');

    // Query like the API does
    const startDateUTC = new Date(startDateStr + 'T00:00:00.000Z');
    const endDateUTC = new Date(endDateStr + 'T23:59:59.999Z');

    const entries = await prisma.timesheetEntry.findMany({
      where: {
        userId: user.id,
        workDate: {
          gte: startDateUTC,
          lte: endDateUTC,
        },
      },
      select: {
        id: true,
        workDate: true,
        hoursWorked: true,
        description: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        workDate: 'asc'
      }
    });

    console.log('Entries Found for Current Week:', entries.length);
    console.log('');

    if (entries.length === 0) {
      console.log('NO ENTRIES FOUND FOR CURRENT WEEK!');
      console.log('');
      console.log('This explains why calendar shows "No entries"');
    } else {
      entries.forEach((entry, index) => {
        const normalizedDate = entry.workDate.toISOString().split('T')[0];
        console.log((index + 1) + '. Entry:');
        console.log('   Work Date:', normalizedDate);
        console.log('   Day:', format(entry.workDate, 'EEEE'));
        console.log('   Hours:', entry.hoursWorked);
        console.log('   Status:', entry.status);
        console.log('   Description:', entry.description?.substring(0, 50));
        console.log('');
      });
    }

    console.log('-'.repeat(80));
    console.log('');

    // Check all entries
    const allEntries = await prisma.timesheetEntry.findMany({
      where: {
        userId: user.id
      },
      select: {
        id: true,
        workDate: true,
        hoursWorked: true,
        status: true
      },
      orderBy: {
        workDate: 'desc'
      },
      take: 10
    });

    console.log('All Recent Entries (Last 10):');
    console.log('');
    allEntries.forEach((entry, index) => {
      const normalizedDate = entry.workDate.toISOString().split('T')[0];
      const isInCurrentWeek = entry.workDate >= startDateUTC && entry.workDate <= endDateUTC;
      console.log((index + 1) + '. ' + normalizedDate + ' (' + entry.hoursWorked + 'h) - ' + entry.status +
                  (isInCurrentWeek ? ' ← IN CURRENT WEEK' : ''));
    });

    console.log('');
    console.log('='.repeat(80));
    console.log('CONCLUSION:');
    console.log('');
    if (entries.length === 0) {
      console.log('✗ No entries exist for the current week (Dec 9-15)');
      console.log('✓ Latest entry is for Dec 8 (previous week)');
      console.log('');
      console.log('SOLUTION: Navigate to previous week or add entry for current week');
    } else {
      console.log('✓ Entries exist for current week and should be visible');
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
