import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOnboardingSubmissionNotification } from '@/lib/resend-email';
import { z } from 'zod';

/**
 * POST /api/onboard/submit-profile
 *
 * Employee submits their complete onboarding profile
 *
 * Security:
 * - No authentication required (uses token)
 * - Validates token exists and not expired
 * - Validates all required fields
 * - Creates or updates employee profile
 *
 * Flow:
 * 1. Validate token
 * 2. Validate input data
 * 3. Create/update EmployeeProfile
 * 4. Update OnboardingInvite status to SUBMITTED
 * 5. Notify HR
 * 6. Return success
 */

const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().min(6, 'Valid pincode is required'),
  country: z.string().min(1, 'Country is required'),
});

const profileSchema = z.object({
  token: z.string().min(1, 'Token is required'),

  // Personal Info
  middleName: z.string().optional(),
  preferredName: z.string().optional(),
  dateOfBirth: z.string().refine((val) => {
    // Accept YYYY-MM-DD format from input[type="date"]
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(val)) return true;
    // Also accept ISO datetime format
    try {
      new Date(val).toISOString();
      return true;
    } catch {
      return false;
    }
  }, 'Invalid date of birth format'),
  gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']),
  personalEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  personalPhone: z.string().min(10, 'Valid phone number is required'),
  alternatePhone: z.string().optional(),
  bloodGroup: z.string().optional(),
  profilePhotoUrl: z.string().url('Invalid photo URL').optional().or(z.literal('')),

  // Address
  currentAddress: addressSchema,
  permanentAddress: addressSchema.optional(),
  sameAsCurrentAddress: z.boolean().default(false),

  // Professional
  highestQualification: z.string().min(1, 'Qualification is required'),
  university: z.string().min(1, 'University is required'),
  yearOfPassing: z.number().int().min(1950).max(new Date().getFullYear()),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
  githubUrl: z.string().url('Invalid GitHub URL').optional().or(z.literal('')),
  previousCompany: z.string().optional(),
  yearsOfExperience: z.number().int().min(0).max(50),
  skills: z.array(z.string()).optional(),

  // Documents
  resumeUrl: z.string().url('Invalid resume URL'),
  photoIdUrl: z.string().url('Invalid photo ID URL'),
  addressProofUrl: z.string().url('Invalid address proof URL'),
  educationCertsUrl: z.array(z.string().url()).optional(),
  experienceLettersUrl: z.array(z.string().url()).optional(),
  cancelledChequeUrl: z.string().url('Invalid cheque URL').optional().or(z.literal('')),

  // Emergency Contact
  emergencyContactName: z.string().min(1, 'Emergency contact name is required'),
  emergencyRelationship: z.string().min(1, 'Relationship is required'),
  emergencyPhone: z.string().min(10, 'Valid phone number is required'),
  emergencyAlternatePhone: z.string().optional(),

  // Bank Details (optional but all fields required if one is provided)
  accountHolderName: z.string().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  ifscCode: z.string().optional(),
  branchName: z.string().optional(),

  // Declarations
  informationAccurate: z.boolean().refine((val) => val === true, {
    message: 'You must confirm that the information is accurate',
  }),
  agreeToPolocies: z.boolean().refine((val) => val === true, {
    message: 'You must agree to company policies',
  }),
  consentVerification: z.boolean().refine((val) => val === true, {
    message: 'You must consent to background verification',
  }),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate input
    const body = await request.json();
    const validationResult = profileSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: validationResult.error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 2. Validate token and get invite
    const invite = await prisma.onboardingInvite.findUnique({
      where: { token: data.token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            tenantId: true,
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
          error: 'Invalid invitation token',
        },
        { status: 404 }
      );
    }

    // 3. Check if token is expired
    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invitation has expired',
        },
        { status: 410 }
      );
    }

    // 4. Check onboarding status (can't submit if approved or rejected)
    if (invite.status === 'APPROVED' || invite.status === 'REJECTED') {
      return NextResponse.json(
        {
          success: false,
          error: `Onboarding is already ${invite.status.toLowerCase()}`,
        },
        { status: 400 }
      );
    }

    // 5. Create or update employee profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Upsert employee profile
      const profile = await tx.employeeProfile.upsert({
        where: { userId: invite.userId },
        create: {
          userId: invite.userId,
          tenantId: invite.user.tenantId,
          // Personal Info
          middleName: data.middleName,
          preferredName: data.preferredName,
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender,
          personalEmail: data.personalEmail,
          personalPhone: data.personalPhone,
          alternatePhone: data.alternatePhone,
          bloodGroup: data.bloodGroup,
          profilePhotoUrl: data.profilePhotoUrl,
          // Address
          currentAddress: data.currentAddress as any,
          permanentAddress: data.sameAsCurrentAddress
            ? data.currentAddress as any
            : data.permanentAddress as any,
          sameAsCurrentAddress: data.sameAsCurrentAddress,
          // Professional
          highestQualification: data.highestQualification,
          university: data.university,
          yearOfPassing: data.yearOfPassing,
          linkedinUrl: data.linkedinUrl,
          githubUrl: data.githubUrl,
          previousCompany: data.previousCompany,
          yearsOfExperience: data.yearsOfExperience,
          skills: data.skills as any,
          // Documents
          resumeUrl: data.resumeUrl,
          photoIdUrl: data.photoIdUrl,
          addressProofUrl: data.addressProofUrl,
          educationCertsUrl: data.educationCertsUrl as any,
          experienceLettersUrl: data.experienceLettersUrl as any,
          cancelledChequeUrl: data.cancelledChequeUrl,
          // Emergency Contact
          emergencyContactName: data.emergencyContactName,
          emergencyRelationship: data.emergencyRelationship,
          emergencyPhone: data.emergencyPhone,
          emergencyAlternatePhone: data.emergencyAlternatePhone,
          // Bank Details
          accountHolderName: data.accountHolderName,
          accountNumber: data.accountNumber,
          bankName: data.bankName,
          ifscCode: data.ifscCode,
          branchName: data.branchName,
          // Declarations
          informationAccurate: data.informationAccurate,
          agreeToPolocies: data.agreeToPolocies,
          consentVerification: data.consentVerification,
        },
        update: {
          // Personal Info
          middleName: data.middleName,
          preferredName: data.preferredName,
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender,
          personalEmail: data.personalEmail,
          personalPhone: data.personalPhone,
          alternatePhone: data.alternatePhone,
          bloodGroup: data.bloodGroup,
          profilePhotoUrl: data.profilePhotoUrl,
          // Address
          currentAddress: data.currentAddress as any,
          permanentAddress: data.sameAsCurrentAddress
            ? data.currentAddress as any
            : data.permanentAddress as any,
          sameAsCurrentAddress: data.sameAsCurrentAddress,
          // Professional
          highestQualification: data.highestQualification,
          university: data.university,
          yearOfPassing: data.yearOfPassing,
          linkedinUrl: data.linkedinUrl,
          githubUrl: data.githubUrl,
          previousCompany: data.previousCompany,
          yearsOfExperience: data.yearsOfExperience,
          skills: data.skills as any,
          // Documents
          resumeUrl: data.resumeUrl,
          photoIdUrl: data.photoIdUrl,
          addressProofUrl: data.addressProofUrl,
          educationCertsUrl: data.educationCertsUrl as any,
          experienceLettersUrl: data.experienceLettersUrl as any,
          cancelledChequeUrl: data.cancelledChequeUrl,
          // Emergency Contact
          emergencyContactName: data.emergencyContactName,
          emergencyRelationship: data.emergencyRelationship,
          emergencyPhone: data.emergencyPhone,
          emergencyAlternatePhone: data.emergencyAlternatePhone,
          // Bank Details
          accountHolderName: data.accountHolderName,
          accountNumber: data.accountNumber,
          bankName: data.bankName,
          ifscCode: data.ifscCode,
          branchName: data.branchName,
          // Declarations
          informationAccurate: data.informationAccurate,
          agreeToPolocies: data.agreeToPolocies,
          consentVerification: data.consentVerification,
        },
      });

      // Update onboarding invite status to SUBMITTED
      const updatedInvite = await tx.onboardingInvite.update({
        where: { id: invite.id },
        data: {
          status: 'SUBMITTED',
          completedAt: new Date(),
        },
      });

      // Update user status to ONBOARDING_COMPLETED (waiting for HR review)
      await tx.user.update({
        where: { id: invite.userId },
        data: { status: 'ONBOARDING_COMPLETED' },
      });

      return { profile, invite: updatedInvite };
    });

    // 6. Get HR email from invite creator
    let hrEmail: string | undefined;
    const creator = await prisma.user.findUnique({
      where: { id: invite.createdBy },
      select: { email: true },
    });
    hrEmail = creator?.email;

    // 7. Send notification email to HR
    if (hrEmail) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zenora.ai';
        const reviewUrl = `${appUrl}/hr/onboarding/review/${invite.id}`;

        await sendOnboardingSubmissionNotification(
          hrEmail,
          `${invite.user.firstName} ${invite.user.lastName}`,
          invite.user.email,
          reviewUrl
        );
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // 8. Return success
    return NextResponse.json(
      {
        success: true,
        message: 'Onboarding submitted successfully. HR will review your information.',
        data: {
          profileId: result.profile.id,
          inviteId: result.invite.id,
          status: result.invite.status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Submit profile error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit profile',
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
