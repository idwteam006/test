import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';

const prisma = new PrismaClient();

/**
 * POST /api/manager/team/join-request
 * Manager sends a request to an employee to join their team
 */
export async function POST(request: NextRequest) {
  try {
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
        departmentId: true,
        firstName: true,
        lastName: true,
        employee: {
          select: {
            id: true,
          }
        }
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { tenantId, role, departmentId } = user;

    // Only managers can send team join requests
    if (role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Manager access required.' },
        { status: 403 }
      );
    }

    if (!user.employee) {
      return NextResponse.json(
        { success: false, error: 'Manager employee record not found' },
        { status: 404 }
      );
    }

    const managerId = user.employee.id;

    // Parse request body
    const body = await request.json();
    const { employeeId, message } = body;

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Check if employee exists and is in the same tenant
    const targetEmployee = await prisma.employee.findUnique({
      where: {
        id: employeeId,
        tenantId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            status: true,
          }
        }
      }
    });

    if (!targetEmployee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found in your organization' },
        { status: 404 }
      );
    }

    // Check if employee is ACTIVE and has EMPLOYEE role
    if (targetEmployee.user.role !== 'EMPLOYEE') {
      return NextResponse.json(
        { success: false, error: 'Can only send requests to employees (not managers/admins)' },
        { status: 400 }
      );
    }

    if (targetEmployee.user.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Employee is not active' },
        { status: 400 }
      );
    }

    // Check if employee already has a manager
    if (targetEmployee.managerId) {
      return NextResponse.json(
        { success: false, error: 'Employee already has a manager assigned' },
        { status: 400 }
      );
    }

    // Check if a pending request already exists
    const existingRequest = await prisma.teamJoinRequest.findUnique({
      where: {
        employeeId_managerId: {
          employeeId,
          managerId,
        }
      }
    });

    if (existingRequest) {
      if (existingRequest.status === 'PENDING') {
        return NextResponse.json(
          { success: false, error: 'A pending request already exists for this employee' },
          { status: 400 }
        );
      }

      // If previous request was rejected/cancelled, allow creating new one
      if (existingRequest.status === 'REJECTED' || existingRequest.status === 'CANCELLED') {
        // Delete old request and create new one
        await prisma.teamJoinRequest.delete({
          where: { id: existingRequest.id }
        });
      }
    }

    // Create team join request
    const joinRequest = await prisma.teamJoinRequest.create({
      data: {
        tenantId,
        employeeId,
        managerId,
        message: message || null,
        status: 'PENDING',
      },
      include: {
        employee: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          }
        }
      }
    });

    // Create notification for employee
    await prisma.notification.create({
      data: {
        tenantId,
        userId: targetEmployee.user.id,
        type: 'SYSTEM_MESSAGE',
        title: 'Team Join Request',
        message: `${user.firstName} ${user.lastName} has invited you to join their team`,
        isRead: false,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Team join request sent successfully',
      request: {
        id: joinRequest.id,
        employeeName: `${joinRequest.employee.user.firstName} ${joinRequest.employee.user.lastName}`,
        status: joinRequest.status,
        createdAt: joinRequest.createdAt,
      }
    });

  } catch (error: any) {
    console.error('Error creating team join request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send team join request',
        details: error.message
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * GET /api/manager/team/join-request
 * Get all team join requests sent by this manager
 */
export async function GET(request: NextRequest) {
  try {
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
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { tenantId, role } = user;
    const managerId = user.employee.id;

    // Only managers can view their requests
    if (role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Manager access required.' },
        { status: 403 }
      );
    }

    // Get all requests sent by this manager
    const requests = await prisma.teamJoinRequest.findMany({
      where: {
        tenantId,
        managerId,
      },
      include: {
        employee: {
          select: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                department: {
                  select: {
                    name: true,
                  }
                }
              }
            },
            jobTitle: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    return NextResponse.json({
      success: true,
      requests: requests.map(req => ({
        id: req.id,
        status: req.status,
        message: req.message,
        createdAt: req.createdAt,
        respondedAt: req.respondedAt,
        employee: {
          id: req.employee.user.id,
          name: `${req.employee.user.firstName} ${req.employee.user.lastName}`,
          email: req.employee.user.email,
          avatarUrl: req.employee.user.avatarUrl,
          jobTitle: req.employee.jobTitle,
          department: req.employee.user.department?.name,
        }
      }))
    });

  } catch (error: any) {
    console.error('Error fetching team join requests:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch team join requests',
        details: error.message
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
