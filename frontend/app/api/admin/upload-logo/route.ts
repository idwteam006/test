import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth-helpers';
import { uploadFileToS3, generateS3Key, validateFile, ALLOWED_FILE_TYPES } from '@/lib/s3';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * POST /api/admin/upload-logo
 * Upload company logo to S3 and update tenant settings
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile(
      { size: file.size, type: file.type },
      {
        maxSize: 5 * 1024 * 1024, // 5MB limit for logos
        allowedTypes: ALLOWED_FILE_TYPES.IMAGES,
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
    const buffer = Buffer.from(bytes);

    // Generate S3 key
    const s3Key = generateS3Key(user.tenantId, 'logos', file.name);

    // Upload to S3
    const logoUrl = await uploadFileToS3(buffer, s3Key, file.type, {
      tenantId: user.tenantId,
      uploadedBy: user.id,
      category: 'company-logo',
    });

    console.log(`[Upload Logo] Uploaded logo to S3: ${logoUrl}`);

    // Update tenant settings with logo URL
    const settings = await prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      update: {
        logoUrl,
      },
      create: {
        tenantId: user.tenantId,
        companyName: 'My Company',
        logoUrl,
        workingHours: { start: '09:00', end: '17:00', days: [1, 2, 3, 4, 5] },
        leavePolicies: { annualLeave: 20, sickLeave: 10 },
      },
    });

    console.log(`[Upload Logo] Updated tenant settings for ${user.tenantId}`);

    return NextResponse.json({
      success: true,
      message: 'Logo uploaded successfully',
      logoUrl,
      settings: {
        id: settings.id,
        logoUrl: settings.logoUrl,
      },
    });
  } catch (error) {
    console.error('[Upload Logo] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload logo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
