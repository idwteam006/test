import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { z } from 'zod';

const updateExitRequestSchema = z.object({
  action: z.enum([
    'MANAGER_APPROVE',
    'MANAGER_REJECT',
    'HR_PROCESS',
    'START_CLEARANCE',
    'COMPLETE_CLEARANCE',
    'COMPLETE_EXIT',
  ]),
  remarks: z.string().optional(),
  lastWorkingDate: z.string().optional(),
  finalSettlementAmount: z.number().optional(),
  noticePeriodWaived: z.boolean().optional(),
  waiverReason: z.string().optional(),
});

/**
 * GET /api/hr/exit/[id]
 * Get detailed exit request information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    if (!['ADMIN', 'HR', 'MANAGER'].includes(sessionData.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const exitRequest = await prisma.exitRequest.findFirst({
      where: {
        id,
        tenantId: sessionData.tenantId,
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
            department: true,
            manager: {
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
        },
        exitInterview: true,
        clearanceTasks: {
          orderBy: {
            department: 'asc',
          },
        },
        knowledgeTransfers: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!exitRequest) {
      return NextResponse.json(
        { success: false, error: 'Exit request not found' },
        { status: 404 }
      );
    }

    // For managers, verify they're the manager of this employee
    if (sessionData.role === 'MANAGER') {
      const managerEmployee = await prisma.employee.findFirst({
        where: {
          userId: sessionData.userId,
          tenantId: sessionData.tenantId,
        },
      });

      if (!managerEmployee || exitRequest.employee.managerId !== managerEmployee.id) {
        return NextResponse.json(
          { success: false, error: 'You can only view exit requests for your direct reports' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: exitRequest,
    });
  } catch (error) {
    console.error('Get exit request error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch exit request' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/hr/exit/[id]
 * Update exit request (approve, reject, process, etc.)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    if (!['ADMIN', 'HR', 'MANAGER'].includes(sessionData.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = updateExitRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { action, remarks, lastWorkingDate, finalSettlementAmount, noticePeriodWaived, waiverReason } = validation.data;

    const exitRequest = await prisma.exitRequest.findFirst({
      where: {
        id,
        tenantId: sessionData.tenantId,
      },
      include: {
        employee: {
          include: {
            manager: true,
          },
        },
      },
    });

    if (!exitRequest) {
      return NextResponse.json(
        { success: false, error: 'Exit request not found' },
        { status: 404 }
      );
    }

    // Get manager employee record if role is manager
    let managerEmployee = null;
    if (sessionData.role === 'MANAGER') {
      managerEmployee = await prisma.employee.findFirst({
        where: {
          userId: sessionData.userId,
          tenantId: sessionData.tenantId,
        },
      });
    }

    let updateData: any = {};
    let newStatus: string | null = null;

    switch (action) {
      case 'MANAGER_APPROVE':
        // Verify manager is authorized
        if (sessionData.role === 'MANAGER') {
          if (!managerEmployee || exitRequest.employee.managerId !== managerEmployee.id) {
            return NextResponse.json(
              { success: false, error: 'You can only approve requests for your direct reports' },
              { status: 403 }
            );
          }
        }
        if (exitRequest.status !== 'PENDING_MANAGER') {
          return NextResponse.json(
            { success: false, error: 'This request is not pending manager approval' },
            { status: 400 }
          );
        }
        newStatus = 'MANAGER_APPROVED';
        updateData = {
          status: newStatus,
          managerApprovedAt: new Date(),
          managerApprovedBy: sessionData.userId,
          remarks: remarks || exitRequest.remarks,
        };
        if (lastWorkingDate) {
          updateData.lastWorkingDate = new Date(lastWorkingDate);
        }
        break;

      case 'MANAGER_REJECT':
        if (sessionData.role === 'MANAGER') {
          if (!managerEmployee || exitRequest.employee.managerId !== managerEmployee.id) {
            return NextResponse.json(
              { success: false, error: 'You can only reject requests for your direct reports' },
              { status: 403 }
            );
          }
        }
        if (exitRequest.status !== 'PENDING_MANAGER') {
          return NextResponse.json(
            { success: false, error: 'This request is not pending manager approval' },
            { status: 400 }
          );
        }
        if (!remarks) {
          return NextResponse.json(
            { success: false, error: 'Please provide a reason for rejection' },
            { status: 400 }
          );
        }
        newStatus = 'MANAGER_REJECTED';
        updateData = {
          status: newStatus,
          remarks,
        };
        break;

      case 'HR_PROCESS':
        if (!['ADMIN', 'HR'].includes(sessionData.role)) {
          return NextResponse.json(
            { success: false, error: 'Only HR can process exit requests' },
            { status: 403 }
          );
        }
        if (exitRequest.status !== 'MANAGER_APPROVED') {
          return NextResponse.json(
            { success: false, error: 'This request needs manager approval first' },
            { status: 400 }
          );
        }
        newStatus = 'HR_PROCESSING';
        updateData = {
          status: newStatus,
          hrProcessedAt: new Date(),
          hrProcessedBy: sessionData.userId,
          remarks: remarks || exitRequest.remarks,
        };
        if (noticePeriodWaived !== undefined) {
          updateData.noticePeriodWaived = noticePeriodWaived;
          updateData.waiverReason = waiverReason;
        }
        if (lastWorkingDate) {
          updateData.lastWorkingDate = new Date(lastWorkingDate);
        }
        break;

      case 'START_CLEARANCE':
        if (!['ADMIN', 'HR'].includes(sessionData.role)) {
          return NextResponse.json(
            { success: false, error: 'Only HR can start clearance process' },
            { status: 403 }
          );
        }
        if (exitRequest.status !== 'HR_PROCESSING') {
          return NextResponse.json(
            { success: false, error: 'Request must be in HR processing stage' },
            { status: 400 }
          );
        }
        newStatus = 'CLEARANCE_PENDING';
        updateData = {
          status: newStatus,
        };
        break;

      case 'COMPLETE_CLEARANCE':
        if (!['ADMIN', 'HR'].includes(sessionData.role)) {
          return NextResponse.json(
            { success: false, error: 'Only HR can complete clearance' },
            { status: 403 }
          );
        }
        // Check if all clearance tasks are completed
        const pendingTasks = await prisma.clearanceTask.count({
          where: {
            exitRequestId: id,
            status: {
              in: ['PENDING', 'IN_PROGRESS'],
            },
          },
        });
        if (pendingTasks > 0) {
          return NextResponse.json(
            { success: false, error: `${pendingTasks} clearance tasks are still pending` },
            { status: 400 }
          );
        }
        newStatus = 'CLEARANCE_COMPLETED';
        updateData = {
          status: newStatus,
        };
        break;

      case 'COMPLETE_EXIT':
        if (!['ADMIN', 'HR'].includes(sessionData.role)) {
          return NextResponse.json(
            { success: false, error: 'Only HR can complete exit' },
            { status: 403 }
          );
        }
        if (exitRequest.status !== 'CLEARANCE_COMPLETED') {
          return NextResponse.json(
            { success: false, error: 'Clearance must be completed first' },
            { status: 400 }
          );
        }
        newStatus = 'COMPLETED';
        updateData = {
          status: newStatus,
          finalSettlementAmount: finalSettlementAmount || exitRequest.finalSettlementAmount,
        };

        // Update employee status to TERMINATED
        await prisma.employee.update({
          where: { id: exitRequest.employeeId },
          data: { status: 'TERMINATED' },
        });

        // Update user status to RESIGNED
        await prisma.user.update({
          where: { id: exitRequest.employee.userId },
          data: { status: 'RESIGNED' },
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    const updatedRequest = await prisma.exitRequest.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: `Exit request ${action.toLowerCase().replace('_', ' ')} successfully`,
    });
  } catch (error) {
    console.error('Update exit request error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update exit request' },
      { status: 500 }
    );
  }
}
