const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:FlrOdwpwIfYJRYbKQkGmbFAgQWDxTHcZ@interchange.proxy.rlwy.net:34268/railway',
    },
  },
});

async function checkProjects() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        client: {
          select: {
            clientId: true,
            companyName: true,
          },
        },
        assignments: {
          include: {
            employee: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    console.log('\n=== PROJECTS IN DATABASE ===');
    console.log(`Total projects: ${projects.length}\n`);

    if (projects.length === 0) {
      console.log('No projects found in database.');
    } else {
      projects.forEach((project, index) => {
        console.log(`${index + 1}. ${project.name}`);
        console.log(`   ID: ${project.id}`);
        console.log(`   Client: ${project.client.companyName} (${project.client.clientId})`);
        console.log(`   Status: ${project.status}`);
        console.log(`   Start Date: ${project.startDate}`);
        console.log(`   End Date: ${project.endDate || 'Not set'}`);
        console.log(`   Budget Hours: ${project.budgetHours || 'Not set'}`);
        console.log(`   Budget Cost: ${project.budgetCost || 'Not set'}`);
        console.log(`   Team Members: ${project.assignments.length}`);
        if (project.assignments.length > 0) {
          project.assignments.forEach((assignment) => {
            const user = assignment.employee.user;
            console.log(`     - ${user.firstName} ${user.lastName} (${assignment.role || 'Team Member'})`);
          });
        }
        console.log(`   Created: ${project.createdAt}`);
        console.log('');
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error checking projects:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkProjects();
