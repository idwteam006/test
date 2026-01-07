import { prisma } from '../lib/prisma';

/**
 * Test script to demonstrate recursive subordinate auto-assignment logic
 * This simulates exactly what the API does when creating a project
 */
async function testRecursiveAssignment() {
  try {
    console.log('Testing RECURSIVE subordinate auto-assignment logic\n');

    const managerEmail = 'info@addtechno.com';

    // Fetch manager (same query used in API)
    const manager = await prisma.user.findFirst({
      where: {
        email: managerEmail,
      },
      include: {
        employee: true,
      },
    });

    if (!manager || !manager.employee) {
      console.log('❌ Manager not found or has no employee record');
      return;
    }

    console.log('✅ Manager Found:');
    console.log(`   Name: ${manager.firstName} ${manager.lastName}`);
    console.log(`   Email: ${manager.email}`);
    console.log(`   Employee ID: ${manager.employee.id}`);
    console.log();

    // Recursive function to get all subordinates (SAME AS API)
    const getAllSubordinates = async (employeeId: string, visited = new Set<string>()): Promise<string[]> => {
      // Prevent infinite loops
      if (visited.has(employeeId)) {
        return [];
      }
      visited.add(employeeId);

      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          subordinates: true,
        },
      });

      if (!employee || !employee.subordinates || employee.subordinates.length === 0) {
        return [];
      }

      const allSubordinateIds: string[] = [];

      for (const subordinate of employee.subordinates) {
        // Add the direct subordinate
        allSubordinateIds.push(subordinate.id);

        // Recursively get subordinates of this subordinate
        const nestedSubordinateIds = await getAllSubordinates(subordinate.id, visited);
        allSubordinateIds.push(...nestedSubordinateIds);
      }

      return allSubordinateIds;
    };

    // Get all subordinates at all levels
    const allSubordinateIds = await getAllSubordinates(manager.employee.id);

    console.log(`✅ Found ${allSubordinateIds.length} subordinate(s) at ALL levels\n`);

    if (allSubordinateIds.length === 0) {
      console.log('ℹ️  No subordinates to auto-assign');
      return;
    }

    // Fetch details for display
    const subordinates = await prisma.employee.findMany({
      where: {
        id: { in: allSubordinateIds },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    console.log('Subordinates that will be assigned:');
    subordinates.forEach((sub, index) => {
      console.log(`${index + 1}. ${sub.user.firstName} ${sub.user.lastName}`);
      console.log(`   Email: ${sub.user.email}`);
      console.log(`   Role: ${sub.user.role}`);
      console.log(`   Employee ID: ${sub.id}`);
      console.log(`   → Will be assigned as "Team Member" with rate 0`);
      console.log();
    });

    console.log('\n📊 Summary:');
    console.log(`   Project Manager: ${manager.firstName} ${manager.lastName}`);
    console.log(`   Total team members (including manager): ${allSubordinateIds.length + 1}`);
    console.log(`   Auto-assigned subordinates (all levels): ${allSubordinateIds.length}`);
    console.log('\n✨ When project is created, all subordinates at ALL levels will be automatically assigned!');
    console.log('   This includes Level 1, Level 2, Level 3, and any deeper levels.');

  } catch (error) {
    console.error('Error testing recursive assignment:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRecursiveAssignment();
