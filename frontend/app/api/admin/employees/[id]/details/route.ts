import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

/**
 * GET /api/admin/employees/[id]/details
 *
 * Get full employee details including profile information
 *
 * Security:
 * - Only ADMIN, MANAGER, HR can view employee details
 * - Can only view employees in their own tenant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    // Check if user has admin/manager/HR permissions
    if (!['ADMIN', 'MANAGER', 'HR'].includes(sessionData.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // 2. Get user ID from params
    const { id: userId } = await params;

    // 3. Fetch user with full details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        employeeId: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        tenantId: true,
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
          }
        },
        employeeProfile: {
          select: {
            personalEmail: true,
            personalPhone: true,
            alternatePhone: true,
            dateOfBirth: true,
            gender: true,
            bloodGroup: true,
            currentAddress: true,
            permanentAddress: true,
            emergencyContactName: true,
            emergencyRelationship: true,
            emergencyPhone: true,
            highestQualification: true,
            university: true,
            yearOfPassing: true,
            yearsOfExperience: true,
            skills: true,
            accountHolderName: true,
            accountNumber: true,
            bankName: true,
            ifscCode: true,
            branchName: true,
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check tenant match
    if (user.tenantId !== sessionData.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Employee not found or does not belong to your organization' },
        { status: 403 }
      );
    }

    // 4. Format response
    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        role: user.role,
        status: user.status,
        employeeNumber: user.employee?.employeeNumber || user.employeeId || 'N/A',
        jobTitle: user.employee?.jobTitle,
        department: user.department?.name,
        departmentId: user.department?.id,
        startDate: user.employee?.startDate,
        employmentType: user.employee?.employmentType,
        employeeStatus: user.employee?.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        profile: user.employeeProfile,
      }
    });

  } catch (error) {
    console.error('Get employee details error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get employee details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
