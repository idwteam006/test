import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/onboard/validate-token?token=xxx
 *
 * Validate onboarding invite token and return employee details
 *
 * Security:
 * - No authentication required (public endpoint)
 * - Validates token exists and not expired
 * - Validates onboarding status
 * - Returns minimal employee information
 *
 * Flow:
 * 1. Get token from query string
 * 2. Find onboarding invite by token
 * 3. Check expiration and status
 * 4. Return employee details and invite info
 */

export async function GET(request: NextRequest) {
  try {
    // 1. Get token from query string
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token is required',
        },
        { status: 400 }
      );
    }

    // 2. Find onboarding invite by token
    const invite = await prisma.onboardingInvite.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            status: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired invitation link',
        },
        { status: 404 }
      );
    }

    // 3. Check if token is expired
    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invitation link has expired. Please contact HR for a new invitation.',
        },
        { status: 410 } // 410 Gone
      );
    }

    // 4. Check onboarding status
    if (invite.status === 'APPROVED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Onboarding already approved. You can now login to your account.',
          redirect: '/login',
        },
        { status: 400 }
      );
    }

    if (invite.status === 'REJECTED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Onboarding was rejected. Please contact HR for assistance.',
        },
        { status: 400 }
      );
    }

    // 5. Update user status to PENDING_ONBOARDING if still INVITED
    if (invite.user.status === 'INVITED') {
      await prisma.user.update({
        where: { id: invite.userId },
        data: { status: 'PENDING_ONBOARDING' },
      });

      // Also update invite status to IN_PROGRESS if still PENDING
      if (invite.status === 'PENDING') {
        await prisma.onboardingInvite.update({
          where: { id: invite.id },
          data: { status: 'IN_PROGRESS' },
        });
      }
    }

    // 6. Get employee profile if exists (for in-progress onboarding)
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: invite.userId },
    });

    // 7. Return success with invite details
    return NextResponse.json(
      {
        success: true,
        data: {
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
            expiresAt: invite.expiresAt,
          },
          user: {
            id: invite.user.id,
            email: invite.user.email,
            firstName: invite.user.firstName,
            lastName: invite.user.lastName,
            employeeId: invite.user.employeeId,
          },
          tenant: {
            id: invite.tenant.id,
            name: invite.tenant.name,
          },
          profile: employeeProfile ? {
            // Personal Info
            middleName: employeeProfile.middleName,
            preferredName: employeeProfile.preferredName,
            dateOfBirth: employeeProfile.dateOfBirth,
            gender: employeeProfile.gender,
            personalEmail: employeeProfile.personalEmail,
            personalPhone: employeeProfile.personalPhone,
            alternatePhone: employeeProfile.alternatePhone,
            bloodGroup: employeeProfile.bloodGroup,
            profilePhotoUrl: employeeProfile.profilePhotoUrl,
            // Address
            currentAddress: employeeProfile.currentAddress,
            permanentAddress: employeeProfile.permanentAddress,
            sameAsCurrentAddress: employeeProfile.sameAsCurrentAddress,
            // Professional
            highestQualification: employeeProfile.highestQualification,
            university: employeeProfile.university,
            yearOfPassing: employeeProfile.yearOfPassing,
            linkedinUrl: employeeProfile.linkedinUrl,
            githubUrl: employeeProfile.githubUrl,
            previousCompany: employeeProfile.previousCompany,
            yearsOfExperience: employeeProfile.yearsOfExperience,
            skills: employeeProfile.skills,
            // Documents
            resumeUrl: employeeProfile.resumeUrl,
            photoIdUrl: employeeProfile.photoIdUrl,
            addressProofUrl: employeeProfile.addressProofUrl,
            educationCertsUrl: employeeProfile.educationCertsUrl,
            experienceLettersUrl: employeeProfile.experienceLettersUrl,
            cancelledChequeUrl: employeeProfile.cancelledChequeUrl,
            // Emergency Contact
            emergencyContactName: employeeProfile.emergencyContactName,
            emergencyRelationship: employeeProfile.emergencyRelationship,
            emergencyPhone: employeeProfile.emergencyPhone,
            emergencyAlternatePhone: employeeProfile.emergencyAlternatePhone,
            // Bank Details
            accountHolderName: employeeProfile.accountHolderName,
            accountNumber: employeeProfile.accountNumber,
            bankName: employeeProfile.bankName,
            ifscCode: employeeProfile.ifscCode,
            branchName: employeeProfile.branchName,
            // Declarations
            informationAccurate: employeeProfile.informationAccurate,
            agreeToPolocies: employeeProfile.agreeToPolocies,
            consentVerification: employeeProfile.consentVerification,
          } : null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Validate token error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate invitation',
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
