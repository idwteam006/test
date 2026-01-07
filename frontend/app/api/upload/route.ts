/**
 * File Upload API Route
 * Handles file uploads to AWS S3
 *
 * POST /api/upload
 * Supports both authenticated users and onboarding tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import {
  uploadFileToS3,
  generateS3Key,
  validateFile,
  ALLOWED_FILE_TYPES,
  FileCategory,
} from '@/lib/s3';
import {
  processProfilePhoto,
  processDocumentImage,
  isValidImage,
  calculateSizeReduction,
} from '@/lib/image-processing';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = (formData.get('category') as string) || 'documents';
    const token = formData.get('token') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    let tenantId: string;
    let userId: string;
    let employeeId: string;
    let uploadContext = 'authenticated';

    // Check for onboarding token first (for public uploads)
    if (token) {
      const invite = await prisma.onboardingInvite.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!invite || invite.expiresAt < new Date()) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      tenantId = invite.user.tenantId;
      userId = invite.userId;
      employeeId = invite.user.employeeId || userId; // Fallback to userId if no employeeId
      uploadContext = 'onboarding';
    } else {
      // Use session authentication
      const cookieStore = await cookies();
      const sessionId = cookieStore.get('session')?.value;

      if (!sessionId) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401 }
        );
      }

      const sessionData = await sessions.get(sessionId);
      if (!sessionData) {
        return NextResponse.json(
          { success: false, error: 'Session expired' },
          { status: 401 }
        );
      }

      tenantId = sessionData.tenantId;
      userId = sessionData.userId;

      // Fetch user's employeeId
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { employeeId: true },
      });

      employeeId = user?.employeeId || userId; // Fallback to userId if no employeeId
    }

    // Validate file
    const validation = validateFile(
      { size: file.size, type: file.type },
      {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ALLOWED_FILE_TYPES.ALL,
      }
    );

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(bytes);
    const originalSize = buffer.length;
    let processedFileName = file.name;
    let mimeType = file.type;

    // Process images for optimization
    const isImage = file.type.startsWith('image/');
    if (isImage && (await isValidImage(buffer))) {
      try {
        // Process based on category
        if (category === 'EMPLOYEE_PHOTO') {
          // Profile photo: crop to 1:1 and convert to WebP
          const processed = await processProfilePhoto(buffer);
          buffer = Buffer.from(processed.buffer);
          processedFileName = file.name.replace(/\.[^.]+$/, '.webp');
          mimeType = 'image/webp';

          const reduction = calculateSizeReduction(originalSize, buffer.length);
          console.log(`Profile photo optimized: ${(originalSize / 1024).toFixed(2)}KB → ${(buffer.length / 1024).toFixed(2)}KB (${reduction}% reduction)`);
        } else if (category === 'EMPLOYEE_DOCUMENT' && file.type.startsWith('image/')) {
          // Document image: maintain ratio and convert to WebP
          const processed = await processDocumentImage(buffer);
          buffer = Buffer.from(processed.buffer);
          processedFileName = file.name.replace(/\.[^.]+$/, '.webp');
          mimeType = 'image/webp';

          const reduction = calculateSizeReduction(originalSize, buffer.length);
          console.log(`Document image optimized: ${(originalSize / 1024).toFixed(2)}KB → ${(buffer.length / 1024).toFixed(2)}KB (${reduction}% reduction)`);
        }
      } catch (imageError) {
        console.error('Image processing failed, uploading original:', imageError);
        // Fall back to original if processing fails
      }
    }

    // Map category to folder structure: {employeeId}/{photos|documents|certificates}
    let folderCategory = 'documents'; // default

    if (category === 'EMPLOYEE_PHOTO') {
      folderCategory = 'photos';
    } else if (category === 'EMPLOYEE_DOCUMENT') {
      // Determine document type from description if available
      const description = formData.get('description') as string;
      if (description && description.toLowerCase().includes('certif')) {
        folderCategory = 'certificates';
      } else {
        folderCategory = 'documents';
      }
    }

    // Generate S3 key: {employeeId}/{photos|documents|certificates}/{timestamp}-{filename}
    const timestamp = Date.now();
    const sanitizedFileName = processedFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `${employeeId}/${folderCategory}/${timestamp}-${sanitizedFileName}`;

    // Upload to S3
    const fileUrl = await uploadFileToS3(buffer, s3Key, mimeType, {
      originalName: file.name,
      uploadedBy: userId,
      tenantId: tenantId,
      uploadContext: uploadContext,
      uploadedAt: new Date().toISOString(),
    });

    console.log('✅ File uploaded successfully:');
    console.log('  - Employee ID:', employeeId);
    console.log('  - Category:', folderCategory);
    console.log('  - S3 Key:', s3Key);
    console.log('  - File URL:', fileUrl);
    console.log('  - MIME Type:', mimeType);
    console.log('  - File Size:', buffer.length, 'bytes');
    console.log('  - Original Size:', originalSize, 'bytes');
    if (isImage && buffer.length < originalSize) {
      console.log('  - Size Reduction:', calculateSizeReduction(originalSize, buffer.length) + '%');
    }

    return NextResponse.json({
      success: true,
      data: {
        fileName: processedFileName,
        fileUrl,
        s3Key,
        fileSize: buffer.length,
        mimeType: mimeType,
        originalSize: originalSize,
        optimized: isImage && buffer.length < originalSize,
      },
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload?key=<s3-key>
 * Delete file from S3
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const s3Key = searchParams.get('key');

    if (!s3Key) {
      return NextResponse.json(
        { success: false, error: 'No S3 key provided' },
        { status: 400 }
      );
    }

    // TODO: Verify user has permission to delete this file
    // Check if file belongs to user's tenant

    const { deleteFileFromS3 } = await import('@/lib/s3');
    await deleteFileFromS3(s3Key);

    // TODO: Delete file record from database
    // await prisma.fileUpload.delete({ where: { s3Key } });

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('File delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
