import { prisma } from '../lib/prisma';

async function checkProjectAssignments() {
  try {
    const projectCode = 'PROJ-2025-0002';

    console.log(`Checking assignments for project: ${projectCode}\n`);

    // Find project with assignments
    const project = await prisma.project.findFirst({
      where: {
        projectCode: projectCode,
      },
      include: {
        assignments: {
          include: {
            employee: {
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
    console.log(`   Status: ${project.status}`);
    console.log();

    console.log(`📊 Total Assignments: ${project.assignments.length}`);
    console.log();

    if (project.assignments.length === 0) {
      console.log('⚠️  No assignments found for this project');
      return;
    }

    console.log('Team Members:');
    project.assignments.forEach((assignment, index) => {
      console.log(`${index + 1}. ${assignment.employee.user.firstName} ${assignment.employee.user.lastName}`);
      console.log(`   Email: ${assignment.employee.user.email}`);
      console.log(`   Role on Project: ${assignment.role || 'Not specified'}`);
      console.log(`   User Role: ${assignment.employee.user.role}`);
      console.log(`   Employee ID: ${assignment.employeeId}`);
      console.log(`   Billable Rate: $${assignment.billableRate}`);
      console.log();
    });

    console.log('\n💡 Note: This project was created before the recursive auto-assignment feature.');
    console.log('   New projects will automatically have all subordinates (at all levels) assigned.');

  } catch (error) {
    console.error('Error checking project assignments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProjectAssignments();
