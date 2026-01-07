import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function uploadInvoicePDFToS3(
  pdfBuffer: Buffer,
  invoiceNumber: string,
  tenantId: string
): Promise<string> {
  const fileName = `invoices/${tenantId}/${invoiceNumber}-${Date.now()}.pdf`;
  const bucketName = process.env.AWS_S3_BUCKET_NAME;

  if (!bucketName) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
    ACL: 'private', // Keep invoices private
  });

  await s3Client.send(command);

  // Return the S3 URL
  const s3Url = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;
  return s3Url;
}
