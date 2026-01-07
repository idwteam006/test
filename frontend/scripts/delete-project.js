require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const projectCode = 'IDWTEA-2025-0001';

  const project = await prisma.project.findUnique({
    where: { projectCode },
    include: {
      assignments: true,
      tasks: true,
    }
  });

  if (!project) {
    console.log('Project not found:', projectCode);
    return;
  }

  console.log('Found project:', project.id, project.name);
  console.log('Assignments:', project.assignments?.length || 0);
  console.log('Tasks:', project.tasks?.length || 0);

  // Delete related records first
  if (project.assignments?.length > 0) {
    await prisma.projectAssignment.deleteMany({
      where: { projectId: project.id }
    });
    console.log('Deleted assignments');
  }

  if (project.tasks?.length > 0) {
    await prisma.task.deleteMany({
      where: { projectId: project.id }
    });
    console.log('Deleted tasks');
  }

  // Delete the project
  await prisma.project.delete({
    where: { id: project.id }
  });

  console.log('Project', projectCode, 'deleted successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());