import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { notifyEmployeeLeaveApproved } from '@/lib/email-notifications';
import { format } from 'date-fns';

// POST /api/manager/leave/bulk-approve - Bulk approve leave requests
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a manager, HR, or admin
    if (!['MANAGER', 'HR', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Only managers, HR, and admins can approve leave requests' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { leaveRequestIds } = body;

    if (!leaveRequestIds || !Array.isArray(leaveRequestIds) || leaveRequestIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Leave request IDs are required' },
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

    // Verify authorization - managers can only approve their team's requests
    if (user.role === 'MANAGER' && managerEmployee) {
      for (const request of leaveRequests) {
        if (request.employee.managerId !== managerEmployee.id) {
          return NextResponse.json(
            { success: false, error: 'You can only approve leave requests for your team members' },
            { status: 403 }
          );
        }
      }
    }

    const results = [];
    const errors = [];

    for (const leaveRequest of leaveRequests) {
      try {
        // Use transaction to ensure balance is deducted atomically with approval
        const leaveYear = new Date(leaveRequest.startDate).getFullYear();

        await prisma.$transaction(async (tx) => {
          // Approve the leave request
          await tx.leaveRequest.update({
            where: { id: leaveRequest.id },
            data: {
              status: 'APPROVED',
              approvedBy: user.id,
              approvedAt: new Date(),
            },
          });

          // Deduct from leave balance - upsert to handle missing balances
          await tx.leaveBalance.upsert({
            where: {
              employeeId_leaveType_year: {
                employeeId: leaveRequest.employeeId,
                leaveType: leaveRequest.leaveType,
                year: leaveYear,
              },
            },
            create: {
              employeeId: leaveRequest.employeeId,
              leaveType: leaveRequest.leaveType,
              year: leaveYear,
              balance: -leaveRequest.days, // Negative balance if not initialized
              tenantId: leaveRequest.tenantId,
            },
            update: {
              balance: {
                decrement: leaveRequest.days,
              },
            },
          });
        });

        // Send approval email
        const employeeUser = leaveRequest.employee.user;
        const employeeName = `${employeeUser.firstName} ${employeeUser.lastName}`;
        const approverName = `${user.firstName} ${user.lastName}`;
        const leaveTypeDisplay = leaveRequest.leaveType
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l: string) => l.toUpperCase());

        notifyEmployeeLeaveApproved({
          employeeEmail: employeeUser.email,
          employeeName,
          leaveType: leaveTypeDisplay,
          startDate: format(leaveRequest.startDate, 'MMM d, yyyy'),
          endDate: format(leaveRequest.endDate, 'MMM d, yyyy'),
          days: leaveRequest.days,
          approvedBy: approverName,
        }).catch((err) => {
          console.error('Failed to send leave approval notification:', err);
        });

        results.push({ id: leaveRequest.id, success: true });
      } catch (error) {
        console.error(`Error approving leave request ${leaveRequest.id}:`, error);
        errors.push({
          id: leaveRequest.id,
          success: false,
          error: error instanceof Error ? error.message : 'Failed to approve leave request',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully approved ${results.length} of ${leaveRequestIds.length} leave requests`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in bulk approve:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bulk approve leave requests' },
      { status: 500 }
    );
  }
}
