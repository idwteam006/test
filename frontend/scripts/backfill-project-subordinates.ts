import { prisma } from '../lib/prisma';

/**
 * Backfill existing project with all subordinates
 * This script adds all subordinates (at all levels) to an existing project
 */
async function backfillProjectSubordinates() {
  try {
    const projectCode = 'PROJ-2025-0002';

    console.log(`🔄 Backfilling subordinates for project: ${projectCode}\n`);

    // Find the project
    const project = await prisma.project.findFirst({
      where: {
        projectCode: projectCode,
      },
      include: {
        assignments: {
          include: {
            employee: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      console.log(`❌ Project ${projectCode} not found`);
      return;
    }

    console.log(`✅ Project Found: ${project.name}`);
    console.log(`   Project Code: ${project.projectCode}`);
    console.log(`   Current assignments: ${project.assignments.length}`);
    console.log();

    // Find the project manager
    const projectManager = project.assignments.find(a => a.role === 'Project Manager');

    if (!projectManager) {
      console.log('❌ No project manager found for this project');
      return;
    }

    console.log(`✅ Project Manager: ${projectManager.employee.user.firstName} ${projectManager.employee.user.lastName}`);
    console.log(`   Email: ${projectManager.employee.user.email}`);
    console.log();

    // Recursively get all subordinates at all levels
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
    const allSubordinateIds = await getAllSubordinates(projectManager.employeeId);

    console.log(`📊 Found ${allSubordinateIds.length} subordinate(s) at all levels\n`);

    if (allSubordinateIds.length === 0) {
      console.log('ℹ️  No subordinates to add');
      return;
    }

    // Get subordinate details for display
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

    console.log('Subordinates to be added:');
    subordinates.forEach((sub, index) => {
      console.log(`${index + 1}. ${sub.user.firstName} ${sub.user.lastName} (${sub.user.email})`);
    });
    console.log();

    // Create assignments for all subordinates
    const subordinateAssignments = allSubordinateIds.map((employeeId) => ({
      tenantId: project.tenantId,
      projectId: project.id,
      employeeId: employeeId,
      billableRate: 0, // Default rate, can be updated later
      role: 'Team Member',
    }));

    await prisma.projectAssignment.createMany({
      data: subordinateAssignments,
      skipDuplicates: true,
    });

    console.log(`✅ Successfully added ${subordinateAssignments.length} subordinate(s) to the project!\n`);

    // Verify final count
    const updatedProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    console.log(`📊 Final Summary:`);
    console.log(`   Project: ${project.name}`);
    console.log(`   Previous assignments: ${project.assignments.length}`);
    console.log(`   New assignments: ${updatedProject?._count.assignments || 0}`);
    console.log(`   Added: ${(updatedProject?._count.assignments || 0) - project.assignments.length} team members`);
    console.log();
    console.log(`✨ Backfill complete! Refresh the project page to see all team members.`);

  } catch (error) {
    console.error('Error backfilling project subordinates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backfillProjectSubordinates();
