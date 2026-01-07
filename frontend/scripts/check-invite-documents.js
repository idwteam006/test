const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function checkInviteDocuments() {
  const inviteId = 'f33377f5-9e64-445e-96f4-114a4196ff6d';
  
  console.log('🔍 Checking invite documents...\n');
  console.log('Invite ID:', inviteId);
  console.log('');

  try {
    // Get the invite with user and profile
    const invite = await prisma.onboardingInvite.findUnique({
      where: { id: inviteId },
      include: {
        user: {
          include: {
            employeeProfile: true,
            department: true,
            manager: true,
          },
        },
      },
    });

    if (!invite) {
      console.log('❌ Invite not found');
      return;
    }

    console.log('✅ Invite found');
    console.log('');
    console.log('📋 Invite Details:');
    console.log('  Status:', invite.status);
    console.log('  Email:', invite.email);
    console.log('  Name:', invite.firstName, invite.lastName);
    console.log('  Created:', invite.createdAt);
    console.log('  Completed:', invite.completedAt || 'Not completed');
    console.log('');

    console.log('👤 User Details:');
    console.log('  User ID:', invite.user.id);
    console.log('  Employee ID:', invite.user.employeeId);
    console.log('  Status:', invite.user.status);
    console.log('  Role:', invite.user.role);
    console.log('');

    const profile = invite.user.employeeProfile;
    
    if (!profile) {
      console.log('⚠️  No employee profile found');
      console.log('   Profile needs to be created during onboarding submission');
      return;
    }

    console.log('📄 Employee Profile Found:');
    console.log('  Profile ID:', profile.id);
    console.log('');
    console.log('📎 Document URLs:');
    console.log('');
    
    // Check each document URL
    const docs = [
      { name: 'Resume', url: profile.resumeUrl },
      { name: 'Photo ID', url: profile.photoIdUrl },
      { name: 'Address Proof', url: profile.addressProofUrl },
      { name: 'Cancelled Cheque', url: profile.cancelledChequeUrl },
    ];

    docs.forEach(doc => {
      if (doc.url) {
        const isS3 = doc.url.includes('s3.') || doc.url.includes('amazonaws.com');
        const isPlaceholder = doc.url.includes('storage.example.com');
        
        console.log(`  ${doc.name}:`);
        console.log(`    URL: ${doc.url}`);
        
        if (isS3) {
          console.log(`    ✅ S3 URL (correct)`);
        } else if (isPlaceholder) {
          console.log(`    ⚠️  Placeholder URL (needs real upload)`);
        } else {
          console.log(`    ⚠️  Unknown URL format`);
        }
        console.log('');
      } else {
        console.log(`  ${doc.name}: ❌ Not provided`);
        console.log('');
      }
    });

    // Check if URLs exist in S3
    if (profile.resumeUrl && profile.resumeUrl.includes('s3.')) {
      console.log('🔍 Checking if files exist in S3...\n');
      
      const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
      
      const s3 = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      for (const doc of docs) {
        if (doc.url && doc.url.includes('s3.')) {
          try {
            // Extract key from URL
            const urlParts = doc.url.split('.amazonaws.com/');
            if (urlParts.length > 1) {
              const key = urlParts[1];
              
              const cmd = new HeadObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: key,
              });
              
              await s3.send(cmd);
              console.log(`  ✅ ${doc.name}: File exists in S3`);
            }
          } catch (error) {
            console.log(`  ❌ ${doc.name}: File not found in S3`);
          }
        }
      }
    }

    console.log('\n✅ Check complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkInviteDocuments();
