import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

/**
 * GET /api/hr/exit
 * Get all exit requests for HR dashboard
 * Query params:
 * - status: Filter by status
 * - search: Search by employee name
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

    // Check permissions - HR, Admin, or Manager
    if (!['ADMIN', 'HR', 'MANAGER'].includes(sessionData.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get('status');
    const searchQuery = searchParams.get('search');

    const where: any = {
      tenantId: sessionData.tenantId,
    };

    if (statusFilter && statusFilter !== 'all') {
      where.status = statusFilter;
    }

    // For managers, only show their direct reports
    if (sessionData.role === 'MANAGER') {
      const managerEmployee = await prisma.employee.findFirst({
        where: {
          userId: sessionData.userId,
          tenantId: sessionData.tenantId,
        },
      });

      if (managerEmployee) {
        where.employee = {
          managerId: managerEmployee.id,
        };
      }
    }

    const exitRequests = await prisma.exitRequest.findMany({
      where,
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            department: true,
            manager: {
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
        },
        exitInterview: {
          select: {
            isCompleted: true,
          },
        },
        clearanceTasks: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { lastWorkingDate: 'asc' },
      ],
    });

    // Filter by search query
    let filteredRequests = exitRequests;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredRequests = exitRequests.filter(req => {
        const fullName = `${req.employee.user.firstName} ${req.employee.user.lastName}`.toLowerCase();
        return fullName.includes(query) || req.employee.user.email.toLowerCase().includes(query);
      });
    }

    // Add computed fields
    const enrichedRequests = filteredRequests.map(req => {
      const totalClearance = req.clearanceTasks.length;
      const completedClearance = req.clearanceTasks.filter(t => t.status === 'COMPLETED' || t.status === 'NOT_APPLICABLE').length;

      return {
        ...req,
        clearanceProgress: {
          total: totalClearance,
          completed: completedClearance,
          percentage: totalClearance > 0 ? Math.round((completedClearance / totalClearance) * 100) : 0,
        },
        daysUntilExit: Math.ceil(
          (new Date(req.lastWorkingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        ),
      };
    });

    // Get stats
    const stats = {
      pending: exitRequests.filter(r => r.status === 'PENDING_MANAGER').length,
      managerApproved: exitRequests.filter(r => r.status === 'MANAGER_APPROVED').length,
      inProgress: exitRequests.filter(r => ['HR_PROCESSING', 'CLEARANCE_PENDING'].includes(r.status)).length,
      completed: exitRequests.filter(r => r.status === 'COMPLETED').length,
      total: exitRequests.length,
    };

    return NextResponse.json({
      success: true,
      data: enrichedRequests,
      stats,
    });
  } catch (error) {
    console.error('Get exit requests error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch exit requests' },
      { status: 500 }
    );
  }
}
