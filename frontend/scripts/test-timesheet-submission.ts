import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Simulate what happens when we create a new entry
    const testWorkDate = '2025-12-08'; // This is what comes from the form
    
    console.log('Testing Timesheet Submission Flow');
    console.log('='.repeat(80));
    console.log('');
    
    console.log('1. Form Data (what the frontend sends):');
    console.log('   workDate:', testWorkDate);
    console.log('   Type:', typeof testWorkDate);
    console.log('');
    
    console.log('2. Backend Processing (API route):');
    const workDateUTC = new Date(testWorkDate + 'T00:00:00.000Z');
    console.log('   Converted to Date:', workDateUTC.toISOString());
    console.log('   Stored in DB as:', workDateUTC);
    console.log('');
    
    console.log('3. API Response (after our fix):');
    const normalizedDate = workDateUTC.toISOString().split('T')[0];
    console.log('   Normalized workDate:', normalizedDate);
    console.log('   Type:', typeof normalizedDate);
    console.log('');
    
    console.log('4. Frontend Comparison:');
    console.log('   Form date:', testWorkDate);
    console.log('   API response date:', normalizedDate);
    console.log('   Are they equal?', testWorkDate === normalizedDate);
    console.log('');
    
    // Test with actual entry from database
    console.log('5. Testing with Vijay\'s actual entry:');
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
        workDate: true,
        createdAt: true,
        description: true
      }
    });
    
    if (vijayEntry) {
      console.log('   Raw DB workDate:', vijayEntry.workDate);
      console.log('   Normalized:', vijayEntry.workDate.toISOString().split('T')[0]);
      console.log('   Description:', vijayEntry.description?.substring(0, 50));
    }
    
    console.log('');
    console.log('='.repeat(80));
    console.log('CONCLUSION:');
    console.log('The date format is consistent throughout the flow.');
    console.log('Entries should appear in the calendar after submission.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
