/**
 * GET /api/admin/team
 * Get all team members for the admin (direct reports only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
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
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        id: true,
        tenantId: true,
        role: true,
        departmentId: true,
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

    const { tenantId, role } = user;

    // Only admins can access via this endpoint
    if (role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Get admin's employee record
    const adminEmployeeId = user.employee?.id;

    // Build where clause - fetch employees who report to this admin
    const employeeWhereClause: any = {
      tenantId,
      status: { in: ['ACTIVE', 'INACTIVE'] }, // Exclude terminated
    };

    // Get direct reports only
    if (adminEmployeeId) {
      employeeWhereClause.managerId = adminEmployeeId;
    } else {
      // No employee record found, return empty
      employeeWhereClause.id = { in: [] };
    }

    // Fetch employees (from Employee table, not User table)
    const employeeRecords = await prisma.employee.findMany({
      where: employeeWhereClause,
      select: {
        id: true,
        employeeNumber: true,
        jobTitle: true,
        startDate: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeId: true,
            role: true,
            status: true,
            departmentId: true,
            avatarUrl: true,
            department: {
              select: {
                name: true,
              },
            },
          }
        }
      },
      orderBy: {
        user: {
          firstName: 'asc',
        }
      },
    });

    // Map to user format for backward compatibility
    // Filter out: current user and other admins
    // Include EMPLOYEE, MANAGER, HR, and ACCOUNTANT roles (all direct reports)
    const members = employeeRecords
      .filter(emp =>
        emp.user.id !== user.id && // Exclude current user
        ['EMPLOYEE', 'MANAGER', 'HR', 'ACCOUNTANT'].includes(emp.user.role) // Include all direct report roles
      )
      .map(emp => ({
        id: emp.user.id,
        firstName: emp.user.firstName,
        lastName: emp.user.lastName,
        email: emp.user.email,
        employeeId: emp.user.employeeId,
        role: emp.user.role,
        status: emp.user.status,
        departmentId: emp.user.departmentId,
        avatarUrl: emp.user.avatarUrl,
        department: emp.user.department,
        employee: {
          id: emp.id, // Add the Employee table ID for meetings
          jobTitle: emp.jobTitle,
          startDate: emp.startDate,
        },
        employeeProfile: null, // Can add if needed
      }));

    // Calculate stats
    const totalMembers = members.length;
    const activeMembers = members.filter((m) => m.status === 'ACTIVE').length;

    // Get today's leave count (would need LeaveRequest model)
    const onLeaveToday = 0; // Placeholder - implement when LeaveRequest is integrated

    // Get pending tasks count (would need Task model integration)
    const pendingTasks = 0; // Placeholder

    // Department breakdown
    const deptMap = new Map<string, number>();
    members.forEach((m) => {
      if (m.department) {
        deptMap.set(m.department.name, (deptMap.get(m.department.name) || 0) + 1);
      }
    });

    const departments = Array.from(deptMap.entries()).map(([name, count]) => ({
      name,
      count,
    }));

    return NextResponse.json({
      success: true,
      members,
      stats: {
        totalMembers,
        activeMembers,
        onLeaveToday,
        pendingTasks,
        departments,
      },
    });
  } catch (error) {
    console.error('[GET /api/admin/team] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch team data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
