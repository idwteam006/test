const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPendingOnboarding() {
  console.log('🔍 Checking for pending onboarding employees...\n');

  // Check OnboardingInvite table
  const pendingInvites = await prisma.onboardingInvite.findMany({
    where: {
      status: {
        in: ['PENDING', 'IN_PROGRESS', 'CHANGES_REQUESTED']
      }
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      designation: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          status: true,
          role: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log('📧 Pending Onboarding Invites:', pendingInvites.length);

  if (pendingInvites.length > 0) {
    console.log('\nInvites:\n');
    pendingInvites.forEach((invite, idx) => {
      const isExpired = new Date(invite.expiresAt) < new Date();
      console.log((idx + 1) + '.', invite.email);
      console.log('   Name:', invite.firstName, invite.lastName);
      console.log('   Designation:', invite.designation || 'N/A');
      console.log('   Status:', invite.status);
      console.log('   Created:', invite.createdAt.toLocaleDateString());
      console.log('   Expires:', invite.expiresAt.toLocaleDateString(), isExpired ? '(EXPIRED)' : '');
      console.log('   User Created:', invite.user ? 'YES' : 'NO');
      if (invite.user) {
        console.log('   User Role:', invite.user.role);
        console.log('   User Status:', invite.user.status);
      }
      console.log('');
    });
  }

  // Check users with pending onboarding status
  const pendingUsers = await prisma.user.findMany({
    where: {
      status: {
        in: ['PENDING', 'INVITED', 'PENDING_ONBOARDING']
      }
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      employeeId: true,
      employee: {
        select: {
          id: true,
          employeeNumber: true,
        }
      },
      employeeProfile: {
        select: {
          id: true,
        }
      }
    },
    orderBy: {
      email: 'asc'
    }
  });

  console.log('👤 Users with Pending Status:', pendingUsers.length);

  if (pendingUsers.length > 0) {
    console.log('\nPending Users:\n');
    pendingUsers.forEach((user, idx) => {
      console.log((idx + 1) + '.', user.email);
      console.log('   Name:', user.firstName, user.lastName);
      console.log('   Role:', user.role);
      console.log('   Status:', user.status);
      console.log('   Employee Record:', user.employee ? 'EXISTS' : 'MISSING');
      console.log('   Profile:', user.employeeProfile ? 'EXISTS' : 'MISSING');
      console.log('');
    });
  }

  // Summary
  console.log('='.repeat(80));
  console.log('\n📊 SUMMARY:');
  console.log('   Pending Invites:', pendingInvites.length);
  console.log('   Pending Users:', pendingUsers.length);
  console.log('   Total Pending:', pendingInvites.length + pendingUsers.length);

  if (pendingInvites.length === 0 && pendingUsers.length === 0) {
    console.log('\n✅ No pending onboarding employees found!');
    console.log('   All employees have completed onboarding.\n');
  }
}

checkPendingOnboarding()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
