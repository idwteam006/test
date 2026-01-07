import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { sendEmail, getLeaveApprovedEmail } from '@/lib/resend-email';
import { format } from 'date-fns';

// POST /api/manager/leave/[id]/approve - Approve leave request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromSession(request);

    if (!user || (user.role !== 'MANAGER' && user.role !== 'HR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!leaveRequest) {
      return NextResponse.json({ success: false, error: 'Leave request not found' }, { status: 404 });
    }

    // Verify tenant
    if (leaveRequest.tenantId !== user.tenantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Verify status
    if (leaveRequest.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Leave request has already been processed' },
        { status: 400 }
      );
    }

    // If manager, verify they manage this employee
    if (user.role === 'MANAGER') {
      const manager = await prisma.employee.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (!manager || leaveRequest.employee.managerId !== manager.id) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Default leave policies (fallback)
    const DEFAULT_LEAVE_POLICIES: Record<string, number> = {
      ANNUAL: 20,
      SICK: 10,
      PERSONAL: 5,
      MATERNITY: 90,
      PATERNITY: 15,
      UNPAID: 0,
    };

    // Update leave request and deduct from balance
    const updatedRequest = await prisma.$transaction(async (tx) => {
      const leaveYear = new Date(leaveRequest.startDate).getFullYear();

      // Check if balance exists
      let balance = await tx.leaveBalance.findUnique({
        where: {
          employeeId_leaveType_year: {
            employeeId: leaveRequest.employeeId,
            leaveType: leaveRequest.leaveType,
            year: leaveYear,
          },
        },
      });

      // If no balance exists, create one from org settings
      if (!balance) {
        // Get tenant leave policies
        const tenantSettings = await tx.tenantSettings.findUnique({
          where: { tenantId: user.tenantId },
          select: { leavePolicies: true },
        });

        const orgLeavePolicies = {
          ...DEFAULT_LEAVE_POLICIES,
          ...(tenantSettings?.leavePolicies as Record<string, number> || {}),
        };

        const defaultBalance = orgLeavePolicies[leaveRequest.leaveType] ?? 0;

        // Create the balance record with org default
        balance = await tx.leaveBalance.create({
          data: {
            tenantId: user.tenantId,
            employeeId: leaveRequest.employeeId,
            leaveType: leaveRequest.leaveType,
            balance: defaultBalance,
            year: leaveYear,
          },
        });
      }

      // Validate sufficient balance
      if (balance.balance < leaveRequest.days) {
        throw new Error(
          `Insufficient leave balance. Available: ${balance.balance} days, Required: ${leaveRequest.days} days. Cannot approve this request.`
        );
      }

      // Approve the request
      const updated = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedBy: user.id,
          approvedAt: new Date(),
        },
        include: {
          employee: {
            include: {
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
      });

      // Deduct from leave balance
      await tx.leaveBalance.update({
        where: {
          employeeId_leaveType_year: {
            employeeId: leaveRequest.employeeId,
            leaveType: leaveRequest.leaveType,
            year: leaveYear,
          },
        },
        data: {
          balance: {
            decrement: leaveRequest.days,
          },
        },
      });

      return updated;
    });

    // Send email notification to employee
    try {
      const emailTemplate = getLeaveApprovedEmail({
        employeeName: `${updatedRequest.employee.user.firstName} ${updatedRequest.employee.user.lastName}`,
        leaveType: updatedRequest.leaveType,
        startDate: format(new Date(updatedRequest.startDate), 'MMM d, yyyy'),
        endDate: format(new Date(updatedRequest.endDate), 'MMM d, yyyy'),
        days: updatedRequest.days,
      });

      await sendEmail({
        to: updatedRequest.employee.user.email,
        ...emailTemplate,
      });

      console.log(`[Leave Approved] Email sent to ${updatedRequest.employee.user.email}`);
    } catch (emailError) {
      console.error('[Leave Approved] Failed to send email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ success: true, leaveRequest: updatedRequest });
  } catch (error: any) {
    console.error('Error approving leave request:', error);

    // Return the actual error message for balance issues
    const errorMessage = error?.message || 'Failed to approve leave request';
    const isBalanceError = errorMessage.includes('Insufficient leave balance');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isBalanceError ? 400 : 500 }
    );
  }
}
