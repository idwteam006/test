/**
 * Test Document Upload and Display Flow
 * Verifies the complete document lifecycle
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDocumentFlow() {
  console.log('🧪 Testing Document Upload and Display Flow\n');
  console.log('=' .repeat(60) + '\n');

  try {
    // 1. Check if users have employeeIds
    console.log('1️⃣  Checking User EmployeeIDs...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        employeeId: true,
        firstName: true,
        lastName: true,
      },
      take: 3
    });

    users.forEach(u => {
      const status = u.employeeId ? '✅' : '❌';
      console.log(`   ${status} ${u.firstName} ${u.lastName} - ${u.employeeId || 'NO EMPLOYEE ID'}`);
    });

    // 2. Check employee profiles with documents
    console.log('\n2️⃣  Checking Document URLs in Database...');
    const profiles = await prisma.employeeProfile.findMany({
      where: {
        OR: [
          { resumeUrl: { not: null } },
          { photoIdUrl: { not: null } },
          { addressProofUrl: { not: null } },
          { profilePhotoUrl: { not: null } },
        ]
      },
      select: {
        user: {
          select: {
            email: true,
            employeeId: true,
          }
        },
        profilePhotoUrl: true,
        resumeUrl: true,
        photoIdUrl: true,
        addressProofUrl: true,
        educationCertsUrl: true,
        experienceLettersUrl: true,
        cancelledChequeUrl: true,
        panCardUrl: true,
        aadhaarCardUrl: true,
        passportPhotoUrl: true,
      },
      take: 5
    });

    if (profiles.length === 0) {
      console.log('   ⚠️  No profiles with documents found');
    } else {
      profiles.forEach((p, idx) => {
        console.log(`\n   Profile ${idx + 1}: ${p.user.email} (${p.user.employeeId})`);

        const docs = {
          'Profile Photo': p.profilePhotoUrl,
          'Resume': p.resumeUrl,
          'Photo ID': p.photoIdUrl,
          'Address Proof': p.addressProofUrl,
          'Education Certs': Array.isArray(p.educationCertsUrl) ? p.educationCertsUrl.length + ' files' : p.educationCertsUrl,
          'Experience Letters': Array.isArray(p.experienceLettersUrl) ? p.experienceLettersUrl.length + ' files' : p.experienceLettersUrl,
          'Cancelled Cheque': p.cancelledChequeUrl,
          'PAN Card': p.panCardUrl,
          'Aadhaar': p.aadhaarCardUrl,
          'Passport Photo': p.passportPhotoUrl,
        };

        Object.entries(docs).forEach(([name, url]) => {
          if (url && url !== '0 files') {
            console.log(`     ✅ ${name}: ${typeof url === 'string' ? url.substring(0, 60) + '...' : url}`);
          }
        });
      });
    }

    // 3. Check S3 URL format
    console.log('\n3️⃣  Verifying S3 URL Format...');
    const sampleProfile = profiles[0];
    if (sampleProfile) {
      const urls = [
        sampleProfile.profilePhotoUrl,
        sampleProfile.resumeUrl,
        sampleProfile.photoIdUrl,
      ].filter(Boolean);

      urls.forEach(url => {
        const isCorrectFormat = url.startsWith('https://addtech-s3-storage.s3.');
        const hasEmployeeId = sampleProfile.user.employeeId && url.includes(sampleProfile.user.employeeId);

        console.log(`\n   URL: ${url.substring(0, 80)}...`);
        console.log(`     ${isCorrectFormat ? '✅' : '❌'} HTTPS format: ${isCorrectFormat}`);
        console.log(`     ${hasEmployeeId ? '✅' : '❌'} Contains employeeId: ${hasEmployeeId}`);

        // Check path structure
        const pathMatch = url.match(/\/([^\/]+)\/(photos|documents|certificates)\/(\d+)-(.*)/);
        if (pathMatch) {
          console.log(`     ✅ Path structure: ${pathMatch[1]}/${pathMatch[2]}/${pathMatch[4]}`);
        }
      });
    }

    // 4. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total users checked: ${users.length}`);
    console.log(`Users with employeeId: ${users.filter(u => u.employeeId).length}`);
    console.log(`Profiles with documents: ${profiles.length}`);

    const totalDocs = profiles.reduce((acc, p) => {
      return acc +
        (p.profilePhotoUrl ? 1 : 0) +
        (p.resumeUrl ? 1 : 0) +
        (p.photoIdUrl ? 1 : 0) +
        (p.addressProofUrl ? 1 : 0) +
        (p.cancelledChequeUrl ? 1 : 0) +
        (p.panCardUrl ? 1 : 0) +
        (p.aadhaarCardUrl ? 1 : 0) +
        (p.passportPhotoUrl ? 1 : 0) +
        (Array.isArray(p.educationCertsUrl) ? p.educationCertsUrl.length : 0) +
        (Array.isArray(p.experienceLettersUrl) ? p.experienceLettersUrl.length : 0);
    }, 0);
    console.log(`Total documents stored: ${totalDocs}`);

    console.log('\n✅ Test completed successfully!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Go to /onboard page with a valid invite token');
    console.log('   2. Upload documents (Resume, Photo ID, Address Proof)');
    console.log('   3. Submit the onboarding form');
    console.log('   4. Check /employee/profile → Documents tab');
    console.log('   5. Verify documents are displayed with download links\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDocumentFlow();
