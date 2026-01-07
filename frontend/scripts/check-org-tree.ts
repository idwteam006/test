import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface EmployeeNode {
  id: string;
  employeeNumber: string;
  jobTitle: string;
  managerId: string | null;
  user: { firstName: string; lastName: string; email: string; role: string };
  department: { name: string };
  manager: { user: { firstName: string; lastName: string; email: string } } | null;
  subordinates: EmployeeNode[];
}

async function checkOrgTree() {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'add-technologies' }
  });

  if (!tenant) {
    console.log('Tenant not found');
    return;
  }

  console.log('=== ADD Technologies Organization Tree ===\n');

  const employees = await prisma.employee.findMany({
    where: { tenantId: tenant.id },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, role: true } },
      department: { select: { name: true } },
      manager: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } }
        }
      }
    },
    orderBy: { employeeNumber: 'asc' }
  });

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
    const roleIcon = node.user.role === 'ADMIN' ? '⭐' :
                     node.user.role === 'MANAGER' ? '👔' :
                     node.user.role === 'HR' ? '💼' :
                     node.user.role === 'ACCOUNTANT' ? '📊' : '👤';

    console.log(`${indent}${roleIcon} ${node.user.firstName} ${node.user.lastName} (${node.user.role})`);
    console.log(`${indent}   📧 ${node.user.email}`);
    console.log(`${indent}   🏷️  ${node.employeeNumber} | ${node.department.name} | ${node.jobTitle}`);

    if (node.manager) {
      console.log(`${indent}   👆 Reports to: ${node.manager.user.firstName} ${node.manager.user.lastName}`);
    }
    console.log('');

    for (const sub of node.subordinates) {
      printTree(sub, indent + '    ');
    }
  }

  console.log('--- ROOT EMPLOYEES (No Manager) ---\n');
  for (const root of rootEmployees) {
    printTree(root, '');
  }

  console.log('\n--- SUMMARY ---');
  console.log(`Total employees: ${employees.length}`);
  console.log(`Root employees (no manager): ${rootEmployees.length}`);

  // Check for any issues
  const admins = employees.filter(e => e.user.role === 'ADMIN');
  console.log(`\nAdmins: ${admins.length}`);
  for (const admin of admins) {
    console.log(`  - ${admin.user.email} (manager: ${admin.manager ? admin.manager.user.email : 'none'})`);
  }

  await prisma.$disconnect();
}

checkOrgTree().catch(console.error);
