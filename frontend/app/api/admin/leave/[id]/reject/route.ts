import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { sendEmail, getLeaveRejectedEmail } from '@/lib/resend-email';
import { format } from 'date-fns';

// POST /api/admin/leave/[id]/reject - Reject leave request (Admin)
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
    const body = await request.json();
    const { reason, rejectionCategory } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Get leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: true,
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

    // If manager or admin, verify they manage this employee (only HR can reject anyone's leave)
    if (user.role === 'MANAGER' || user.role === 'ADMIN') {
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (!employee || leaveRequest.employee.managerId !== employee.id) {
        return NextResponse.json(
          { success: false, error: 'You can only reject leave requests for your direct reports' },
          { status: 403 }
        );
      }
    }

    // Update leave request and create rejection history using transaction
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // Update leave request
      const updated = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedReason: reason,
          rejectionCategory: rejectionCategory || null,
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

      // Create rejection history record
      await tx.leaveRejectionHistory.create({
        data: {
          tenantId: user.tenantId,
          leaveRequestId: id,
          rejectedBy: user.id,
          rejectionReason: reason,
          rejectionCategory: rejectionCategory || null,
        },
      });

      return updated;
    });

    // Send email notification to employee
    try {
      const emailTemplate = getLeaveRejectedEmail({
        employeeName: `${updatedRequest.employee.user.firstName} ${updatedRequest.employee.user.lastName}`,
        leaveType: updatedRequest.leaveType,
        startDate: format(new Date(updatedRequest.startDate), 'MMM d, yyyy'),
        endDate: format(new Date(updatedRequest.endDate), 'MMM d, yyyy'),
        days: updatedRequest.days,
        reason,
      });

      await sendEmail({
        to: updatedRequest.employee.user.email,
        ...emailTemplate,
      });

      console.log(`[Leave Rejected] Email sent to ${updatedRequest.employee.user.email}`);
    } catch (emailError) {
      console.error('[Leave Rejected] Failed to send email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ success: true, leaveRequest: updatedRequest });
  } catch (error) {
    console.error('Error rejecting leave request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reject leave request' },
      { status: 500 }
    );
  }
}
