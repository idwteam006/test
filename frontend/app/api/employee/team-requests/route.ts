import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';

const prisma = new PrismaClient();

/**
 * GET /api/employee/team-requests
 * Get all team join requests for the logged-in employee
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
        { success: false, error: 'Employee record not found' },
        { status: 404 }
      );
    }

    const { tenantId } = user;
    const employeeId = user.employee.id;

    // Get all requests for this employee
    const requests = await prisma.teamJoinRequest.findMany({
      where: {
        tenantId,
        employeeId,
      },
      include: {
        manager: {
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
        manager: {
          id: req.manager.user.id,
          name: `${req.manager.user.firstName} ${req.manager.user.lastName}`,
          email: req.manager.user.email,
          avatarUrl: req.manager.user.avatarUrl,
          jobTitle: req.manager.jobTitle,
          department: req.manager.user.department?.name,
        }
      }))
    });

  } catch (error: any) {
    console.error('Error fetching team requests:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch team requests',
        details: error.message
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
