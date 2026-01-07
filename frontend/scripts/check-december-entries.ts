import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('='.repeat(80));
    console.log('DECEMBER 2025 TIMESHEET ENTRIES - vijay.n@idwteam.com');
    console.log('='.repeat(80));
    console.log('');

    // Get Vijay's user
    const user = await prisma.user.findFirst({
      where: {
        email: 'vijay.n@idwteam.com'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✓ User:', user.firstName, user.lastName);
    console.log('  Email:', user.email);
    console.log('  ID:', user.id);
    console.log('');

    // Get all December 2025 entries
    const decemberStart = new Date('2025-12-01T00:00:00.000Z');
    const decemberEnd = new Date('2025-12-31T23:59:59.999Z');

    const entries = await prisma.timesheetEntry.findMany({
      where: {
        userId: user.id,
        workDate: {
          gte: decemberStart,
          lte: decemberEnd,
        },
      },
      select: {
        id: true,
        workDate: true,
        hoursWorked: true,
        description: true,
        status: true,
        createdAt: true,
        project: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        workDate: 'asc'
      }
    });

    console.log('-'.repeat(80));
    console.log('DECEMBER 2025 ENTRIES:', entries.length);
    console.log('-'.repeat(80));
    console.log('');

    if (entries.length === 0) {
      console.log('❌ No entries found for December 2025');
    } else {
      // Group by week
      const weekMap = new Map<string, typeof entries>();

      entries.forEach(entry => {
        const date = new Date(entry.workDate);
        const weekStart = getMonday(date);
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weekMap.has(weekKey)) {
          weekMap.set(weekKey, []);
        }
        weekMap.get(weekKey)!.push(entry);
      });

      // Display by week
      Array.from(weekMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([weekStart, weekEntries], weekIndex) => {
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);

          console.log(`Week ${weekIndex + 1}: ${weekStart} to ${weekEnd.toISOString().split('T')[0]}`);
          console.log('─'.repeat(80));

          weekEntries.forEach((entry, index) => {
            const normalizedDate = entry.workDate.toISOString().split('T')[0];
            const dayName = new Date(entry.workDate).toLocaleDateString('en-US', { weekday: 'long' });

            console.log(`  ${index + 1}. ${normalizedDate} (${dayName})`);
            console.log(`     Hours: ${entry.hoursWorked}h`);
            console.log(`     Status: ${entry.status}`);
            console.log(`     Project: ${entry.project?.name || 'N/A'}`);
            console.log(`     Description: ${entry.description?.substring(0, 60) || 'N/A'}`);
            console.log('');
          });

          const weekTotal = weekEntries.reduce((sum, e) => sum + e.hoursWorked, 0);
          console.log(`  Week Total: ${weekTotal}h`);
          console.log('');
        });

      // Summary
      const draftCount = entries.filter(e => e.status === 'DRAFT').length;
      const submittedCount = entries.filter(e => e.status === 'SUBMITTED').length;
      const approvedCount = entries.filter(e => e.status === 'APPROVED').length;
      const totalHours = entries.reduce((sum, e) => sum + e.hoursWorked, 0);

      console.log('-'.repeat(80));
      console.log('DECEMBER 2025 SUMMARY:');
      console.log('  Total Entries:', entries.length);
      console.log('  Total Hours:', totalHours);
      console.log('');
      console.log('  By Status:');
      console.log('    DRAFT:', draftCount, `(${draftCount * 8}h)`);
      console.log('    SUBMITTED:', submittedCount, `(${submittedCount * 8}h)`);
      console.log('    APPROVED:', approvedCount, `(${approvedCount * 8}h)`);
      console.log('-'.repeat(80));

      // Show current week details
      const today = new Date();
      const currentWeekStart = getMonday(today);
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);

      console.log('');
      console.log('CURRENT WEEK: ', currentWeekStart.toISOString().split('T')[0], 'to', currentWeekEnd.toISOString().split('T')[0]);

      const currentWeekEntries = entries.filter(e => {
        const entryDate = new Date(e.workDate);
        return entryDate >= currentWeekStart && entryDate <= currentWeekEnd;
      });

      if (currentWeekEntries.length > 0) {
        console.log('✓ Current week has', currentWeekEntries.length, 'entries');
        currentWeekEntries.forEach(e => {
          console.log('  -', e.workDate.toISOString().split('T')[0], ':', e.hoursWorked, 'hours -', e.status);
        });
      } else {
        console.log('⚠ No entries for current week');
      }
    }

    console.log('');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(d.setUTCDate(diff));
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

main();
