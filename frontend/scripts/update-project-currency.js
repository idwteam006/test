const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:FlrOdwpwIfYJRYbKQkGmbFAgQWDxTHcZ@interchange.proxy.rlwy.net:34268/railway',
    },
  },
});

async function updateProjectCurrency() {
  try {
    // Update existing project to have USD currency
    const result = await prisma.project.updateMany({
      where: {
        currency: null, // Update projects without currency
      },
      data: {
        currency: 'USD',
      },
    });

    console.log(`✅ Updated ${result.count} project(s) to have USD currency`);

    // Verify the update
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        budgetCost: true,
        currency: true,
      },
    });

    console.log('\n📊 All projects with currency:');
    projects.forEach((project) => {
      console.log(`- ${project.name}: ${project.currency} ${project.budgetCost || 0}`);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error updating project currency:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

updateProjectCurrency();
