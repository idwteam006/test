import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';

const prisma = new PrismaClient();

/**
 * PATCH /api/employee/team-requests/[id]
 * Accept or reject a team join request
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;

    // Authentication
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData?.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tenantId: true,
        role: true,
        employee: {
          select: {
            id: true,
          }
        }
      },
    });

    if (!user || !user.employee) {
      return NextResponse.json(
        { success: false, error: 'Employee record not found' },
        { status: 404 }
      );
    }

    const { tenantId } = user;
    const employeeId = user.employee.id;

    // Parse request body
    const body = await request.json();
    const { action } = body; // 'accept' or 'reject'

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "accept" or "reject"' },
        { status: 400 }
      );
    }

    // Get the team join request
    const joinRequest = await prisma.teamJoinRequest.findUnique({
      where: {
        id: requestId,
      },
      include: {
        manager: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        }
      }
    });

    if (!joinRequest) {
      return NextResponse.json(
        { success: false, error: 'Team join request not found' },
        { status: 404 }
      );
    }

    // Verify request belongs to this employee
    if (joinRequest.employeeId !== employeeId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. This request is not for you.' },
        { status: 403 }
      );
    }

    // Verify request is pending
    if (joinRequest.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Request already ${joinRequest.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    const newStatus = action === 'accept' ? 'ACCEPTED' : 'REJECTED';

    // Update the request status
    const updatedRequest = await prisma.teamJoinRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        respondedAt: new Date(),
      }
    });

    // If accepted, update Employee.managerId
    if (action === 'accept') {
      await prisma.employee.update({
        where: { id: employeeId },
        data: {
          managerId: joinRequest.managerId,
        }
      });

      // Create notification for manager
      await prisma.notification.create({
        data: {
          tenantId,
          userId: joinRequest.manager.user.id,
          type: 'SYSTEM_MESSAGE',
          title: 'Team Join Request Accepted',
          message: `${user.firstName} ${user.lastName} has accepted your team join request`,
          isRead: false,
        }
      });
    } else {
      // Create notification for manager (rejected)
      await prisma.notification.create({
        data: {
          tenantId,
          userId: joinRequest.manager.user.id,
          type: 'SYSTEM_MESSAGE',
          title: 'Team Join Request Rejected',
          message: `${user.firstName} ${user.lastName} has rejected your team join request`,
          isRead: false,
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Team join request ${action}ed successfully`,
      request: {
        id: updatedRequest.id,
        status: updatedRequest.status,
        respondedAt: updatedRequest.respondedAt,
      }
    });

  } catch (error: any) {
    console.error('Error responding to team join request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to respond to team join request',
        details: error.message
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * DELETE /api/employee/team-requests/[id]
 * Cancel a pending request (only manager can do this, not employee)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;

    // Authentication
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData?.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        id: true,
        tenantId: true,
        role: true,
        employee: {
          select: {
            id: true,
          }
        }
      },
    });

    if (!user || !user.employee) {
      return NextResponse.json(
        { success: false, error: 'Employee record not found' },
        { status: 404 }
      );
    }

    const managerId = user.employee.id;

    // Get the team join request
    const joinRequest = await prisma.teamJoinRequest.findUnique({
      where: {
        id: requestId,
      }
    });

    if (!joinRequest) {
      return NextResponse.json(
        { success: false, error: 'Team join request not found' },
        { status: 404 }
      );
    }

    // Only the manager who sent the request can cancel it
    if (joinRequest.managerId !== managerId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Only the manager who sent this request can cancel it.' },
        { status: 403 }
      );
    }

    // Can only cancel pending requests
    if (joinRequest.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Cannot cancel ${joinRequest.status.toLowerCase()} request` },
        { status: 400 }
      );
    }

    // Update status to CANCELLED
    await prisma.teamJoinRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
        respondedAt: new Date(),
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Team join request cancelled successfully'
    });

  } catch (error: any) {
    console.error('Error cancelling team join request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cancel team join request',
        details: error.message
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
