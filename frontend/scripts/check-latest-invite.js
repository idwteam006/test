const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function checkLatestInvite() {
  try {
    console.log('🔍 Fetching latest onboarding invitation...\n');

    // Get latest onboarding invite
    const latestInvite = await prisma.onboardingInvite.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            status: true,
            role: true,
            departmentId: true,
            emailVerified: true,
            createdAt: true,
          }
        },
      }
    });

    // Fetch department, manager, and creator separately
    let department = null;
    let manager = null;
    let creator = null;

    if (latestInvite) {
      if (latestInvite.departmentId) {
        department = await prisma.department.findUnique({
          where: { id: latestInvite.departmentId },
          select: { id: true, name: true }
        });
      }

      if (latestInvite.managerId) {
        manager = await prisma.user.findUnique({
          where: { id: latestInvite.managerId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        });
      }

      if (latestInvite.createdBy) {
        creator = await prisma.user.findUnique({
          where: { id: latestInvite.createdBy },
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          }
        });
      }
    }

    if (!latestInvite) {
      console.log('❌ No invitations found in database');
      return;
    }

    console.log('📨 LATEST ONBOARDING INVITATION');
    console.log('='.repeat(80));
    console.log('\n📋 INVITATION DETAILS:');
    console.log('  ID:', latestInvite.id);
    console.log('  Status:', latestInvite.status);
    console.log('  Token:', latestInvite.token.substring(0, 20) + '...');
    console.log('  Created At:', latestInvite.createdAt.toISOString());
    console.log('  Expires At:', latestInvite.expiresAt.toISOString());
    console.log('  Completed At:', latestInvite.completedAt || 'Not completed');

    console.log('\n👤 EMPLOYEE DETAILS:');
    console.log('  Name:', latestInvite.firstName, latestInvite.lastName);
    console.log('  Email:', latestInvite.email);
    console.log('  Employee ID:', latestInvite.employeeId);
    console.log('  Designation:', latestInvite.designation);
    console.log('  Department:', department ? department.name : 'Not found');
    console.log('  Employment Type:', latestInvite.employmentType);
    console.log('  Joining Date:', latestInvite.joiningDate.toISOString().split('T')[0]);
    console.log('  Work Location:', latestInvite.workLocation || 'Not specified');

    console.log('\n👔 REPORTING MANAGER:');
    if (manager) {
      console.log('  Name:', manager.firstName, manager.lastName);
      console.log('  Email:', manager.email);
    } else {
      console.log('  No manager assigned');
    }

    console.log('\n🔐 USER ACCOUNT STATUS:');
    console.log('  User ID:', latestInvite.user.id);
    console.log('  Email:', latestInvite.user.email);
    console.log('  Status:', latestInvite.user.status);
    console.log('  Role:', latestInvite.user.role);
    console.log('  Email Verified:', latestInvite.user.emailVerified);
    console.log('  Account Created:', latestInvite.user.createdAt.toISOString());

    console.log('\n📤 INVITED BY:');
    if (creator) {
      console.log('  Name:', creator.firstName, creator.lastName);
      console.log('  Email:', creator.email);
      console.log('  Role:', creator.role);
    } else {
      console.log('  Creator info not available');
    }

    console.log('\n🔗 ONBOARDING LINK:');
    const appUrl = 'https://zenora-alpha.vercel.app';
    console.log(`  ${appUrl}/onboard?token=${latestInvite.token}`);

    console.log('\n⏰ EXPIRATION:');
    const now = new Date();
    const expiresAt = new Date(latestInvite.expiresAt);
    const hoursLeft = Math.floor((expiresAt - now) / (1000 * 60 * 60));
    const daysLeft = Math.floor(hoursLeft / 24);

    if (expiresAt > now) {
      console.log(`  Expires in: ${daysLeft} days, ${hoursLeft % 24} hours`);
      console.log('  Status: ✅ Active');
    } else {
      console.log('  Status: ❌ Expired');
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestInvite();
