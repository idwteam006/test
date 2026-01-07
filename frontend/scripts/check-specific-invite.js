const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function checkInvite() {
  const inviteId = 'f33377f5-9e64-445e-96f4-114a4196ff6d';

  console.log('🔍 Checking invite:', inviteId);
  console.log('');

  try {
    const invite = await prisma.onboardingInvite.findUnique({
      where: { id: inviteId },
      include: {
        user: {
          include: {
            employeeProfile: true,
            department: true,
          },
        },
      },
    });

    if (!invite) {
      console.log('❌ Invite not found');
      return;
    }

    console.log('✅ Invite Found');
    console.log('  Status:', invite.status);
    console.log('  Email:', invite.email);
    console.log('  Name:', invite.firstName, invite.lastName);
    console.log('  Created:', invite.createdAt.toISOString());
    console.log('  Completed:', invite.completedAt ? invite.completedAt.toISOString() : 'Not completed');
    console.log('');

    const profile = invite.user.employeeProfile;

    if (!profile) {
      console.log('⚠️  No employee profile found');
      console.log('   (Profile is created when employee submits onboarding form)');
      return;
    }

    console.log('📄 Employee Profile Found');
    console.log('');
    console.log('📎 Document URLs:');
    console.log('');

    const docs = [
      { name: 'Resume/CV', url: profile.resumeUrl },
      { name: 'Photo ID', url: profile.photoIdUrl },
      { name: 'Address Proof', url: profile.addressProofUrl },
      { name: 'Cancelled Cheque', url: profile.cancelledChequeUrl },
    ];

    let hasS3 = false;
    let hasPlaceholder = false;
    let hasNone = false;

    docs.forEach(doc => {
      if (doc.url) {
        const isS3 = doc.url.includes('s3.') || doc.url.includes('amazonaws.com');
        const isPlaceholder = doc.url.includes('storage.example.com');

        console.log(`  ${doc.name}:`);
        console.log(`    ${doc.url}`);

        if (isS3) {
          console.log(`    ✅ S3 URL (Real file storage)`);
          hasS3 = true;
        } else if (isPlaceholder) {
          console.log(`    ⚠️  Placeholder URL (Mock/Test data)`);
          hasPlaceholder = true;
        } else {
          console.log(`    ⚠️  Unknown URL format`);
        }
        console.log('');
      } else {
        console.log(`  ${doc.name}: ❌ Not provided`);
        console.log('');
        hasNone = true;
      }
    });

    console.log('📊 Summary:');
    console.log('  S3 URLs:', hasS3 ? '✅ Yes' : '❌ No');
    console.log('  Placeholder URLs:', hasPlaceholder ? '⚠️  Yes' : '✅ No');
    console.log('  Missing URLs:', hasNone ? '⚠️  Yes' : '✅ No');
    console.log('');

    if (hasPlaceholder) {
      console.log('⚠️  ACTION REQUIRED:');
      console.log('   Documents are using placeholder URLs');
      console.log('   Real files need to be uploaded to S3');
      console.log('');
      console.log('   To fix:');
      console.log('   1. Employee needs to complete onboarding form');
      console.log('   2. Upload actual documents in Step 4');
      console.log('   3. Files will be stored in S3 with proper URLs');
    } else if (hasS3) {
      console.log('✅ Documents are stored in S3 correctly');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvite();
