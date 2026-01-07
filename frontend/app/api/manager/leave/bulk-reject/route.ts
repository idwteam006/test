import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { notifyEmployeeLeaveRejected } from '@/lib/email-notifications';
import { format } from 'date-fns';

// POST /api/manager/leave/bulk-reject - Bulk reject leave requests
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a manager, HR, or admin
    if (!['MANAGER', 'HR', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Only managers, HR, and admins can reject leave requests' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { leaveRequestIds, rejectionReason, rejectionCategory } = body;

    if (!leaveRequestIds || !Array.isArray(leaveRequestIds) || leaveRequestIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Leave request IDs are required' },
        { status: 400 }
      );
    }

    if (!rejectionReason) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Get manager's employee record
    const managerEmployee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    // Fetch all leave requests
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        id: { in: leaveRequestIds },
        tenantId: user.tenantId,
        status: 'PENDING',
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

    if (leaveRequests.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No pending leave requests found' },
        { status: 404 }
      );
    }

    // Verify authorization - managers can only reject their team's requests
    if (user.role === 'MANAGER' && managerEmployee) {
      for (const request of leaveRequests) {
        if (request.employee.managerId !== managerEmployee.id) {
          return NextResponse.json(
            { success: false, error: 'You can only reject leave requests for your team members' },
            { status: 403 }
          );
        }
      }
    }

    const results = [];
    const errors = [];

    for (const leaveRequest of leaveRequests) {
      try {
        await prisma.$transaction(async (tx) => {
          // Update leave request status
          await tx.leaveRequest.update({
            where: { id: leaveRequest.id },
            data: {
              status: 'REJECTED',
              rejectedReason: rejectionReason,
              rejectionCategory: rejectionCategory || null,
            },
          });

          // Create rejection history record
          await tx.leaveRejectionHistory.create({
            data: {
              tenantId: user.tenantId,
              leaveRequestId: leaveRequest.id,
              rejectedBy: user.id,
              rejectionReason,
              rejectionCategory: rejectionCategory || null,
            },
          });
        });

        // Send rejection email
        const employeeUser = leaveRequest.employee.user;
        const employeeName = `${employeeUser.firstName} ${employeeUser.lastName}`;
        const rejectorName = `${user.firstName} ${user.lastName}`;
        const leaveTypeDisplay = leaveRequest.leaveType
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l: string) => l.toUpperCase());

        notifyEmployeeLeaveRejected({
          employeeEmail: employeeUser.email,
          employeeName,
          leaveType: leaveTypeDisplay,
          startDate: format(leaveRequest.startDate, 'MMM d, yyyy'),
          endDate: format(leaveRequest.endDate, 'MMM d, yyyy'),
          days: leaveRequest.days,
          rejectedBy: rejectorName,
          reason: rejectionReason,
        }).catch((err) => {
          console.error('Failed to send leave rejection notification:', err);
        });

        results.push({ id: leaveRequest.id, success: true });
      } catch (error) {
        console.error(`Error rejecting leave request ${leaveRequest.id}:`, error);
        errors.push({
          id: leaveRequest.id,
          success: false,
          error: error instanceof Error ? error.message : 'Failed to reject leave request',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully rejected ${results.length} of ${leaveRequestIds.length} leave requests`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in bulk reject:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bulk reject leave requests' },
      { status: 500 }
    );
  }
}
