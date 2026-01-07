const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:FlrOdwpwIfYJRYbKQkGmbFAgQWDxTHcZ@interchange.proxy.rlwy.net:34268/railway',
    },
  },
});

async function addProjectCodes() {
  try {
    // Get all projects without project codes
    const projects = await prisma.project.findMany({
      where: {
        projectCode: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`Found ${projects.length} projects without project codes`);

    const year = new Date().getFullYear();
    let counter = 1;

    for (const project of projects) {
      const projectCode = `PROJ-${year}-${String(counter).padStart(4, '0')}`;

      await prisma.project.update({
        where: { id: project.id },
        data: { projectCode },
      });

      console.log(`✅ Updated project "${project.name}" with code: ${projectCode}`);
      counter++;
    }

    console.log(`\n✅ Successfully added project codes to ${projects.length} projects`);

    // Verify
    const allProjects = await prisma.project.findMany({
      select: {
        projectCode: true,
        name: true,
      },
    });

    console.log('\n📊 All projects:');
    allProjects.forEach((p) => {
      console.log(`  ${p.projectCode} - ${p.name}`);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error adding project codes:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

addProjectCodes();
