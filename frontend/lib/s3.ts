/**
 * AWS S3 Storage Utility
 * Handles file uploads to S3 bucket for Zenora.ai
 *
 * Bucket: medical-storage-prod
 * Region: eu-north-1 (Stockholm)
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

/**
 * Upload file to S3
 * @param file - File buffer or stream
 * @param key - S3 object key (file path in bucket)
 * @param contentType - MIME type of the file
 * @returns S3 object URL
 */
export async function uploadFileToS3(
  file: Buffer | Uint8Array,
  key: string,
  contentType: string,
  metadata?: Record<string, string>
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
    Metadata: metadata,
  });

  await s3Client.send(command);

  // Return public URL
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

/**
 * Generate presigned URL for temporary access
 * @param key - S3 object key
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Presigned URL
 */
export async function generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}

/**
 * Delete file from S3
 * @param key - S3 object key
 */
export async function deleteFileFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Generate S3 key path for organized storage
 * @param tenantId - Tenant ID for multi-tenancy
 * @param category - File category (e.g., 'employees', 'invoices', 'payroll')
 * @param fileName - Original filename
 * @returns Formatted S3 key
 */
export function generateS3Key(tenantId: string, category: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${tenantId}/${category}/${timestamp}-${sanitizedFileName}`;
}

/**
 * File upload categories for Zenora
 */
export enum FileCategory {
  EMPLOYEE_DOCUMENTS = 'employees/documents',
  EMPLOYEE_PHOTOS = 'employees/photos',
  INVOICES = 'invoices',
  PAYROLL = 'payroll',
  PERFORMANCE_REVIEWS = 'performance',
  CONTRACTS = 'contracts',
  RECEIPTS = 'receipts',
  REPORTS = 'reports',
}

/**
 * Validate file size and type
 */
export function validateFile(
  file: { size: number; type: string },
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const { maxSize = 10 * 1024 * 1024, allowedTypes } = options; // Default 10MB

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${maxSize / 1024 / 1024}MB limit`,
    };
  }

  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Allowed file types for different categories
 */
export const ALLOWED_FILE_TYPES = {
  DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  IMAGES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  SPREADSHEETS: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
  ALL: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ],
};
