import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { notifyManagerLeaveCancelled } from '@/lib/email-notifications';
import { format } from 'date-fns';

// DELETE /api/employee/leave/[id] - Cancel leave request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get employee record with manager info
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        manager: {
          select: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee record not found' }, { status: 404 });
    }

    // Get leave request with employee info
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!leaveRequest) {
      return NextResponse.json({ success: false, error: 'Leave request not found' }, { status: 404 });
    }

    // Verify ownership
    if (leaveRequest.employeeId !== employee.id || leaveRequest.tenantId !== user.tenantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Only allow canceling pending requests
    if (leaveRequest.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Can only cancel pending leave requests' },
        { status: 400 }
      );
    }

    // Delete the request
    await prisma.leaveRequest.delete({
      where: { id },
    });

    // Notify manager if employee has one
    if (employee.manager?.user?.email) {
      const managerUser = employee.manager.user;
      const employeeUser = leaveRequest.employee.user;
      const employeeName = `${employeeUser.firstName} ${employeeUser.lastName}`;
      const managerName = `${managerUser.firstName} ${managerUser.lastName}`;

      // Format leave type for display
      const leaveTypeDisplay = leaveRequest.leaveType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

      notifyManagerLeaveCancelled({
        managerEmail: managerUser.email,
        managerName,
        employeeName,
        leaveType: leaveTypeDisplay,
        startDate: format(leaveRequest.startDate, 'MMM d, yyyy'),
        endDate: format(leaveRequest.endDate, 'MMM d, yyyy'),
        days: leaveRequest.days,
        reason: leaveRequest.reason || undefined,
      }).catch((err) => {
        console.error('Failed to send leave cancellation notification:', err);
      });
    }

    return NextResponse.json({ success: true, message: 'Leave request cancelled' });
  } catch (error) {
    console.error('Error canceling leave request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel leave request' },
      { status: 500 }
    );
  }
}
