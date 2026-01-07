import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

/**
 * GET /api/employee/documents
 *
 * Get list of available document types and any previously generated/requested documents
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get employee details
    const employee = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      include: {
        employee: true,
        department: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Available document types
    const documentTypes = [
      {
        id: 'employment_verification',
        name: 'Employment Verification Letter',
        description: 'Official letter verifying your current employment status',
        available: true,
      },
      {
        id: 'salary_certificate',
        name: 'Salary Certificate',
        description: 'Certificate showing your current salary details',
        available: !!employee.employee,
      },
      {
        id: 'experience_letter',
        name: 'Experience Letter',
        description: 'Letter detailing your work experience (for separation)',
        available: false, // Only available during exit
      },
      {
        id: 'relieving_letter',
        name: 'Relieving Letter',
        description: 'Official relieving letter after resignation',
        available: false, // Only available during exit
      },
      {
        id: 'bonafide_certificate',
        name: 'Bonafide Employee Certificate',
        description: 'Certificate confirming you are a bonafide employee',
        available: !!employee.employee,
      },
      {
        id: 'address_proof',
        name: 'Address Proof Letter',
        description: 'Letter for address verification purposes',
        available: !!employee.employee,
      },
    ];

    // Get payroll records for salary slip access
    const payrollRecords = await prisma.payrollRecord.findMany({
      where: {
        tenantId: sessionData.tenantId,
        employee: {
          userId: sessionData.userId,
        },
      },
      orderBy: {
        period: 'desc',
      },
      take: 12, // Last 12 pay periods
      select: {
        id: true,
        period: true,
        baseSalary: true,
        bonuses: true,
        deductions: true,
        netPay: true,
        processedAt: true,
        paidAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        documentTypes,
        payslips: payrollRecords.map(p => ({
          id: p.id,
          period: p.period,
          netPay: p.netPay,
          processedAt: p.processedAt,
          paidAt: p.paidAt,
        })),
        employee: {
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          employeeNumber: employee.employee?.employeeNumber,
          jobTitle: employee.employee?.jobTitle,
          department: employee.department?.name,
          startDate: employee.employee?.startDate,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
