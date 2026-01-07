const { PrismaClient } = require('@prisma/client');

// Source: Railway
const sourceDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.SOURCE_DATABASE_URL
    }
  }
});

// Target: Supabase
const targetDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TARGET_DATABASE_URL
    }
  }
});

async function migrateTable(tableName, findMany, createMany) {
  console.log(`Migrating ${tableName}...`);
  try {
    const records = await findMany();
    if (records.length === 0) {
      console.log(`  No records in ${tableName}`);
      return 0;
    }

    // Delete existing records in target
    await createMany.deleteMany({});

    // Insert records
    await createMany.createMany({
      data: records,
      skipDuplicates: true
    });

    console.log(`  Migrated ${records.length} records`);
    return records.length;
  } catch (error) {
    console.error(`  Error migrating ${tableName}:`, error.message);
    return 0;
  }
}

async function main() {
  console.log('=== Starting Migration from Railway to Supabase ===\n');

  // Migration order matters due to foreign key constraints
  // 1. Independent tables first
  const migrations = [
    // Tenants first (no dependencies)
    {
      name: 'Tenant',
      find: () => sourceDb.tenant.findMany(),
      target: targetDb.tenant
    },
    // Departments (depends on tenant)
    {
      name: 'Department',
      find: () => sourceDb.department.findMany(),
      target: targetDb.department
    },
    // Users (depends on tenant, department)
    {
      name: 'User',
      find: () => sourceDb.user.findMany(),
      target: targetDb.user
    },
    // Clients (depends on tenant, user)
    {
      name: 'Client',
      find: () => sourceDb.client.findMany(),
      target: targetDb.client
    },
    // Employees (depends on tenant, user, department)
    {
      name: 'Employee',
      find: () => sourceDb.employee.findMany(),
      target: targetDb.employee
    },
    // Employee Profile
    {
      name: 'EmployeeProfile',
      find: () => sourceDb.employeeProfile.findMany(),
      target: targetDb.employeeProfile
    },
    // Projects (depends on tenant, client)
    {
      name: 'Project',
      find: () => sourceDb.project.findMany(),
      target: targetDb.project
    },
    // Project Assignments
    {
      name: 'ProjectAssignment',
      find: () => sourceDb.projectAssignment.findMany(),
      target: targetDb.projectAssignment
    },
    // Tasks
    {
      name: 'Task',
      find: () => sourceDb.task.findMany(),
      target: targetDb.task
    },
    // Timesheet Entries
    {
      name: 'TimesheetEntry',
      find: () => sourceDb.timesheetEntry.findMany(),
      target: targetDb.timesheetEntry
    },
    // Timesheet Templates
    {
      name: 'TimesheetTemplate',
      find: () => sourceDb.timesheetTemplate.findMany(),
      target: targetDb.timesheetTemplate
    },
    // Expense Claims
    {
      name: 'ExpenseClaim',
      find: () => sourceDb.expenseClaim.findMany(),
      target: targetDb.expenseClaim
    },
    // Expense Items
    {
      name: 'ExpenseItem',
      find: () => sourceDb.expenseItem.findMany(),
      target: targetDb.expenseItem
    },
    // Leave Requests
    {
      name: 'LeaveRequest',
      find: () => sourceDb.leaveRequest.findMany(),
      target: targetDb.leaveRequest
    },
    // Attendance
    {
      name: 'Attendance',
      find: () => sourceDb.attendance.findMany(),
      target: targetDb.attendance
    },
    // Holidays
    {
      name: 'Holiday',
      find: () => sourceDb.holiday.findMany(),
      target: targetDb.holiday
    },
    // Notifications
    {
      name: 'Notification',
      find: () => sourceDb.notification.findMany(),
      target: targetDb.notification
    },
    // Sessions
    {
      name: 'Session',
      find: () => sourceDb.session.findMany(),
      target: targetDb.session
    },
    // Magic Links
    {
      name: 'MagicLink',
      find: () => sourceDb.magicLink.findMany(),
      target: targetDb.magicLink
    },
    // File Uploads
    {
      name: 'FileUpload',
      find: () => sourceDb.fileUpload.findMany(),
      target: targetDb.fileUpload
    },
    // Onboarding Invites
    {
      name: 'OnboardingInvite',
      find: () => sourceDb.onboardingInvite.findMany(),
      target: targetDb.onboardingInvite
    },
  ];

  let totalMigrated = 0;

  for (const migration of migrations) {
    const count = await migrateTable(migration.name, migration.find, migration.target);
    totalMigrated += count;
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`Total records migrated: ${totalMigrated}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await sourceDb.$disconnect();
    await targetDb.$disconnect();
  });