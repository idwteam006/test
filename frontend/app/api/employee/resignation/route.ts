import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { z } from 'zod';

const createResignationSchema = z.object({
  reason: z.string().min(10, 'Please provide a detailed reason'),
  reasonCategory: z.enum([
    'BETTER_OPPORTUNITY',
    'HIGHER_EDUCATION',
    'RELOCATION',
    'PERSONAL_REASONS',
    'HEALTH_ISSUES',
    'CAREER_CHANGE',
    'COMPENSATION',
    'WORK_ENVIRONMENT',
    'MANAGEMENT_ISSUES',
    'RETIREMENT',
    'OTHER',
  ]),
  lastWorkingDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  personalEmail: z.string().email().optional(),
  personalPhone: z.string().optional(),
});

/**
 * GET /api/employee/resignation
 * Get the current employee's resignation request status
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get employee record
    const employee = await prisma.employee.findFirst({
      where: {
        userId: sessionData.userId,
        tenantId: sessionData.tenantId,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee record not found' },
        { status: 404 }
      );
    }

    // Get active exit request (not withdrawn or completed)
    const exitRequest = await prisma.exitRequest.findFirst({
      where: {
        employeeId: employee.id,
        tenantId: sessionData.tenantId,
        status: {
          notIn: ['COMPLETED', 'WITHDRAWN'],
        },
      },
      include: {
        exitInterview: true,
        clearanceTasks: {
          orderBy: {
            department: 'asc',
          },
        },
        knowledgeTransfers: true,
      },
    });

    // Get notice period from settings (default 30 days)
    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId: sessionData.tenantId },
    });

    return NextResponse.json({
      success: true,
      data: {
        exitRequest,
        noticePeriodDays: 30, // Default, can be made configurable
        employee: {
          id: employee.id,
          startDate: employee.startDate,
          employmentType: employee.employmentType,
        },
      },
    });
  } catch (error) {
    console.error('Get resignation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch resignation status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/employee/resignation
 * Submit a new resignation request
 */
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const validation = createResignationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Get employee record
    const employee = await prisma.employee.findFirst({
      where: {
        userId: sessionData.userId,
        tenantId: sessionData.tenantId,
      },
      include: {
        manager: {
          include: {
            user: true,
          },
        },
        user: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee record not found' },
        { status: 404 }
      );
    }

    // Check for existing active resignation
    const existingRequest = await prisma.exitRequest.findFirst({
      where: {
        employeeId: employee.id,
        status: {
          notIn: ['COMPLETED', 'WITHDRAWN', 'MANAGER_REJECTED'],
        },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { success: false, error: 'You already have an active resignation request' },
        { status: 409 }
      );
    }

    const { reason, reasonCategory, lastWorkingDate, personalEmail, personalPhone } = validation.data;
    const proposedLastDate = new Date(lastWorkingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate notice period
    const noticePeriodDays = Math.ceil(
      (proposedLastDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Default notice period is 30 days
    const requiredNoticePeriod = 30;
    const noticePeriodWaived = noticePeriodDays < requiredNoticePeriod;

    // Create exit request
    const exitRequest = await prisma.exitRequest.create({
      data: {
        tenantId: sessionData.tenantId,
        employeeId: employee.id,
        resignationDate: today,
        lastWorkingDate: proposedLastDate,
        reason,
        reasonCategory,
        personalEmail: personalEmail || null,
        personalPhone: personalPhone || null,
        noticePeriodDays,
        noticePeriodWaived,
        status: 'PENDING_MANAGER',
      },
    });

    // Create default clearance tasks
    const clearanceTasks = [
      { department: 'IT', taskName: 'Return laptop and IT equipment', description: 'Return all IT assets including laptop, charger, and accessories' },
      { department: 'IT', taskName: 'Revoke system access', description: 'Disable email, VPN, and all system access' },
      { department: 'FINANCE', taskName: 'Clear pending advances', description: 'Settle any pending advances or reimbursements' },
      { department: 'FINANCE', taskName: 'Final settlement calculation', description: 'Calculate final settlement including leave encashment' },
      { department: 'HR', taskName: 'Return ID card', description: 'Return employee ID card and badges' },
      { department: 'HR', taskName: 'Exit interview', description: 'Complete exit interview with HR' },
      { department: 'HR', taskName: 'Document handover', description: 'Collect experience letter and relieving letter' },
      { department: 'ADMIN', taskName: 'Return access cards', description: 'Return building access cards and parking permits' },
      { department: 'MANAGER', taskName: 'Work handover', description: 'Complete handover of pending work and projects' },
      { department: 'MANAGER', taskName: 'Knowledge transfer', description: 'Document and transfer critical knowledge' },
    ];

    await prisma.clearanceTask.createMany({
      data: clearanceTasks.map(task => ({
        tenantId: sessionData.tenantId,
        exitRequestId: exitRequest.id,
        department: task.department as any,
        taskName: task.taskName,
        description: task.description,
        status: 'PENDING',
      })),
    });

    // Create empty exit interview record
    await prisma.exitInterview.create({
      data: {
        tenantId: sessionData.tenantId,
        exitRequestId: exitRequest.id,
      },
    });

    // TODO: Send email notification to manager
    // if (employee.manager) {
    //   await sendResignationNotification(employee.manager.user.email, employee, exitRequest);
    // }

    return NextResponse.json({
      success: true,
      data: exitRequest,
      message: 'Resignation submitted successfully. Your manager will be notified.',
    });
  } catch (error) {
    console.error('Submit resignation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit resignation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/employee/resignation
 * Withdraw resignation request (only if still pending)
 */
export async function DELETE(request: NextRequest) {
  try {
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

    // Get employee record
    const employee = await prisma.employee.findFirst({
      where: {
        userId: sessionData.userId,
        tenantId: sessionData.tenantId,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee record not found' },
        { status: 404 }
      );
    }

    // Get active exit request
    const exitRequest = await prisma.exitRequest.findFirst({
      where: {
        employeeId: employee.id,
        status: {
          in: ['PENDING_MANAGER', 'MANAGER_APPROVED'],
        },
      },
    });

    if (!exitRequest) {
      return NextResponse.json(
        { success: false, error: 'No active resignation request found or withdrawal not allowed at this stage' },
        { status: 404 }
      );
    }

    // Update status to withdrawn
    await prisma.exitRequest.update({
      where: { id: exitRequest.id },
      data: { status: 'WITHDRAWN' },
    });

    return NextResponse.json({
      success: true,
      message: 'Resignation request withdrawn successfully',
    });
  } catch (error) {
    console.error('Withdraw resignation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to withdraw resignation' },
      { status: 500 }
    );
  }
}
