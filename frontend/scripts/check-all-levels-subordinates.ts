import { prisma } from '../lib/prisma';

/**
 * Recursively get all subordinates at all levels
 */
async function getAllSubordinates(employeeId: string, visited = new Set<string>()): Promise<any[]> {
  // Prevent infinite loops
  if (visited.has(employeeId)) {
    return [];
  }
  visited.add(employeeId);

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      subordinates: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!employee || !employee.subordinates || employee.subordinates.length === 0) {
    return [];
  }

  const allSubordinates: any[] = [];

  for (const subordinate of employee.subordinates) {
    // Add the direct subordinate
    allSubordinates.push(subordinate);

    // Recursively get subordinates of this subordinate
    const nestedSubordinates = await getAllSubordinates(subordinate.id, visited);
    allSubordinates.push(...nestedSubordinates);
  }

  return allSubordinates;
}

async function checkAllLevelsSubordinates() {
  try {
    console.log('Checking ALL levels of subordinates for user: info@addtechno.com\n');

    // Find user
    const user = await prisma.user.findUnique({
      where: {
        email: 'info@addtechno.com',
      },
      include: {
        employee: true,
      },
    });

    if (!user) {
      console.log('❌ User not found with email: info@addtechno.com');
      return;
    }

    console.log('✅ User Found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log();

    if (!user.employee) {
      console.log('❌ User does not have an employee record');
      return;
    }

    console.log('✅ Employee Record:');
    console.log(`   Employee ID: ${user.employee.id}`);
    console.log(`   Employee Number: ${user.employee.employeeNumber || 'N/A'}`);
    console.log();

    // Get all subordinates recursively
    const allSubordinates = await getAllSubordinates(user.employee.id);

    if (allSubordinates.length === 0) {
      console.log('ℹ️  No subordinates found for this user');
      return;
    }

    console.log(`✅ Found ${allSubordinates.length} subordinate(s) at ALL levels:\n`);

    // Create a map to track levels
    const levelMap = new Map<string, number>();

    async function calculateLevels(empId: string, level: number) {
      levelMap.set(empId, level);

      const emp = await prisma.employee.findUnique({
        where: { id: empId },
        include: { subordinates: true },
      });

      if (emp && emp.subordinates) {
        for (const sub of emp.subordinates) {
          await calculateLevels(sub.id, level + 1);
        }
      }
    }

    await calculateLevels(user.employee.id, 0);

    // Sort by level for better visualization
    const sortedSubordinates = allSubordinates.sort((a, b) => {
      const levelA = levelMap.get(a.id) || 0;
      const levelB = levelMap.get(b.id) || 0;
      return levelA - levelB;
    });

    sortedSubordinates.forEach((subordinate, index) => {
      const level = levelMap.get(subordinate.id) || 0;
      const indent = '  '.repeat(level);
      console.log(`${indent}${index + 1}. ${subordinate.user.firstName} ${subordinate.user.lastName} (Level ${level})`);
      console.log(`${indent}   Employee ID: ${subordinate.id}`);
      console.log(`${indent}   User ID: ${subordinate.user.id}`);
      console.log(`${indent}   Email: ${subordinate.user.email}`);
      console.log(`${indent}   Role: ${subordinate.user.role}`);
      console.log(`${indent}   Employee Number: ${subordinate.employeeNumber || 'N/A'}`);
      console.log();
    });

    // Count by level
    const levelCounts = new Map<number, number>();
    allSubordinates.forEach(sub => {
      const level = levelMap.get(sub.id) || 0;
      levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Project Manager: ${user.firstName} ${user.lastName}`);
    console.log(`   Total subordinates (all levels): ${allSubordinates.length}`);
    console.log(`   Total team members (including manager): ${allSubordinates.length + 1}`);
    console.log('\n   Breakdown by level:');
    Array.from(levelCounts.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([level, count]) => {
        console.log(`     Level ${level}: ${count} subordinate(s)`);
      });
    console.log(`\n✨ All ${allSubordinates.length} subordinates (at all levels) will be auto-assigned!`);

  } catch (error) {
    console.error('Error checking subordinates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllLevelsSubordinates();
