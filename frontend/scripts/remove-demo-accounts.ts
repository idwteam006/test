import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeDemoAccounts() {
  try {
    console.log('\n🔍 Searching for accounts with demo.com domain...\n');

    // Find all users with demo.com email domain
    const demoUsers = await prisma.user.findMany({
      where: {
        email: {
          endsWith: '@demo.com'
        }
      },
      include: {
        tenant: true
      }
    });

    if (demoUsers.length === 0) {
      console.log('✅ No accounts found with @demo.com domain');
      return;
    }

    console.log(`📧 Found ${demoUsers.length} account(s) with @demo.com domain:\n`);
    demoUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} <${user.email}>`);
      console.log(`   Tenant: ${user.tenant.name} (${user.tenant.slug})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}\n`);
    });

    // Delete all related data first, then users
    console.log('\n🗑️  Deleting related data...\n');

    const userIds = demoUsers.map(u => u.id);

    // Get employee IDs associated with these users
    const employees = await prisma.employee.findMany({
      where: { userId: { in: userIds } },
      select: { id: true }
    });
    const employeeIds = employees.map(e => e.id);

    console.log(`   Found ${employeeIds.length} employee records to clean up\n`);

    // Delete in the correct order to respect foreign key constraints
    await prisma.$transaction(async (tx) => {
      // Delete employee-related data first
      if (employeeIds.length > 0) {
        // Delete performance reviews
        const deletedReviews = await tx.performanceReview.deleteMany({
          where: {
            OR: [
              { employeeId: { in: employeeIds } },
              { reviewerId: { in: employeeIds } }
            ]
          }
        });
        console.log(`   Deleted ${deletedReviews.count} performance reviews`);

        // Delete time entries
        const deletedTimeEntries = await tx.timeEntry.deleteMany({
          where: { employeeId: { in: employeeIds } }
        });
        console.log(`   Deleted ${deletedTimeEntries.count} time entries`);

        // Delete leave requests
        const deletedLeaveRequests = await tx.leaveRequest.deleteMany({
          where: { employeeId: { in: employeeIds } }
        });
        console.log(`   Deleted ${deletedLeaveRequests.count} leave requests`);

        // Delete project assignments
        const deletedAssignments = await tx.projectAssignment.deleteMany({
          where: { employeeId: { in: employeeIds } }
        });
        console.log(`   Deleted ${deletedAssignments.count} project assignments`);

        // Delete payroll records
        const deletedPayroll = await tx.payrollRecord.deleteMany({
          where: { employeeId: { in: employeeIds } }
        });
        console.log(`   Deleted ${deletedPayroll.count} payroll records`);

        // Delete leave balances
        const deletedLeaveBalances = await tx.leaveBalance.deleteMany({
          where: { employeeId: { in: employeeIds } }
        });
        console.log(`   Deleted ${deletedLeaveBalances.count} leave balances`);

        // Delete goals
        const deletedGoals = await tx.goal.deleteMany({
          where: { employeeId: { in: employeeIds } }
        });
        console.log(`   Deleted ${deletedGoals.count} goals`);

        // Delete meeting attendances
        const deletedMeetingAttendances = await tx.meetingAttendee.deleteMany({
          where: { employeeId: { in: employeeIds } }
        });
        console.log(`   Deleted ${deletedMeetingAttendances.count} meeting attendances`);

        // Delete meetings organized by these employees
        const deletedMeetings = await tx.meeting.deleteMany({
          where: { organizerId: { in: employeeIds } }
        });
        console.log(`   Deleted ${deletedMeetings.count} meetings`);

        // Delete course completions
        const deletedCompletions = await tx.courseCompletion.deleteMany({
          where: {
            OR: [
              { employeeId: { in: employeeIds } },
              { reviewedBy: { in: employeeIds } }
            ]
          }
        });
        console.log(`   Deleted ${deletedCompletions.count} course completions`);
      }

      // Delete user-related data
      // Delete attendance records
      const deletedAttendance = await tx.attendance.deleteMany({
        where: { userId: { in: userIds } }
      });
      console.log(`   Deleted ${deletedAttendance.count} attendance records`);

      // Delete notifications
      const deletedNotifications = await tx.notification.deleteMany({
        where: { userId: { in: userIds } }
      });
      console.log(`   Deleted ${deletedNotifications.count} notifications`);

      // Delete audit logs
      const deletedAuditLogs = await tx.auditLog.deleteMany({
        where: { userId: { in: userIds } }
      });
      console.log(`   Deleted ${deletedAuditLogs.count} audit logs`);

      // Delete magic links
      const deletedMagicLinks = await tx.magicLink.deleteMany({
        where: { userId: { in: userIds } }
      });
      console.log(`   Deleted ${deletedMagicLinks.count} magic links`);

      // Delete employee profiles
      const deletedProfiles = await tx.employeeProfile.deleteMany({
        where: { userId: { in: userIds } }
      });
      console.log(`   Deleted ${deletedProfiles.count} employee profiles`);

      // Delete employees (cascade will handle some relations)
      if (employeeIds.length > 0) {
        const deletedEmployees = await tx.employee.deleteMany({
          where: { id: { in: employeeIds } }
        });
        console.log(`   Deleted ${deletedEmployees.count} employees`);
      }

      // Finally, delete users
      const deleteResult = await tx.user.deleteMany({
        where: {
          email: {
            endsWith: '@demo.com'
          }
        }
      });
      console.log(`   Deleted ${deleteResult.count} users`);
    });

    console.log(`\n✅ Successfully deleted all accounts and related data with @demo.com domain`);

    // Check if Demo Organization tenant should be deleted (if it has no more users)
    const demoOrgTenant = await prisma.tenant.findUnique({
      where: { slug: 'demo-org' },
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    if (demoOrgTenant && demoOrgTenant._count.users === 0) {
      console.log(`\n🗑️  Demo Organization has no more users. Deleting tenant...`);

      // Delete tenant settings first
      await prisma.tenantSettings.deleteMany({
        where: { tenantId: demoOrgTenant.id }
      });

      // Delete tenant
      await prisma.tenant.delete({
        where: { id: demoOrgTenant.id }
      });

      console.log(`✅ Deleted Demo Organization tenant`);
    } else if (demoOrgTenant) {
      console.log(`\nℹ️  Demo Organization still has ${demoOrgTenant._count.users} user(s), keeping tenant`);
    }

    // Show remaining users
    console.log(`\n=== Remaining Users ===`);
    const remainingUsers = await prisma.user.findMany({
      include: {
        tenant: true
      },
      orderBy: {
        email: 'asc'
      }
    });

    console.log(`Total: ${remainingUsers.length} user(s)\n`);
    remainingUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} <${user.email}>`);
      console.log(`   Tenant: ${user.tenant.name} (${user.tenant.slug})`);
      console.log(`   Role: ${user.role}\n`);
    });

  } catch (error) {
    console.error('❌ Error removing demo accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeDemoAccounts();
