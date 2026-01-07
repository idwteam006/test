/**
 * Test AWS S3 Connection
 * Verifies S3 credentials and bucket access
 */

const { S3Client, ListObjectsV2Command, PutObjectCommand } = require('@aws-sdk/client-s3');

async function testS3Connection() {
  console.log('🔍 Testing AWS S3 Connection...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`AWS_REGION: ${process.env.AWS_REGION || process.env.S3_REGION || '❌ NOT SET'}`);
  console.log(`AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`S3_BUCKET_NAME: ${process.env.S3_BUCKET_NAME || '❌ NOT SET'}\n`);

  const region = process.env.AWS_REGION || process.env.S3_REGION;
  const bucketName = process.env.S3_BUCKET_NAME;

  if (!region || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !bucketName) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  // Initialize S3 Client
  const s3Client = new S3Client({
    region: region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    // Test 1: List objects in bucket
    console.log('📦 Test 1: Listing objects in bucket...');
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 5,
    });
    const listResponse = await s3Client.send(listCommand);
    console.log(`✅ Success! Found ${listResponse.KeyCount || 0} objects (showing max 5)`);
    if (listResponse.Contents && listResponse.Contents.length > 0) {
      console.log('Sample files:');
      listResponse.Contents.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.Key} (${(item.Size / 1024).toFixed(2)} KB)`);
      });
    }
    console.log('');

    // Test 2: Upload a test file
    console.log('📤 Test 2: Uploading test file...');
    const testKey = `test-connection/${Date.now()}-test.txt`;
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: Buffer.from('This is a test file from Zenora.ai'),
      ContentType: 'text/plain',
      Metadata: {
        test: 'true',
        timestamp: new Date().toISOString(),
      },
    });
    await s3Client.send(putCommand);
    console.log(`✅ Success! Uploaded test file: ${testKey}`);
    console.log(`   URL: https://${bucketName}.s3.${region}.amazonaws.com/${testKey}\n`);

    console.log('🎉 All tests passed! S3 connection is working correctly.');
    console.log(`\n📁 Bucket: ${bucketName}`);
    console.log(`🌍 Region: ${region}`);

  } catch (error) {
    console.error('❌ S3 Connection Failed:');
    console.error('Error:', error.message);
    if (error.Code) {
      console.error('Code:', error.Code);
    }
    if (error.$metadata) {
      console.error('HTTP Status:', error.$metadata.httpStatusCode);
    }
    console.error('\n💡 Troubleshooting:');
    console.error('1. Verify AWS credentials are correct');
    console.error('2. Check IAM permissions (s3:ListBucket, s3:PutObject, s3:GetObject)');
    console.error('3. Verify bucket name and region');
    console.error('4. Check bucket policy and CORS settings');
    process.exit(1);
  }
}

testS3Connection();
