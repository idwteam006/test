import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeRejectedEntries() {
  try {
    const email = 'sneha.pm@addtechno.com';

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        tenantId: true,
        employeeId: true,
      },
    });

    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    console.log('\n=== USER INFO ===');
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Email: ${user.email}`);
    console.log(`Employee ID: ${user.employeeId}`);
    console.log(`Tenant ID: ${user.tenantId}`);

    // Get rejected entries
    const rejectedEntries = await prisma.timesheetEntry.findMany({
      where: {
        userId: user.id,
        status: 'REJECTED',
      },
      include: {
        project: { select: { name: true, projectCode: true } },
        task: { select: { name: true } },
        approver: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { approvedAt: 'desc' },
    });

    console.log(`\n=== REJECTED ENTRIES (${rejectedEntries.length}) ===`);
    rejectedEntries.forEach((entry, index) => {
      console.log(`\n[${index + 1}] Entry ID: ${entry.id}`);
      console.log(`  Date: ${new Date(entry.workDate).toLocaleDateString()}`);
      console.log(`  Hours: ${entry.hoursWorked}h`);
      console.log(`  Description: ${entry.description.substring(0, 100)}${entry.description.length > 100 ? '...' : ''}`);
      console.log(`  Project: ${entry.project?.name || 'N/A'}`);
      console.log(`  Category: ${entry.rejectionCategory || 'Not specified'}`);
      console.log(`  Reason: ${entry.rejectedReason || 'N/A'}`);
      console.log(`  Rejected by: ${entry.approver ? `${entry.approver.firstName} ${entry.approver.lastName} (${entry.approver.email})` : 'N/A'}`);
      console.log(`  Rejected at: ${entry.approvedAt ? new Date(entry.approvedAt).toLocaleString() : 'N/A'}`);
    });

    // Get rejection history
    const rejectionHistory = await prisma.timesheetRejectionHistory.findMany({
      where: {
        timesheetEntry: { userId: user.id },
      },
      include: {
        rejector: { select: { firstName: true, lastName: true, email: true } },
        timesheetEntry: {
          select: {
            id: true,
            workDate: true,
            hoursWorked: true,
            description: true,
            status: true,
          },
        },
      },
      orderBy: { rejectedAt: 'desc' },
    });

    console.log(`\n=== REJECTION HISTORY (${rejectionHistory.length} events) ===`);
    rejectionHistory.forEach((record, index) => {
      console.log(`\n[${index + 1}] History ID: ${record.id}`);
      console.log(`  Entry ID: ${record.timesheetEntryId}`);
      console.log(`  Date: ${new Date(record.timesheetEntry.workDate).toLocaleDateString()}`);
      console.log(`  Hours: ${record.timesheetEntry.hoursWorked}h`);
      console.log(`  Current Status: ${record.timesheetEntry.status}`);
      console.log(`  Category: ${record.rejectionCategory || 'Not specified'}`);
      console.log(`  Reason: ${record.rejectionReason}`);
      console.log(`  Rejected by: ${record.rejector.firstName} ${record.rejector.lastName}`);
      console.log(`  Rejected at: ${new Date(record.rejectedAt).toLocaleString()}`);
      console.log(`  Resolved: ${record.resolvedAt ? new Date(record.resolvedAt).toLocaleString() : 'Not yet'}`);
    });

    // Statistics
    const allEntries = await prisma.timesheetEntry.findMany({
      where: { userId: user.id },
      select: { status: true },
    });

    console.log('\n=== STATISTICS ===');
    console.log(`Total entries: ${allEntries.length}`);
    console.log(`DRAFT: ${allEntries.filter(e => e.status === 'DRAFT').length}`);
    console.log(`SUBMITTED: ${allEntries.filter(e => e.status === 'SUBMITTED').length}`);
    console.log(`APPROVED: ${allEntries.filter(e => e.status === 'APPROVED').length}`);
    console.log(`REJECTED: ${allEntries.filter(e => e.status === 'REJECTED').length}`);
    console.log(`INVOICED: ${allEntries.filter(e => e.status === 'INVOICED').length}`);
    if (allEntries.length > 0) {
      console.log(`Rejection rate: ${((rejectedEntries.length / allEntries.length) * 100).toFixed(2)}%`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeRejectedEntries();
