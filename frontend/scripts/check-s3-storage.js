/**
 * Check S3 Storage Structure
 * Lists files in the bucket to see where files are being stored
 */

const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

async function checkS3Storage() {
  console.log('🔍 Checking S3 Storage Structure...\n');

  const region = process.env.AWS_REGION || process.env.S3_REGION;
  const bucketName = process.env.S3_BUCKET_NAME;

  const s3Client = new S3Client({
    region: region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    // List all objects (up to 100)
    console.log(`📦 Bucket: ${bucketName}`);
    console.log(`🌍 Region: ${region}\n`);

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 100,
    });

    const response = await s3Client.send(command);

    if (!response.Contents || response.Contents.length === 0) {
      console.log('⚠️  Bucket is empty');
      return;
    }

    console.log(`📊 Total files: ${response.KeyCount}\n`);

    // Group files by top-level folder
    const folderGroups = {};
    response.Contents.forEach((item) => {
      const parts = item.Key.split('/');
      const topFolder = parts[0];
      
      if (!folderGroups[topFolder]) {
        folderGroups[topFolder] = [];
      }
      folderGroups[topFolder].push(item);
    });

    // Display structure
    console.log('📁 Storage Structure:\n');
    Object.keys(folderGroups).sort().forEach((folder) => {
      console.log(`/${folder}/ (${folderGroups[folder].length} files)`);
      
      // Show first 5 files in each folder
      const files = folderGroups[folder].slice(0, 5);
      files.forEach((file) => {
        const size = (file.Size / 1024).toFixed(2);
        const date = file.LastModified ? file.LastModified.toISOString().split('T')[0] : 'N/A';
        console.log(`  ├─ ${file.Key} (${size} KB, ${date})`);
      });

      if (folderGroups[folder].length > 5) {
        console.log(`  └─ ... and ${folderGroups[folder].length - 5} more files\n`);
      } else {
        console.log('');
      }
    });

    // Check for employee/onboarding files specifically
    const employeeFiles = response.Contents.filter(item => 
      item.Key.includes('employee') || 
      item.Key.includes('onboard')
    );

    if (employeeFiles.length > 0) {
      console.log('👥 Employee/Onboarding Files Found:\n');
      employeeFiles.forEach((file) => {
        console.log(`  ✅ ${file.Key}`);
      });
    } else {
      console.log('⚠️  No employee/onboarding files found yet');
      console.log('   Files will be stored in: {tenantId}/employees/onboarding/{category}/{timestamp}-{filename}');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkS3Storage();
