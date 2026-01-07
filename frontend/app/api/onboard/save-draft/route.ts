import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/onboard/save-draft
 *
 * Save employee onboarding progress as draft (auto-save)
 *
 * Security:
 * - No authentication required (uses token)
 * - Validates token exists and not expired
 * - Allows partial data saves
 * - Updates OnboardingInvite status to IN_PROGRESS
 *
 * Flow:
 * 1. Validate token
 * 2. Create or update EmployeeProfile with partial data
 * 3. Update invite status to IN_PROGRESS
 * 4. Return success
 */

export async function POST(request: NextRequest) {
  try {
    // 1. Parse input (accept any partial data)
    const body = await request.json();
    const { token, ...profileData } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // 2. Validate token and get invite
    const invite = await prisma.onboardingInvite.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            tenantId: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 404 }
      );
    }

    // 3. Check if token is expired
    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Token expired' },
        { status: 410 }
      );
    }

    // 4. Check onboarding status (can't save if approved or rejected)
    if (invite.status === 'APPROVED' || invite.status === 'REJECTED') {
      return NextResponse.json(
        { success: false, error: `Onboarding is ${invite.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // 5. Prepare profile data (handle dates and JSON fields)
    const profileDataToSave: any = {};

    // Handle date fields
    if (profileData.dateOfBirth) {
      profileDataToSave.dateOfBirth = new Date(profileData.dateOfBirth);
    }

    // Handle simple string/number fields
    const simpleFields = [
      'middleName',
      'preferredName',
      'gender',
      'personalEmail',
      'personalPhone',
      'alternatePhone',
      'bloodGroup',
      'profilePhotoUrl',
      'highestQualification',
      'university',
      'yearOfPassing',
      'linkedinUrl',
      'githubUrl',
      'previousCompany',
      'yearsOfExperience',
      'resumeUrl',
      'photoIdUrl',
      'addressProofUrl',
      'cancelledChequeUrl',
      'emergencyContactName',
      'emergencyRelationship',
      'emergencyPhone',
      'emergencyAlternatePhone',
      'accountHolderName',
      'accountNumber',
      'bankName',
      'ifscCode',
      'branchName',
    ];

    simpleFields.forEach((field) => {
      if (profileData[field] !== undefined) {
        profileDataToSave[field] = profileData[field];
      }
    });

    // Handle boolean fields
    const booleanFields = [
      'sameAsCurrentAddress',
      'informationAccurate',
      'agreeToPolocies',
      'consentVerification',
    ];

    booleanFields.forEach((field) => {
      if (profileData[field] !== undefined) {
        profileDataToSave[field] = profileData[field];
      }
    });

    // Handle JSON fields
    if (profileData.currentAddress) {
      profileDataToSave.currentAddress = profileData.currentAddress;
    }
    if (profileData.permanentAddress) {
      profileDataToSave.permanentAddress = profileData.permanentAddress;
    }
    if (profileData.skills) {
      profileDataToSave.skills = profileData.skills;
    }
    if (profileData.educationCertsUrl) {
      profileDataToSave.educationCertsUrl = profileData.educationCertsUrl;
    }
    if (profileData.experienceLettersUrl) {
      profileDataToSave.experienceLettersUrl = profileData.experienceLettersUrl;
    }

    // 6. Save in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Upsert employee profile
      const profile = await tx.employeeProfile.upsert({
        where: { userId: invite.userId },
        create: {
          userId: invite.userId,
          tenantId: invite.user.tenantId,
          ...profileDataToSave,
        },
        update: profileDataToSave,
      });

      // Update invite status to IN_PROGRESS if not already
      if (invite.status === 'PENDING' || invite.status === 'CHANGES_REQUESTED') {
        await tx.onboardingInvite.update({
          where: { id: invite.id },
          data: { status: 'IN_PROGRESS' },
        });
      }

      return { profile };
    });

    // 7. Return success
    return NextResponse.json(
      {
        success: true,
        message: 'Draft saved successfully',
        data: {
          profileId: result.profile.id,
          lastSaved: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Save draft error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save draft',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Prevent other methods
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}
