/**
 * Test Database Data Loading in Components
 *
 * This script tests the database connectivity and data loading
 * for all major API endpoints and component data sources.
 */

import { prisma } from '../lib/prisma';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3008';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  data?: any;
  duration?: number;
}

const results: TestResult[] = [];

async function testDatabaseConnection(): Promise<TestResult> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      name: 'Database Connection',
      status: 'pass',
      message: 'Successfully connected to PostgreSQL database',
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      name: 'Database Connection',
      status: 'fail',
      message: `Failed to connect: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function testTenantData(): Promise<TestResult> {
  const start = Date.now();
  try {
    const tenants = await prisma.tenant.findMany({
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        _count: {
          select: {
            users: true,
            employees: true,
            projects: true,
          },
        },
      },
    });
    return {
      name: 'Tenant Data Loading',
      status: 'pass',
      message: `Found ${tenants.length} tenant(s)`,
      data: tenants.map(t => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        isActive: t.isActive,
        users: t._count.users,
        employees: t._count.employees,
        projects: t._count.projects,
      })),
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      name: 'Tenant Data Loading',
      status: 'fail',
      message: `Failed: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function testUserData(): Promise<TestResult> {
  const start = Date.now();
  try {
    const users = await prisma.user.findMany({
      take: 20,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        tenantId: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const roleCounts = users.reduce((acc: Record<string, number>, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});

    return {
      name: 'User Data Loading',
      status: 'pass',
      message: `Found ${users.length} user(s): ${Object.entries(roleCounts).map(([r, c]) => `${c} ${r}`).join(', ')}`,
      data: users.slice(0, 5).map(u => ({
        email: u.email,
        name: `${u.firstName} ${u.lastName}`,
        role: u.role,
        status: u.status,
      })),
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      name: 'User Data Loading',
      status: 'fail',
      message: `Failed: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function testEmployeeData(): Promise<TestResult> {
  const start = Date.now();
  try {
    const employees = await prisma.employee.findMany({
      take: 20,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        department: {
          select: {
            name: true,
          },
        },
        manager: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      name: 'Employee Data Loading',
      status: 'pass',
      message: `Found ${employees.length} employee(s)`,
      data: employees.slice(0, 5).map(e => ({
        name: `${e.user.firstName} ${e.user.lastName}`,
        email: e.user.email,
        department: e.department?.name || 'N/A',
        manager: e.manager ? `${e.manager.user.firstName} ${e.manager.user.lastName}` : 'No manager',
        employeeId: e.employeeId,
      })),
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      name: 'Employee Data Loading',
      status: 'fail',
      message: `Failed: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function testProjectData(): Promise<TestResult> {
  const start = Date.now();
  try {
    const projects = await prisma.project.findMany({
      take: 20,
      include: {
        client: {
          select: {
            companyName: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            timeEntries: true,
            assignments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const statusCounts = projects.reduce((acc: Record<string, number>, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});

    return {
      name: 'Project Data Loading',
      status: 'pass',
      message: `Found ${projects.length} project(s): ${Object.entries(statusCounts).map(([s, c]) => `${c} ${s}`).join(', ')}`,
      data: projects.slice(0, 5).map(p => ({
        code: p.projectCode,
        name: p.name,
        client: p.client?.companyName || 'No client',
        status: p.status,
        tasks: p._count.tasks,
        timeEntries: p._count.timeEntries,
      })),
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      name: 'Project Data Loading',
      status: 'fail',
      message: `Failed: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function testTaskData(): Promise<TestResult> {
  const start = Date.now();
  try {
    const tasks = await prisma.task.findMany({
      take: 20,
      include: {
        project: {
          select: {
            name: true,
            projectCode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const statusCounts = tasks.reduce((acc: Record<string, number>, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});

    return {
      name: 'Task Data Loading',
      status: 'pass',
      message: `Found ${tasks.length} task(s): ${Object.entries(statusCounts).map(([s, c]) => `${c} ${s}`).join(', ')}`,
      data: tasks.slice(0, 5).map(t => ({
        name: t.name,
        project: t.project?.name || 'No project',
        assigneeId: t.assigneeId || 'Unassigned',
        status: t.status,
      })),
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      name: 'Task Data Loading',
      status: 'fail',
      message: `Failed: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function testTimesheetEntryData(): Promise<TestResult> {
  const start = Date.now();
  try {
    const entries = await prisma.timesheetEntry.findMany({
      take: 20,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        project: {
          select: {
            name: true,
          },
        },
        task: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { workDate: 'desc' },
    });

    const statusCounts = entries.reduce((acc: Record<string, number>, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});

    const totalHours = entries.reduce((sum, e) => sum + e.hoursWorked, 0);

    return {
      name: 'Timesheet Entry Data Loading',
      status: 'pass',
      message: `Found ${entries.length} timesheet entries, total hours: ${totalHours.toFixed(1)} - ${Object.entries(statusCounts).map(([s, c]) => `${c} ${s}`).join(', ')}`,
      data: entries.slice(0, 5).map(t => ({
        user: `${t.user.firstName} ${t.user.lastName}`,
        workDate: t.workDate.toISOString().split('T')[0],
        project: t.project?.name || 'N/A',
        task: t.task?.name || 'N/A',
        hours: t.hoursWorked,
        status: t.status,
      })),
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      name: 'Timesheet Entry Data Loading',
      status: 'fail',
      message: `Failed: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function testTimeEntryData(): Promise<TestResult> {
  const start = Date.now();
  try {
    const entries = await prisma.timeEntry.findMany({
      take: 20,
      include: {
        employee: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        project: {
          select: {
            name: true,
          },
        },
        task: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);

    return {
      name: 'Time Entry Data Loading',
      status: 'pass',
      message: `Found ${entries.length} time entries, total hours: ${totalHours.toFixed(1)}`,
      data: entries.slice(0, 5).map(e => ({
        employee: `${e.employee.user.firstName} ${e.employee.user.lastName}`,
        project: e.project?.name || 'N/A',
        task: e.task?.name || 'N/A',
        date: e.date.toISOString().split('T')[0],
        hours: Number(e.hours),
      })),
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      name: 'Time Entry Data Loading',
      status: 'fail',
      message: `Failed: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function testLeaveRequestData(): Promise<TestResult> {
  const start = Date.now();
  try {
    const leaves = await prisma.leaveRequest.findMany({
      take: 20,
      include: {
        employee: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const statusCounts = leaves.reduce((acc: Record<string, number>, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {});

    return {
      name: 'Leave Request Data Loading',
      status: 'pass',
      message: `Found ${leaves.length} leave request(s): ${Object.entries(statusCounts).map(([s, c]) => `${c} ${s}`).join(', ')}`,
      data: leaves.slice(0, 5).map(l => ({
        employee: `${l.employee.user.firstName} ${l.employee.user.lastName}`,
        type: l.leaveType,
        startDate: l.startDate.toISOString().split('T')[0],
        endDate: l.endDate.toISOString().split('T')[0],
        days: l.days,
        status: l.status,
      })),
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      name: 'Leave Request Data Loading',
      status: 'fail',
      message: `Failed: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function testExpenseClaimData(): Promise<TestResult> {
  const start = Date.now();
  try {
    const expenses = await prisma.expenseClaim.findMany({
      take: 20,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { expenseDate: 'desc' },
    });

    const statusCounts = expenses.reduce((acc: Record<string, number>, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {});

    const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      name: 'Expense Claim Data Loading',
      status: 'pass',
      message: `Found ${expenses.length} expense claim(s), total: $${totalAmount.toFixed(2)} - ${Object.entries(statusCounts).map(([s, c]) => `${c} ${s}`).join(', ')}`,
      data: expenses.slice(0, 5).map(e => ({
        user: `${e.user.firstName} ${e.user.lastName}`,
        title: e.title.substring(0, 30),
        amount: Number(e.amount),
        category: e.category,
        status: e.status,
        date: e.expenseDate.toISOString().split('T')[0],
      })),
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      name: 'Expense Claim Data Loading',
      status: 'fail',
      message: `Failed: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function testClientData(): Promise<TestResult> {
  const start = Date.now();
  try {
    const clients = await prisma.client.findMany({
      take: 20,
      include: {
        _count: {
          select: {
            projects: true,
            invoices: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      name: 'Client Data Loading',
      status: 'pass',
      message: `Found ${clients.length} client(s)`,
      data: clients.slice(0, 5).map(c => ({
        clientId: c.clientId,
        company: c.companyName,
        contact: c.contactName,
        email: c.contactEmail,
        projects: c._count.projects,
        invoices: c._count.invoices,
      })),
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      name: 'Client Data Loading',
      status: 'fail',
      message: `Failed: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function testInvoiceData(): Promise<TestResult> {
  const start = Date.now();
  try {
    const invoices = await prisma.invoice.findMany({
      take: 20,
      include: {
        client: {
          select: {
            companyName: true,
          },
        },
        _count: {
          select: {
            lineItems: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const statusCounts = invoices.reduce((acc: Record<string, number>, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    }, {});

    const totalAmount = invoices.reduce((sum, i) => sum + Number(i.total), 0);

    return {
      name: 'Invoice Data Loading',
      status: 'pass',
      message: `Found ${invoices.length} invoice(s), total: $${totalAmount.toFixed(2)} - ${Object.entries(statusCounts).map(([s, c]) => `${c} ${s}`).join(', ')}`,
      data: invoices.slice(0, 5).map(i => ({
        number: i.invoiceNumber,
        client: i.client?.companyName || 'N/A',
        total: Number(i.total),
        status: i.status,
        dueDate: i.dueDate.toISOString().split('T')[0],
        lineItems: i._count.lineItems,
      })),
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      name: 'Invoice Data Loading',
      status: 'fail',
      message: `Failed: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function testDepartmentData(): Promise<TestResult> {
  const start = Date.now();
  try {
    const departments = await prisma.department.findMany({
      take: 20,
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      name: 'Department Data Loading',
      status: 'pass',
      message: `Found ${departments.length} department(s)`,
      data: departments.map(d => ({
        name: d.name,
        employees: d._count.employees,
      })),
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      name: 'Department Data Loading',
      status: 'fail',
      message: `Failed: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function testAuditLogData(): Promise<TestResult> {
  const start = Date.now();
  try {
    const logs = await prisma.auditLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const actionCounts = logs.reduce((acc: Record<string, number>, l) => {
      acc[l.action] = (acc[l.action] || 0) + 1;
      return acc;
    }, {});

    return {
      name: 'Audit Log Data Loading',
      status: 'pass',
      message: `Found ${logs.length} audit log(s): ${Object.keys(actionCounts).length} unique actions`,
      data: logs.slice(0, 5).map(l => ({
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId?.substring(0, 8),
        success: l.success,
        timestamp: l.createdAt.toISOString(),
      })),
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      name: 'Audit Log Data Loading',
      status: 'fail',
      message: `Failed: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function testNotificationData(): Promise<TestResult> {
  const start = Date.now();
  try {
    const notifications = await prisma.notification.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const typeCounts = notifications.reduce((acc: Record<string, number>, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {});

    const unreadCount = notifications.filter(n => !n.read).length;

    return {
      name: 'Notification Data Loading',
      status: 'pass',
      message: `Found ${notifications.length} notification(s), ${unreadCount} unread`,
      data: notifications.slice(0, 5).map(n => ({
        type: n.type,
        title: n.title.substring(0, 30),
        read: n.read,
        timestamp: n.createdAt.toISOString(),
      })),
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      name: 'Notification Data Loading',
      status: 'fail',
      message: `Failed: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         DATABASE DATA LOADING TEST SUITE                       ║');
  console.log('║         Testing all component data sources                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const tests = [
    testDatabaseConnection,
    testTenantData,
    testUserData,
    testEmployeeData,
    testDepartmentData,
    testProjectData,
    testTaskData,
    testClientData,
    testTimesheetEntryData,
    testTimeEntryData,
    testLeaveRequestData,
    testExpenseClaimData,
    testInvoiceData,
    testAuditLogData,
    testNotificationData,
  ];

  for (const test of tests) {
    const result = await test();
    results.push(result);

    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';
    console.log(`${icon} ${result.name} (${result.duration}ms)`);
    console.log(`   ${result.message}`);

    if (result.data && result.data.length > 0) {
      console.log('   Sample data:');
      result.data.forEach((item: any, index: number) => {
        const itemStr = JSON.stringify(item).substring(0, 100);
        console.log(`     ${index + 1}. ${itemStr}${JSON.stringify(item).length > 100 ? '...' : ''}`);
      });
    }
    console.log('');
  }

  // Summary
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST SUMMARY                            ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Tests: ${results.length.toString().padEnd(4)} │ Passed: ${passed.toString().padEnd(4)} │ Failed: ${failed.toString().padEnd(4)} │ Skipped: ${skipped.toString().padEnd(4)}║`);
  console.log(`║  Total Duration: ${totalDuration}ms                                       ║`.substring(0, 67) + '║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
    process.exit(1);
  }

  console.log('\n✅ All database data loading tests passed!');
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error('Test suite error:', e);
  process.exit(1);
});
