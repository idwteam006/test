import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

/**
 * GET /api/employee/profile
 *
 * Get the current user's full profile including EmployeeProfile data
 */
export async function GET(request: NextRequest) {
  try {
    // Get session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sessionData = await sessions.get(sessionId);

    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get user with profile and employee data
    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        role: true,
        status: true,
        employeeId: true,
        avatarUrl: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            jobTitle: true,
            startDate: true,
            employmentType: true,
            status: true,
            emergencyContacts: true,
            manager: {
              select: {
                id: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        employeeProfile: {
          select: {
            id: true,
            middleName: true,
            preferredName: true,
            dateOfBirth: true,
            gender: true,
            maritalStatus: true,
            personalEmail: true,
            personalPhone: true,
            alternatePhone: true,
            bloodGroup: true,
            profilePhotoUrl: true,
            currentAddress: true,
            permanentAddress: true,
            sameAsCurrentAddress: true,
            highestQualification: true,
            fieldOfStudy: true,
            university: true,
            yearOfPassing: true,
            linkedinUrl: true,
            githubUrl: true,
            portfolioUrl: true,
            previousCompany: true,
            previousDesignation: true,
            yearsOfExperience: true,
            skills: true,
            certifications: true,
            resumeUrl: true,
            photoIdUrl: true,
            addressProofUrl: true,
            educationCertsUrl: true,
            experienceLettersUrl: true,
            cancelledChequeUrl: true,
            panCardUrl: true,
            aadhaarCardUrl: true,
            passportPhotoUrl: true,
            emergencyContactName: true,
            emergencyRelationship: true,
            emergencyPhone: true,
            emergencyAlternatePhone: true,
            emergencyEmail: true,
            accountHolderName: true,
            accountNumber: true,
            bankName: true,
            ifscCode: true,
            branchName: true,
            accountType: true,
            informationAccurate: true,
            agreeToPolocies: true,
            consentVerification: true,
            dataPrivacyConsent: true,
            codeOfConductAgreement: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch uploaded documents
    const documents = await prisma.fileUpload.findMany({
      where: {
        uploadedById: sessionData.userId,
        category: 'EMPLOYEE_DOCUMENT',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        s3Key: true,
        fileSize: true,
        mimeType: true,
        category: true,
        description: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        documents,
      },
    });

  } catch (error) {
    console.error('Error fetching employee profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/employee/profile
 *
 * Update the current user's profile
 */
export async function PUT(request: NextRequest) {
  try {
    // Get session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sessionData = await sessions.get(sessionId);

    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Extract userUpdates (firstName, lastName) from body for User model update
    const { userUpdates, ...profileData } = body;

    // Update User model if firstName or lastName changed
    if (userUpdates && (userUpdates.firstName || userUpdates.lastName)) {
      await prisma.user.update({
        where: { id: sessionData.userId },
        data: {
          ...(userUpdates.firstName && { firstName: userUpdates.firstName }),
          ...(userUpdates.lastName && { lastName: userUpdates.lastName }),
        },
      });
    }

    // Update or create employee profile
    const profile = await prisma.employeeProfile.upsert({
      where: { userId: sessionData.userId },
      create: {
        userId: sessionData.userId,
        tenantId: sessionData.tenantId,
        ...profileData,
      },
      update: profileData,
    });

    return NextResponse.json({
      success: true,
      data: profile,
      message: 'Profile updated successfully',
    });

  } catch (error) {
    console.error('Error updating employee profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
