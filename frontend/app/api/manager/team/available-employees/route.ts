import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';

const prisma = new PrismaClient();

/**
 * GET /api/manager/team/available-employees
 * Get all active employees who don't have a manager assigned yet
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
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { tenantId, role } = user;

    // Only managers can access this endpoint
    if (role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Manager access required.' },
        { status: 403 }
      );
    }

    // Get all employees without a manager
    const availableEmployees = await prisma.employee.findMany({
      where: {
        tenantId,
        managerId: null, // No manager assigned yet
        user: {
          role: 'EMPLOYEE',
          status: 'ACTIVE',
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeId: true,
            avatarUrl: true,
            department: {
              select: {
                name: true,
              }
            }
          }
        }
      },
      orderBy: {
        user: {
          firstName: 'asc',
        }
      }
    });

    return NextResponse.json({
      success: true,
      employees: availableEmployees.map(emp => ({
        id: emp.id,
        userId: emp.user.id,
        employeeId: emp.user.employeeId,
        name: `${emp.user.firstName} ${emp.user.lastName}`,
        email: emp.user.email,
        jobTitle: emp.jobTitle,
        department: emp.user.department?.name || 'N/A',
        avatarUrl: emp.user.avatarUrl,
        hasManager: false,
      }))
    });

  } catch (error: any) {
    console.error('Error fetching available employees:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch available employees',
        details: error.message
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
