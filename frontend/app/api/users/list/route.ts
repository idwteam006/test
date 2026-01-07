import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/users/list
 *
 * Get list of users for dropdowns (managers, team members, etc.)
 *
 * Query Parameters:
 * - role: Filter by role (ADMIN, MANAGER, EMPLOYEE, HR)
 * - status: Filter by status (ACTIVE, INACTIVE, SUSPENDED)
 * - department: Filter by department ID
 *
 * Security:
 * - Requires authentication
 * - Returns only users from same tenant
 * - Returns only active users by default
 */
export async function GET(request: NextRequest) {
  try {
    // Get session cookie
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    // Get session from Redis
    const sessionData = await sessions.get(sessionId);

    if (!sessionData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session expired. Please login again.',
        },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role');
    const statusFilter = searchParams.get('status') || 'ACTIVE';
    const departmentFilter = searchParams.get('department');

    // Build where clause
    const where: any = {
      tenantId: sessionData.tenantId,
    };

    if (roleFilter) {
      where.role = roleFilter;
    }

    if (statusFilter) {
      where.status = statusFilter;
    }

    if (departmentFilter) {
      where.departmentId = departmentFilter;
    }

    // Fetch users
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        employeeId: true,
        departmentId: true,
        avatarUrl: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            jobTitle: true,
            departmentId: true,
          },
        },
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    });

    console.log(`Users loaded: ${users.length} users (Role: ${roleFilter || 'all'}, Status: ${statusFilter})`);

    return NextResponse.json({
      success: true,
      users,
      count: users.length,
    });
  } catch (error) {
    console.error('Get users list error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch users',
      },
      { status: 500 }
    );
  }
}
