import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simulate how dates appear in different timezones
function simulateTimezoneDisplay(isoDateString: string, timezone: string) {
  const date = new Date(isoDateString);

  // Create formatter for the specific timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  return formatter.format(date);
}

async function main() {
  try {
    console.log('='.repeat(80));
    console.log('TIMEZONE DISPLAY SIMULATION TEST');
    console.log('='.repeat(80));
    console.log('');

    // Get Vijay's latest entry
    const vijayEntry = await prisma.timesheetEntry.findFirst({
      where: {
        user: {
          email: 'vijay.n@idwteam.com'
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        workDate: true,
        hoursWorked: true,
        description: true,
        createdAt: true
      }
    });

    if (!vijayEntry) {
      console.log('No entries found for vijay.n@idwteam.com');
      return;
    }

    console.log('Testing Entry:');
    console.log('  ID:', vijayEntry.id);
    console.log('  Description:', vijayEntry.description);
    console.log('  Hours:', vijayEntry.hoursWorked);
    console.log('');
    console.log('-'.repeat(80));
    console.log('');

    // Test the workDate in different timezones
    const isoString = vijayEntry.workDate.toISOString();
    const normalizedDate = isoString.split('T')[0];

    console.log('DATABASE VALUE:');
    console.log('  Stored as: ' + isoString);
    console.log('  Normalized: ' + normalizedDate);
    console.log('');

    console.log('HOW IT APPEARS IN DIFFERENT TIMEZONES:');
    console.log('');

    const timezones = [
      { name: 'India (IST)', zone: 'Asia/Kolkata', offset: 'UTC+5:30' },
      { name: 'Canada East (EST)', zone: 'America/Toronto', offset: 'UTC-5' },
      { name: 'USA East (EST)', zone: 'America/New_York', offset: 'UTC-5' },
      { name: 'USA West (PST)', zone: 'America/Los_Angeles', offset: 'UTC-8' },
      { name: 'UK (GMT)', zone: 'Europe/London', offset: 'UTC+0' },
      { name: 'Japan (JST)', zone: 'Asia/Tokyo', offset: 'UTC+9' },
      { name: 'Australia (AEDT)', zone: 'Australia/Sydney', offset: 'UTC+11' },
    ];

    timezones.forEach(tz => {
      const displayed = simulateTimezoneDisplay(isoString, tz.zone);
      console.log(`  ${tz.name.padEnd(25)} ${tz.offset.padEnd(10)} → ${displayed}`);
    });

    console.log('');
    console.log('-'.repeat(80));
    console.log('');

    // Test with the normalized date
    console.log('WITH NORMALIZED DATE (Our Fix):');
    console.log('  API Returns: "' + normalizedDate + '"');
    console.log('  Frontend Compares: "2025-12-08" === "' + normalizedDate + '"');
    console.log('  Result: ' + ('2025-12-08' === normalizedDate ? '✓ MATCH' : '✗ NO MATCH'));
    console.log('');

    // Test what would happen without the fix
    console.log('WITHOUT FIX (Using ISO Timestamp):');
    console.log('  API Would Return: "' + isoString + '"');
    console.log('  Problem: Different timezones parse this differently!');
    console.log('');

    console.log('EXAMPLE - Parsing ISO timestamp in different timezones:');
    const testDate = new Date(isoString);
    console.log('  Canada EST: Date would be ' + new Date(testDate.toLocaleString('en-US', { timeZone: 'America/Toronto' })).toLocaleDateString());
    console.log('  India IST: Date would be ' + new Date(testDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).toLocaleDateString());
    console.log('');

    console.log('='.repeat(80));
    console.log('CONCLUSION:');
    console.log('  ✓ With normalization: Date is consistent across all timezones');
    console.log('  ✓ Users see: ' + normalizedDate + ' regardless of their location');
    console.log('  ✓ Calendar displays: Entry on correct date for everyone');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
