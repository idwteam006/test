import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

// GET /api/employee/leave/[id]/history - Get rejection history for a leave request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get leave request to verify ownership
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!leaveRequest) {
      return NextResponse.json(
        { success: false, error: 'Leave request not found' },
        { status: 404 }
      );
    }

    // Verify user owns this leave request or is a manager/HR/admin
    if (
      leaveRequest.employee.userId !== user.id &&
      !['MANAGER', 'HR', 'ADMIN'].includes(user.role)
    ) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Verify tenant
    if (leaveRequest.tenantId !== user.tenantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Get rejection history
    const rejectionHistory = await prisma.leaveRejectionHistory.findMany({
      where: {
        leaveRequestId: id,
        tenantId: user.tenantId,
      },
      orderBy: {
        rejectedAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, history: rejectionHistory });
  } catch (error) {
    console.error('Error fetching leave rejection history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rejection history' },
      { status: 500 }
    );
  }
}
