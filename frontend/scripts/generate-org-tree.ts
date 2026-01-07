/**
 * Script to generate organization tree with reporting managers
 * Run with: npx tsx scripts/generate-org-tree.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface EmployeeNode {
  id: string;
  name: string;
  email: string;
  employeeNumber: string;
  jobTitle: string;
  department: string;
  role: string;
  managerId: string | null;
  subordinates: EmployeeNode[];
}

interface TenantOrg {
  tenantId: string;
  tenantName: string;
  departments: { id: string; name: string }[];
  employees: EmployeeNode[];
  rootEmployees: EmployeeNode[];
}

async function generateOrgTree() {
  try {
    // Get all tenants with their settings
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        settings: {
          select: {
            companyName: true,
          },
        },
      },
    });

    const organizations: TenantOrg[] = [];

    for (const tenant of tenants) {
      // Get departments for this tenant
      const departments = await prisma.department.findMany({
        where: { tenantId: tenant.id },
        select: { id: true, name: true },
      });

      // Get all employees with their user info and manager relationship
      const employees = await prisma.employee.findMany({
        where: { tenantId: tenant.id },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          department: {
            select: { name: true },
          },
          manager: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { employeeNumber: 'asc' },
      });

      // Build employee nodes map
      const employeeMap = new Map<string, EmployeeNode>();

      for (const emp of employees) {
        employeeMap.set(emp.id, {
          id: emp.id,
          name: `${emp.user.firstName} ${emp.user.lastName}`,
          email: emp.user.email,
          employeeNumber: emp.employeeNumber,
          jobTitle: emp.jobTitle,
          department: emp.department.name,
          role: emp.user.role,
          managerId: emp.managerId,
          subordinates: [],
        });
      }

      // Build hierarchy
      const rootEmployees: EmployeeNode[] = [];

      for (const emp of employees) {
        const node = employeeMap.get(emp.id)!;
        if (emp.managerId && employeeMap.has(emp.managerId)) {
          employeeMap.get(emp.managerId)!.subordinates.push(node);
        } else {
          rootEmployees.push(node);
        }
      }

      organizations.push({
        tenantId: tenant.id,
        tenantName: tenant.settings?.companyName || tenant.name,
        departments,
        employees: Array.from(employeeMap.values()),
        rootEmployees,
      });
    }

    // Generate markdown
    let markdown = `# Organization Structure Report\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
    markdown += `---\n\n`;

    for (const org of organizations) {
      markdown += `## 🏢 ${org.tenantName}\n\n`;
      markdown += `**Tenant ID:** \`${org.tenantId}\`\n\n`;

      // Departments section
      markdown += `### 📁 Departments (${org.departments.length})\n\n`;
      if (org.departments.length > 0) {
        for (const dept of org.departments) {
          const deptEmployees = org.employees.filter(e => e.department === dept.name);
          markdown += `- **${dept.name}** (${deptEmployees.length} employees)\n`;
        }
      } else {
        markdown += `_No departments configured_\n`;
      }
      markdown += `\n`;

      // Organization Tree section
      markdown += `### 🌳 Organization Tree\n\n`;

      if (org.rootEmployees.length === 0) {
        markdown += `_No employees found_\n\n`;
      } else {
        markdown += `\`\`\`\n`;
        for (const root of org.rootEmployees) {
          markdown += renderTree(root, '', true);
        }
        markdown += `\`\`\`\n\n`;
      }

      // Detailed Employee List
      markdown += `### 👥 Employee Details\n\n`;
      markdown += `| Employee ID | Name | Email | Job Title | Department | Role | Reports To |\n`;
      markdown += `|-------------|------|-------|-----------|------------|------|------------|\n`;

      for (const emp of org.employees) {
        const manager = emp.managerId
          ? org.employees.find(e => e.id === emp.managerId)?.name || 'Unknown'
          : '—';
        markdown += `| ${emp.employeeNumber} | ${emp.name} | ${emp.email} | ${emp.jobTitle} | ${emp.department} | ${emp.role} | ${manager} |\n`;
      }
      markdown += `\n`;

      // Statistics
      markdown += `### 📊 Statistics\n\n`;
      markdown += `- **Total Employees:** ${org.employees.length}\n`;
      markdown += `- **Top-Level (No Manager):** ${org.rootEmployees.length}\n`;

      const roleCount: Record<string, number> = {};
      for (const emp of org.employees) {
        roleCount[emp.role] = (roleCount[emp.role] || 0) + 1;
      }
      markdown += `- **By Role:**\n`;
      for (const [role, count] of Object.entries(roleCount)) {
        markdown += `  - ${role}: ${count}\n`;
      }
      markdown += `\n`;

      markdown += `---\n\n`;
    }

    // Write to file
    const outputPath = path.join(process.cwd(), 'ORGANIZATION_TREE.md');
    fs.writeFileSync(outputPath, markdown);

    console.log(`✅ Organization tree generated: ${outputPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Organizations: ${organizations.length}`);
    for (const org of organizations) {
      console.log(`   - ${org.tenantName}: ${org.employees.length} employees, ${org.departments.length} departments`);
    }

  } catch (error) {
    console.error('Error generating org tree:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function renderTree(node: EmployeeNode, prefix: string, isLast: boolean): string {
  const connector = isLast ? '└── ' : '├── ';
  const roleIcon = getRoleIcon(node.role);

  let output = `${prefix}${connector}${roleIcon} ${node.name} (${node.jobTitle})\n`;
  output += `${prefix}${isLast ? '    ' : '│   '}   📧 ${node.email}\n`;
  output += `${prefix}${isLast ? '    ' : '│   '}   🏷️  ${node.employeeNumber} | ${node.department}\n`;

  const childPrefix = prefix + (isLast ? '    ' : '│   ');

  for (let i = 0; i < node.subordinates.length; i++) {
    const isLastChild = i === node.subordinates.length - 1;
    output += renderTree(node.subordinates[i], childPrefix, isLastChild);
  }

  return output;
}

function getRoleIcon(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN': return '👑';
    case 'ADMIN': return '⭐';
    case 'MANAGER': return '👔';
    case 'HR': return '💼';
    case 'ACCOUNTANT': return '📊';
    case 'EMPLOYEE': return '👤';
    default: return '👤';
  }
}

generateOrgTree();
