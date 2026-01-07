import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { getCachedData, CacheKeys, CacheTTL } from '@/lib/cache';

/**
 * Transform raw user data to API response format
 */
function transformUserData(users: any[]) {
  return users.map(user => ({
    id: user.id,
    userId: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    employeeNumber: user.employee?.employeeNumber || user.employeeId || 'N/A',
    employeeId: user.employee?.id, // Employee table ID
    jobTitle: user.employee?.jobTitle || 'N/A',
    department: user.department?.name || 'N/A',
    departmentId: user.department?.id || user.employee?.departmentId,
    managerId: user.employee?.managerId,
    manager: user.employee?.manager
      ? {
          id: user.employee.manager.id,
          name: `${user.employee.manager.user.firstName} ${user.employee.manager.user.lastName}`,
          email: user.employee.manager.user.email,
        }
      : null,
    startDate: user.employee?.startDate,
    employmentType: user.employee?.employmentType,
    employeeStatus: user.employee?.status,
    hasProfile: !!user.employeeProfile,
    hasEmployeeRecord: !!user.employee,
  }));
}

/**
 * GET /api/admin/employees
 * Fetch employees/users with optional role filtering
 * Uses Redis caching for manager list (5 min TTL for ADMIN,MANAGER,HR roles)
 * Query params:
 * - role: Comma-separated list of roles (e.g., "MANAGER,ADMIN")
 * - status: Filter by status (ACTIVE, PENDING, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    // Get session
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

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const roleParam = searchParams.get('role');
    const statusParam = searchParams.get('status');

    const tenantId = sessionData.tenantId;

    // For manager/admin role queries, use caching (common dropdown pattern)
    const isManagerQuery = roleParam && ['ADMIN,MANAGER,HR', 'MANAGER,ADMIN', 'ADMIN', 'MANAGER'].includes(roleParam);

    const fetchUsers = async () => {
      // Build where clause
      const where: any = {
        tenantId,
      };

      // Add role filter if provided
      if (roleParam) {
        const roles = roleParam.split(',').map(r => r.trim());
        where.role = { in: roles };
      }

      // Add status filter if provided
      if (statusParam) {
        where.status = statusParam;
      }

      // Fetch users
      return prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          name: true,
          employeeId: true,
          role: true,
          status: true,
          lastLoginAt: true,
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
              startDate: true,
              employmentType: true,
              status: true,
              managerId: true,
              departmentId: true,
              manager: {
                select: {
                  id: true,
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
            }
          },
          employeeProfile: {
            select: {
              id: true,
              personalEmail: true,
              personalPhone: true,
            }
          }
        },
        orderBy: {
          firstName: 'asc',
        },
      });
    };

    let users;

    if (isManagerQuery && !statusParam) {
      // Cache manager list queries (frequently used for dropdowns)
      users = await getCachedData(
        CacheKeys.managers(tenantId, roleParam || undefined),
        fetchUsers,
        CacheTTL.MANAGERS
      );
    } else {
      // Don't cache filtered queries or status-specific queries
      users = await fetchUsers();
    }

    const data = transformUserData(users);

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
    });
  } catch (error) {
    console.error('Fetch employees error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch employees',
      },
      { status: 500 }
    );
  }
}
