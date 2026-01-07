import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testVijayApproval() {
  const user = await prisma.user.findUnique({
    where: { email: 'vijay.n@idwteam.com' },
    select: { id: true, name: true, tenantId: true }
  });

  if (!user) {
    console.log('User not found');
    await prisma.$disconnect();
    return;
  }

  console.log('=== User ===');
  console.log('Name:', user.name);
  console.log('User ID:', user.id);
  console.log('Tenant ID:', user.tenantId);

  // Check employee record
  const employee = await prisma.employee.findFirst({
    where: { userId: user.id, tenantId: user.tenantId },
    select: { id: true, managerId: true }
  });

  console.log('\n=== Employee Record ===');
  console.log('Employee ID:', employee?.id);
  console.log('Manager ID:', employee?.managerId || 'None (ROOT LEVEL)');
  console.log('Is Root Level:', !employee?.managerId);

  // Check for any SUBMITTED timesheets
  const submittedTimesheets = await prisma.timesheetEntry.findMany({
    where: {
      userId: user.id,
      status: 'SUBMITTED'
    }
  });

  console.log('\n=== SUBMITTED Timesheets ===');
  console.log('Count:', submittedTimesheets.length);

  if (submittedTimesheets.length === 0) {
    console.log('\n>>> Creating a test SUBMITTED timesheet entry...');

    const testEntry = await prisma.timesheetEntry.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        workDate: new Date('2025-12-03'),
        hoursWorked: 6,
        description: 'Test entry for self-approval verification',
        workType: 'REGULAR',
        isBillable: true,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      }
    });

    console.log('Created test entry:', testEntry.id);
    console.log('Status:', testEntry.status);
    console.log('Work Date:', testEntry.workDate);
  }

  // Now check what the API would return
  console.log('\n=== Simulating API Query ===');

  // This is what the API does
  const currentUserEmployee = await prisma.employee.findFirst({
    where: {
      userId: user.id,
      tenantId: user.tenantId,
    },
    select: { id: true, managerId: true },
  });

  const isRootLevelUser = !currentUserEmployee?.managerId;
  console.log('isRootLevelUser:', isRootLevelUser);

  const directReports = await prisma.employee.findMany({
    where: {
      tenantId: user.tenantId,
      managerId: currentUserEmployee?.id,
    },
    select: { userId: true },
  });

  const directReportUserIds = directReports
    .map((emp) => emp.userId)
    .filter((id): id is string => id !== null);

  console.log('Direct Reports Count:', directReportUserIds.length);
  console.log('Direct Report User IDs:', directReportUserIds);

  // Build where clause like the API
  const whereClause: any = {
    tenantId: user.tenantId,
    status: 'SUBMITTED',
  };

  if (isRootLevelUser && directReportUserIds.length === 0) {
    whereClause.userId = user.id;
    console.log('Query: Root user with no direct reports - querying own timesheets');
  } else if (isRootLevelUser) {
    whereClause.userId = { in: [...directReportUserIds, user.id] };
    console.log('Query: Root user with direct reports - querying own + direct reports');
  } else {
    whereClause.userId = { in: directReportUserIds };
    console.log('Query: Regular user - querying direct reports only');
  }

  console.log('\nWhere Clause:', JSON.stringify(whereClause, null, 2));

  // Execute the query
  const pendingEntries = await prisma.timesheetEntry.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  console.log('\n=== Query Results ===');
  console.log('Pending Entries Found:', pendingEntries.length);

  pendingEntries.forEach((entry, i) => {
    console.log(`\n${i + 1}. Entry ID: ${entry.id}`);
    console.log(`   User: ${entry.user.firstName} ${entry.user.lastName} (${entry.user.email})`);
    console.log(`   Date: ${entry.workDate}`);
    console.log(`   Hours: ${entry.hoursWorked}`);
    console.log(`   Status: ${entry.status}`);
  });

  await prisma.$disconnect();
}

testVijayApproval().catch(console.error);
