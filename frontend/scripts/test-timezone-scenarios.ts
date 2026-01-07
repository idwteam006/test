// Test how different timezones affect the date display

const testDate = "2025-12-08T00:00:00.000Z"; // Database value
const normalizedDate = "2025-12-08"; // Our normalized API response

console.log('='.repeat(80));
console.log('TIMEZONE SCENARIO TESTING');
console.log('='.repeat(80));
console.log('');

// Simulate what happens in different timezones
const timezones = [
  { name: 'India (IST)', offset: 330, zone: 'Asia/Kolkata' },
  { name: 'London (GMT)', offset: 0, zone: 'Europe/London' },
  { name: 'Berlin (CET)', offset: 60, zone: 'Europe/Berlin' },
  { name: 'Tokyo (JST)', offset: 540, zone: 'Asia/Tokyo' },
  { name: 'Shanghai (CST)', offset: 480, zone: 'Asia/Shanghai' },
  { name: 'San Francisco (PST)', offset: -480, zone: 'America/Los_Angeles' },
  { name: 'Mountain View (PST)', offset: -480, zone: 'America/Los_Angeles' },
  { name: 'Sao Paulo (BRT)', offset: -180, zone: 'America/Sao_Paulo' },
];

console.log('DATABASE STORED VALUE:');
console.log('  ' + testDate);
console.log('');

console.log('API RESPONSE (After Normalization):');
console.log('  ' + normalizedDate);
console.log('');

console.log('='.repeat(80));
console.log('HOW BROWSER INTERPRETS DATES IN DIFFERENT TIMEZONES:');
console.log('='.repeat(80));
console.log('');

timezones.forEach(tz => {
  const date = new Date(testDate);

  // Format in the specific timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz.zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const formatted = formatter.format(date);
  const parts = formatted.split(',')[0].split('/');
  const displayDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;

  console.log(tz.name.padEnd(25));
  console.log('  Local time: ' + formatted);
  console.log('  Extracted date: ' + displayDate);
  console.log('  Matches "2025-12-08"? ' + (displayDate === '2025-12-08' ? '✓ YES' : '✗ NO - WRONG DATE!'));
  console.log('');
});

console.log('='.repeat(80));
console.log('THE PROBLEM:');
console.log('='.repeat(80));
console.log('');
console.log('When browser in PST timezone (UTC-8) parses "2025-12-08T00:00:00.000Z":');
console.log('  UTC: December 8, 2025 at 00:00');
console.log('  PST: December 7, 2025 at 16:00 (previous day!)');
console.log('');
console.log('The browser\'s Date object shows Dec 7, not Dec 8!');
console.log('');

console.log('='.repeat(80));
console.log('FRONTEND CODE ISSUE:');
console.log('='.repeat(80));
console.log('');
console.log('Current code in page.tsx (line 94):');
console.log('  const [currentWeekStart, setCurrentWeekStart] = useState(');
console.log('    startOfWeek(new Date(), { weekStartsOn: 1 })');
console.log('  );');
console.log('');
console.log('The problem: "new Date()" uses browser timezone!');
console.log('');
console.log('In PST: new Date() → Dec 7 at 16:00 (if UTC is Dec 8 00:00)');
console.log('In IST: new Date() → Dec 8 at 05:30 (if UTC is Dec 8 00:00)');
console.log('');
console.log('This affects:');
console.log('  1. Which week is considered "current"');
console.log('  2. Date comparisons in getEntriesForDate()');
console.log('  3. format(date, "yyyy-MM-dd") output');
console.log('');

console.log('='.repeat(80));
console.log('SOLUTION NEEDED:');
console.log('='.repeat(80));
console.log('');
console.log('1. Use UTC dates consistently throughout frontend');
console.log('2. When comparing dates, always use string comparison');
console.log('3. Never use "new Date()" for date logic - use Date objects carefully');
console.log('4. API already returns "2025-12-08" - use it directly!');
console.log('');
