import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

/**
 * GET /api/hr/onboarding/pending
 *
 * Get all pending onboarding submissions for HR review
 *
 * Security:
 * - Requires authenticated session
 * - Only HR/ADMIN can view pending submissions
 * - Returns only submissions for their tenant
 *
 * Flow:
 * 1. Validate HR permissions
 * 2. Get all SUBMITTED onboarding invites
 * 3. Include employee profile data
 * 4. Return list
 */

export async function GET(request: NextRequest) {
  try {
    // 1. Get session and validate authentication
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get session from Redis
    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    // Get user details from database to verify role
    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        id: true,
        role: true,
        tenantId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has HR, MANAGER, or ADMIN role
    if (!['HR', 'MANAGER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // 2. Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'SUBMITTED';

    // 3. Get onboarding invites with profile data
    const invites = await prisma.onboardingInvite.findMany({
      where: {
        tenantId: user.tenantId,
        status: status as any,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            status: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    // 4. Get employee profiles for each invite
    const invitesWithProfiles = await Promise.all(
      invites.map(async (invite) => {
        const profile = await prisma.employeeProfile.findUnique({
          where: { userId: invite.userId },
        });

        return {
          invite: {
            id: invite.id,
            email: invite.email,
            firstName: invite.firstName,
            lastName: invite.lastName,
            designation: invite.designation,
            joiningDate: invite.joiningDate,
            workLocation: invite.workLocation,
            employmentType: invite.employmentType,
            status: invite.status,
            createdAt: invite.createdAt,
            completedAt: invite.completedAt,
          },
          user: invite.user,
          profile: profile ? {
            // Personal Info
            middleName: profile.middleName,
            preferredName: profile.preferredName,
            dateOfBirth: profile.dateOfBirth,
            gender: profile.gender,
            personalEmail: profile.personalEmail,
            personalPhone: profile.personalPhone,
            alternatePhone: profile.alternatePhone,
            bloodGroup: profile.bloodGroup,
            profilePhotoUrl: profile.profilePhotoUrl,
            // Address
            currentAddress: profile.currentAddress,
            permanentAddress: profile.permanentAddress,
            sameAsCurrentAddress: profile.sameAsCurrentAddress,
            // Professional
            highestQualification: profile.highestQualification,
            university: profile.university,
            yearOfPassing: profile.yearOfPassing,
            linkedinUrl: profile.linkedinUrl,
            githubUrl: profile.githubUrl,
            previousCompany: profile.previousCompany,
            yearsOfExperience: profile.yearsOfExperience,
            skills: profile.skills,
            // Documents
            resumeUrl: profile.resumeUrl,
            photoIdUrl: profile.photoIdUrl,
            addressProofUrl: profile.addressProofUrl,
            educationCertsUrl: profile.educationCertsUrl,
            experienceLettersUrl: profile.experienceLettersUrl,
            cancelledChequeUrl: profile.cancelledChequeUrl,
            // Emergency Contact
            emergencyContactName: profile.emergencyContactName,
            emergencyRelationship: profile.emergencyRelationship,
            emergencyPhone: profile.emergencyPhone,
            emergencyAlternatePhone: profile.emergencyAlternatePhone,
            // Bank Details
            accountHolderName: profile.accountHolderName,
            accountNumber: profile.accountNumber,
            bankName: profile.bankName,
            ifscCode: profile.ifscCode,
            branchName: profile.branchName,
            // Declarations
            informationAccurate: profile.informationAccurate,
            agreeToPolocies: profile.agreeToPolocies,
            consentVerification: profile.consentVerification,
          } : null,
        };
      })
    );

    // 5. Return success
    return NextResponse.json(
      {
        success: true,
        data: invitesWithProfiles,
        count: invitesWithProfiles.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get pending onboarding error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get pending onboarding submissions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Prevent other methods
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use GET.' },
    { status: 405 }
  );
}
