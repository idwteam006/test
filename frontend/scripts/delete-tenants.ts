/**
 * Script to completely delete add-technologies and demo-org tenants
 * with all their related data
 *
 * Run with: npx tsx scripts/delete-tenants.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANTS_TO_DELETE = ['add-technologies', 'demo-org'];

async function deleteTenants() {
  console.log('\n🗑️  TENANT DELETION SCRIPT\n');
  console.log('Tenants to delete:', TENANTS_TO_DELETE.join(', '));
  console.log('─'.repeat(60));

  try {
    // Find tenants to delete
    const tenants = await prisma.tenant.findMany({
      where: {
        slug: { in: TENANTS_TO_DELETE }
      },
      include: {
        settings: true,
      }
    });

    if (tenants.length === 0) {
      console.log('❌ No matching tenants found. Nothing to delete.');
      return;
    }

    console.log(`\n📋 Found ${tenants.length} tenant(s) to delete:\n`);
    for (const tenant of tenants) {
      console.log(`  • ${tenant.settings?.companyName || tenant.name} (${tenant.slug})`);
      console.log(`    ID: ${tenant.id}`);
    }

    const tenantIds = tenants.map(t => t.id);

    console.log('\n⚠️  Starting deletion process...\n');

    for (const tenantId of tenantIds) {
      const tenant = tenants.find(t => t.id === tenantId);
      console.log(`\n  Processing tenant: ${tenant?.settings?.companyName || tenant?.name}`);
      console.log(`  ID: ${tenantId}`);
      console.log('  ' + '─'.repeat(50));

      // Get all user IDs for this tenant
      const users = await prisma.user.findMany({
        where: { tenantId },
        select: { id: true }
      });
      const userIds = users.map(u => u.id);

      // Get all employee IDs for this tenant
      const employeeRecords = await prisma.employee.findMany({
        where: { tenantId },
        select: { id: true }
      });
      const employeeIds = employeeRecords.map(e => e.id);

      // 1. Delete sessions
      if (userIds.length > 0) {
        const sessions = await prisma.session.deleteMany({
          where: { userId: { in: userIds } }
        });
        console.log(`    ✓ Sessions: ${sessions.count}`);

        // 2. Delete magic links
        const magicLinks = await prisma.magicLink.deleteMany({
          where: { userId: { in: userIds } }
        });
        console.log(`    ✓ Magic links: ${magicLinks.count}`);
      }

      // 3. Delete notifications
      const notifications = await prisma.notification.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Notifications: ${notifications.count}`);

      // 4. Delete file uploads
      const fileUploads = await prisma.fileUpload.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ File uploads: ${fileUploads.count}`);

      // 5. Delete attendance records
      const attendance = await prisma.attendance.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Attendance: ${attendance.count}`);

      // 6. Delete time entries
      const timeEntries = await prisma.timeEntry.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Time entries: ${timeEntries.count}`);

      // 7. Delete timesheet entries
      const timesheetEntries = await prisma.timesheetEntry.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Timesheet entries: ${timesheetEntries.count}`);

      // 8. Delete timesheet templates
      const timesheetTemplates = await prisma.timesheetTemplate.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Timesheet templates: ${timesheetTemplates.count}`);

      // 9. Delete expense claims
      const expenses = await prisma.expenseClaim.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Expense claims: ${expenses.count}`);

      // 10. Delete leave requests
      const leaveRequests = await prisma.leaveRequest.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Leave requests: ${leaveRequests.count}`);

      // 11. Delete leave balances
      const leaveBalances = await prisma.leaveBalance.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Leave balances: ${leaveBalances.count}`);

      // 12. Delete payroll records
      const payroll = await prisma.payrollRecord.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Payroll records: ${payroll.count}`);

      // 13. Delete performance reviews
      const reviews = await prisma.performanceReview.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Performance reviews: ${reviews.count}`);

      // 14. Delete goals
      const goals = await prisma.goal.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Goals: ${goals.count}`);

      // 15. Delete meeting attendees
      const meetingAttendees = await prisma.meetingAttendee.deleteMany({
        where: { meeting: { tenantId } }
      });
      console.log(`    ✓ Meeting attendees: ${meetingAttendees.count}`);

      // 16. Delete meetings
      const meetings = await prisma.meeting.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Meetings: ${meetings.count}`);

      // 17. Delete tasks
      const tasks = await prisma.task.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Tasks: ${tasks.count}`);

      // 18. Delete project assignments
      const projAssignments = await prisma.projectAssignment.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Project assignments: ${projAssignments.count}`);

      // 19. Delete invoice line items
      const invoiceLines = await prisma.invoiceLineItem.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Invoice line items: ${invoiceLines.count}`);

      // 20. Delete invoices
      const invoices = await prisma.invoice.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Invoices: ${invoices.count}`);

      // 21. Delete projects
      const projects = await prisma.project.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Projects: ${projects.count}`);

      // 22. Delete clients
      const clients = await prisma.client.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Clients: ${clients.count}`);

      // 23. Delete team join requests
      const teamJoinRequests = await prisma.teamJoinRequest.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Team join requests: ${teamJoinRequests.count}`);

      // 24. Delete team members
      const teamMembers = await prisma.teamMember.deleteMany({
        where: { team: { tenantId } }
      });
      console.log(`    ✓ Team members: ${teamMembers.count}`);

      // 25. Delete teams
      const teams = await prisma.team.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Teams: ${teams.count}`);

      // 26. Delete course completions
      if (employeeIds.length > 0) {
        const courseCompletions = await prisma.courseCompletion.deleteMany({
          where: { employeeId: { in: employeeIds } }
        });
        console.log(`    ✓ Course completions: ${courseCompletions.count}`);
      }

      // 27. Delete onboarding invites
      const invites = await prisma.onboardingInvite.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Onboarding invites: ${invites.count}`);

      // 28. Delete employee profiles
      const profiles = await prisma.employeeProfile.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Employee profiles: ${profiles.count}`);

      // 29. Clear manager references in employees
      await prisma.employee.updateMany({
        where: { tenantId },
        data: { managerId: null }
      });
      console.log(`    ✓ Cleared manager references`);

      // 30. Delete employees
      const employees = await prisma.employee.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Employees: ${employees.count}`);

      // 31. Delete users
      const usersDeleted = await prisma.user.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Users: ${usersDeleted.count}`);

      // 32. Delete departments
      const departments = await prisma.department.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Departments: ${departments.count}`);

      // 33. Delete tenant settings
      const settings = await prisma.tenantSettings.deleteMany({
        where: { tenantId }
      });
      console.log(`    ✓ Tenant settings: ${settings.count}`);

      // 34. Delete tenant
      await prisma.tenant.delete({
        where: { id: tenantId }
      });
      console.log(`    ✓ Tenant deleted`);
    }

    console.log('\n✅ Successfully deleted all data for:', TENANTS_TO_DELETE.join(', '));

    // Verify deletion
    console.log('\n🔍 Verifying deletion...');
    const remainingTenants = await prisma.tenant.findMany({
      where: { slug: { in: TENANTS_TO_DELETE } }
    });

    if (remainingTenants.length === 0) {
      console.log('  ✓ All specified tenants have been deleted');
    } else {
      console.log('  ⚠️ Some tenants were not deleted:', remainingTenants.map(t => t.slug).join(', '));
    }

  } catch (error) {
    console.error('\n❌ Error during deletion:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteTenants();
