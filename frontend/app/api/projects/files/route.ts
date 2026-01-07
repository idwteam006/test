import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { uploadFileToS3, deleteFileFromS3, validateFile, ALLOWED_FILE_TYPES } from '@/lib/s3';

/**
 * GET /api/projects/files?projectId=xxx
 * List all files for a project
 */
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Verify project belongs to tenant
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId: sessionData.tenantId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get files for the project
    const files = await prisma.fileUpload.findMany({
      where: {
        projectId: projectId,
        tenantId: sessionData.tenantId,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      files: files.map((file) => ({
        id: file.id,
        fileName: file.fileName,
        fileUrl: file.fileUrl,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        description: file.description,
        createdAt: file.createdAt,
        uploadedBy: file.uploadedBy,
      })),
    });
  } catch (error) {
    console.error('Error fetching project files:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/files
 * Upload a file to a project
 */
export async function POST(request: NextRequest) {
  try {
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Verify project belongs to tenant
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId: sessionData.tenantId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Validate file
    const validation = validateFile(
      { size: file.size, type: file.type },
      {
        maxSize: 25 * 1024 * 1024, // 25MB for project files
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
    const buffer = Buffer.from(bytes);

    // Generate S3 key for project files
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `projects/${projectId}/${timestamp}-${sanitizedFileName}`;

    // Upload to S3
    const fileUrl = await uploadFileToS3(buffer, s3Key, file.type, {
      originalName: file.name,
      uploadedBy: sessionData.userId,
      tenantId: sessionData.tenantId,
      projectId: projectId,
      uploadedAt: new Date().toISOString(),
    });

    // Create file record in database
    const fileUpload = await prisma.fileUpload.create({
      data: {
        tenantId: sessionData.tenantId,
        fileName: file.name,
        fileUrl: fileUrl,
        s3Key: s3Key,
        fileSize: buffer.length,
        mimeType: file.type,
        category: 'PROJECT_FILE',
        description: description || null,
        uploadedById: sessionData.userId,
        projectId: projectId,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    console.log('Project file uploaded:', fileUpload.id);

    return NextResponse.json({
      success: true,
      file: {
        id: fileUpload.id,
        fileName: fileUpload.fileName,
        fileUrl: fileUpload.fileUrl,
        fileSize: fileUpload.fileSize,
        mimeType: fileUpload.mimeType,
        description: fileUpload.description,
        createdAt: fileUpload.createdAt,
        uploadedBy: fileUpload.uploadedBy,
      },
    });
  } catch (error) {
    console.error('Error uploading project file:', error);
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
 * DELETE /api/projects/files?id=xxx
 * Delete a project file
 */
export async function DELETE(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Get file and verify it belongs to tenant
    const file = await prisma.fileUpload.findFirst({
      where: {
        id: fileId,
        tenantId: sessionData.tenantId,
      },
    });

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // Delete from S3
    try {
      await deleteFileFromS3(file.s3Key);
    } catch (s3Error) {
      console.error('S3 delete error:', s3Error);
      // Continue with database deletion even if S3 fails
    }

    // Delete from database
    await prisma.fileUpload.delete({
      where: { id: fileId },
    });

    console.log('Project file deleted:', fileId);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting project file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
