import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

// GET /api/admin/leave/pending - Fetch pending leave requests for direct reports (Admin view)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user || (user.role !== 'MANAGER' && user.role !== 'HR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get employee record (admin/manager)
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!employee && (user.role === 'MANAGER' || user.role === 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Employee record not found' }, { status: 404 });
    }

    // Build query based on role
    let where: any = {
      tenantId: user.tenantId,
      status: 'PENDING',
    };

    // Managers and Admins see only their direct reports' requests
    if ((user.role === 'MANAGER' || user.role === 'ADMIN') && employee) {
      where.employee = {
        managerId: employee.id,
      };
    }
    // Only HR sees all requests organization-wide

    const leaveRequests = await prisma.leaveRequest.findMany({
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
                employeeId: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get team summary
    const teamSummary = leaveRequests.reduce((acc: any[], request) => {
      const userId = request.employee.user.id;
      const existing = acc.find((item) => item.userId === userId);

      if (existing) {
        existing.pendingCount++;
        existing.totalDays += request.days;
      } else {
        acc.push({
          userId,
          name: `${request.employee.user.firstName} ${request.employee.user.lastName}`,
          employeeId: request.employee.user.employeeId,
          pendingCount: 1,
          totalDays: request.days,
        });
      }

      return acc;
    }, []);

    return NextResponse.json({
      success: true,
      leaveRequests,
      teamSummary,
    });
  } catch (error) {
    console.error('Error fetching pending leave requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending leave requests' },
      { status: 500 }
    );
  }
}
