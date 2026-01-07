/**
 * Test Onboarding File Upload Flow
 * Simulates uploading a file through the API as if from onboarding form
 */

const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

async function testOnboardingUpload() {
  console.log('🧪 Testing Onboarding Upload Flow...\n');

  const region = process.env.AWS_REGION || 'eu-north-1';
  const bucketName = process.env.S3_BUCKET_NAME || 'medical-storage-prod';

  const s3Client = new S3Client({
    region: region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  // Simulate tenant and user IDs
  const mockTenantId = 'test-tenant-001';
  const mockUserId = 'test-user-001';
  const timestamp = Date.now();

  // Test files to upload
  const testFiles = [
    { category: 'resumes', filename: 'John_Doe_Resume.pdf', content: 'Mock resume content for testing' },
    { category: 'identity', filename: 'Aadhar_Card.pdf', content: 'Mock Aadhar document content' },
    { category: 'bank', filename: 'Cancelled_Cheque.pdf', content: 'Mock cancelled cheque content' },
    { category: 'documents', filename: 'Certificate.pdf', content: 'Mock certificate content' },
  ];

  console.log('📁 Test Tenant ID:', mockTenantId);
  console.log('👤 Test User ID:', mockUserId);
  console.log('📦 Bucket:', bucketName);
  console.log('🌍 Region:', region);
  console.log('');

  const uploadedFiles = [];

  for (const testFile of testFiles) {
    try {
      // Generate S3 key following the actual path structure
      const s3Key = `${mockTenantId}/employees/onboarding/${testFile.category}/${timestamp}-${testFile.filename}`;
      
      console.log(`📤 Uploading: ${testFile.category}/${testFile.filename}`);
      
      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: Buffer.from(testFile.content),
        ContentType: 'application/pdf',
        Metadata: {
          uploadedBy: mockUserId,
          tenantId: mockTenantId,
          uploadContext: 'onboarding',
          originalName: testFile.filename,
          uploadedAt: new Date().toISOString(),
          testFile: 'true',
        },
      });

      await s3Client.send(command);

      const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
      
      console.log(`   ✅ Uploaded successfully`);
      console.log(`   📍 S3 Key: ${s3Key}`);
      console.log(`   🔗 URL: ${fileUrl}`);
      console.log('');

      uploadedFiles.push({ category: testFile.category, s3Key, fileUrl });

    } catch (error) {
      console.error(`   ❌ Failed to upload ${testFile.filename}:`, error.message);
      console.log('');
    }
  }

  // Verify uploads by listing files
  console.log('🔍 Verifying uploads in S3...\n');

  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: `${mockTenantId}/employees/onboarding/`,
    });

    const response = await s3Client.send(listCommand);

    if (response.Contents && response.Contents.length > 0) {
      console.log(`✅ Found ${response.Contents.length} file(s) in onboarding folder:\n`);
      
      response.Contents.forEach((item, idx) => {
        const size = (item.Size / 1024).toFixed(2);
        const date = item.LastModified ? item.LastModified.toISOString().split('T')[0] : 'N/A';
        console.log(`   ${idx + 1}. ${item.Key}`);
        console.log(`      Size: ${size} KB | Date: ${date}`);
      });
    } else {
      console.log('⚠️  No files found in onboarding folder');
    }

  } catch (error) {
    console.error('❌ Error verifying uploads:', error.message);
  }

  console.log('\n🎉 Test Complete!\n');
  console.log('📊 Summary:');
  console.log(`   Attempted: ${testFiles.length} files`);
  console.log(`   Uploaded: ${uploadedFiles.length} files`);
  console.log(`   Failed: ${testFiles.length - uploadedFiles.length} files`);
  
  if (uploadedFiles.length === testFiles.length) {
    console.log('\n✅ All uploads successful! The onboarding upload flow is working correctly.');
  } else {
    console.log('\n⚠️  Some uploads failed. Check the errors above.');
  }

  console.log('\n💡 Expected folder structure in S3:');
  console.log(`   ${mockTenantId}/`);
  console.log(`   └── employees/`);
  console.log(`       └── onboarding/`);
  console.log(`           ├── resumes/${timestamp}-John_Doe_Resume.pdf`);
  console.log(`           ├── identity/${timestamp}-Aadhar_Card.pdf`);
  console.log(`           ├── bank/${timestamp}-Cancelled_Cheque.pdf`);
  console.log(`           └── documents/${timestamp}-Certificate.pdf`);
}

testOnboardingUpload();
