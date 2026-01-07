import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface EmployeeNode {
  id: string;
  employeeNumber: string;
  jobTitle: string;
  managerId: string | null;
  startDate: Date;
  status: string;
  employmentType: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    status: string | null;
    createdAt: Date;
  };
  department: { name: string };
  manager: { user: { firstName: string; lastName: string; email: string } } | null;
  subordinates: EmployeeNode[];
}

async function analyzeIDWTeam() {
  // Find the tenant with slug 'idw-team'
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { slug: 'idw-team' },
        { slug: 'idwteam' },
        { name: { contains: 'IDW', mode: 'insensitive' } }
      ]
    },
    include: {
      settings: true
    }
  });

  if (!tenant) {
    console.log('❌ IDWTEAM tenant not found');
    console.log('\nSearching for all tenants...');
    const allTenants = await prisma.tenant.findMany({
      select: { id: true, name: true, slug: true, isActive: true }
    });
    console.log('\nAvailable tenants:');
    for (const t of allTenants) {
      console.log(`  - ${t.name} (slug: ${t.slug}, active: ${t.isActive})`);
    }
    await prisma.$disconnect();
    return;
  }

  console.log('='.repeat(80));
  console.log('📊 IDWTEAM EMPLOYEE ANALYSIS');
  console.log('='.repeat(80));

  console.log('\n🏢 ORGANIZATION INFO:');
  console.log('  Name:', tenant.name);
  console.log('  Slug:', tenant.slug);
  console.log('  Status:', tenant.isActive ? '✅ Active' : '❌ Inactive');
  console.log('  Company Name:', tenant.settings?.companyName || 'N/A');
  console.log('  Subscription:', tenant.settings?.subscriptionPlan || 'N/A');

  // Get all users for this tenant
  const users = await prisma.user.findMany({
    where: { tenantId: tenant.id },
    include: {
      department: { select: { name: true } },
      employee: {
        include: {
          department: { select: { name: true } },
          manager: {
            include: {
              user: { select: { firstName: true, lastName: true, email: true } }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log('\n📋 USERS SUMMARY:');
  console.log(`  Total Users: ${users.length}`);

  // Count by role
  const roleCounts: Record<string, number> = {};
  for (const user of users) {
    roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
  }
  console.log('\n  By Role:');
  for (const [role, count] of Object.entries(roleCounts)) {
    console.log(`    ${role}: ${count}`);
  }

  // Count by status
  const statusCounts: Record<string, number> = {};
  for (const user of users) {
    const status = user.status || 'UNKNOWN';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }
  console.log('\n  By Status:');
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`    ${status}: ${count}`);
  }

  // Get all employees for this tenant
  const employees = await prisma.employee.findMany({
    where: { tenantId: tenant.id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
          createdAt: true
        }
      },
      department: { select: { name: true } },
      manager: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } }
        }
      },
      subordinates: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } }
        }
      }
    },
    orderBy: { employeeNumber: 'asc' }
  });

  console.log(`\n  Total Employees (with Employee record): ${employees.length}`);

  // Get departments
  const departments = await prisma.department.findMany({
    where: { tenantId: tenant.id },
    include: {
      _count: { select: { employees: true, users: true } }
    }
  });

  console.log(`\n📁 DEPARTMENTS (${departments.length}):`)
  for (const dept of departments) {
    console.log(`  - ${dept.name}: ${dept._count.employees} employees, ${dept._count.users} users`);
  }

  // Build tree structure
  const employeeMap = new Map<string, EmployeeNode>();
  const rootEmployees: EmployeeNode[] = [];

  // First pass: create map
  for (const emp of employees) {
    employeeMap.set(emp.id, {
      ...emp,
      subordinates: []
    } as EmployeeNode);
  }

  // Second pass: build hierarchy
  for (const emp of employees) {
    const node = employeeMap.get(emp.id)!;
    if (emp.managerId && employeeMap.has(emp.managerId)) {
      employeeMap.get(emp.managerId)!.subordinates.push(node);
    } else {
      rootEmployees.push(node);
    }
  }

  // Print tree
  function printTree(node: EmployeeNode, indent: string = '') {
    const roleIcon = node.user.role === 'SUPER_ADMIN' ? '🌟' :
                     node.user.role === 'ADMIN' ? '⭐' :
                     node.user.role === 'MANAGER' ? '👔' :
                     node.user.role === 'HR' ? '💼' :
                     node.user.role === 'ACCOUNTANT' ? '📊' : '👤';

    const statusIcon = node.user.status === 'ACTIVE' ? '✅' :
                       node.user.status === 'INACTIVE' ? '❌' :
                       node.user.status === 'PENDING' ? '⏳' :
                       node.user.status === 'PENDING_ONBOARDING' ? '📝' : '❓';

    console.log(`${indent}${roleIcon} ${node.user.firstName} ${node.user.lastName} (${node.user.role}) ${statusIcon}`);
    console.log(`${indent}   📧 ${node.user.email}`);
    console.log(`${indent}   🏷️  ${node.employeeNumber} | ${node.department.name} | ${node.jobTitle}`);
    console.log(`${indent}   📅 Start: ${node.startDate.toISOString().split('T')[0]} | Type: ${node.employmentType} | Status: ${node.status}`);

    if (node.manager) {
      console.log(`${indent}   👆 Reports to: ${node.manager.user.firstName} ${node.manager.user.lastName}`);
    }

    if (node.subordinates.length > 0) {
      console.log(`${indent}   👥 Direct reports: ${node.subordinates.length}`);
    }
    console.log('');

    for (const sub of node.subordinates) {
      printTree(sub, indent + '    ');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('🌳 ORGANIZATION HIERARCHY');
  console.log('='.repeat(80));

  console.log('\n--- ROOT EMPLOYEES (No Manager) ---\n');
  for (const root of rootEmployees) {
    printTree(root, '');
  }

  // Users without employee records
  const usersWithoutEmployee = users.filter(u => !u.employee);
  if (usersWithoutEmployee.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('⚠️  USERS WITHOUT EMPLOYEE RECORDS');
    console.log('='.repeat(80));
    for (const user of usersWithoutEmployee) {
      console.log(`\n  ${user.firstName} ${user.lastName} (${user.role})`);
      console.log(`     Email: ${user.email}`);
      console.log(`     Status: ${user.status}`);
      console.log(`     Created: ${user.createdAt.toISOString().split('T')[0]}`);
    }
  }

  // Summary statistics
  console.log('\n' + '='.repeat(80));
  console.log('📈 SUMMARY STATISTICS');
  console.log('='.repeat(80));
  console.log(`\n  Total Users: ${users.length}`);
  console.log(`  With Employee Record: ${employees.length}`);
  console.log(`  Without Employee Record: ${usersWithoutEmployee.length}`);
  console.log(`  Root Employees (No Manager): ${rootEmployees.length}`);
  console.log(`  Departments: ${departments.length}`);

  // Managers with subordinates
  const managersWithTeam = employees.filter(e => e.subordinates.length > 0);
  console.log(`\n  Managers with direct reports: ${managersWithTeam.length}`);
  for (const mgr of managersWithTeam) {
    console.log(`    - ${mgr.user.firstName} ${mgr.user.lastName}: ${mgr.subordinates.length} direct reports`);
  }

  // Employment type breakdown
  const empTypeCounts: Record<string, number> = {};
  for (const emp of employees) {
    empTypeCounts[emp.employmentType] = (empTypeCounts[emp.employmentType] || 0) + 1;
  }
  console.log('\n  By Employment Type:');
  for (const [type, count] of Object.entries(empTypeCounts)) {
    console.log(`    ${type}: ${count}`);
  }

  // Employment status breakdown
  const empStatusCounts: Record<string, number> = {};
  for (const emp of employees) {
    empStatusCounts[emp.status] = (empStatusCounts[emp.status] || 0) + 1;
  }
  console.log('\n  By Employment Status:');
  for (const [status, count] of Object.entries(empStatusCounts)) {
    console.log(`    ${status}: ${count}`);
  }

  await prisma.$disconnect();
}

analyzeIDWTeam().catch(console.error);
