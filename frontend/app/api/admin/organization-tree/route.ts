import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { getCachedData, CacheKeys, CacheTTL } from '@/lib/cache';

/**
 * Build organization tree from raw employee data
 */
function buildOrganizationTree(employees: any[]) {
  // Transform data into hierarchical structure
  const employeeMap = new Map();
  const rootEmployees: any[] = [];

  // First pass: Create a map of all employees
  employees.forEach((emp) => {
    employeeMap.set(emp.id, {
      id: emp.id,
      userId: emp.user.id,
      employeeNumber: emp.employeeNumber,
      firstName: emp.user.firstName,
      lastName: emp.user.lastName,
      name: emp.user.name,
      email: emp.user.email,
      role: emp.user.role,
      jobTitle: emp.jobTitle,
      avatarUrl: emp.user.avatarUrl,
      departmentId: emp.departmentId,
      departmentName: emp.department.name,
      managerId: emp.managerId,
      employmentType: emp.employmentType,
      status: emp.status,
      startDate: emp.startDate,
      subordinatesCount: emp.subordinates.length,
      subordinates: [],
    });
  });

  // Second pass: Build the tree structure
  employeeMap.forEach((employee) => {
    if (employee.managerId) {
      const manager = employeeMap.get(employee.managerId);
      if (manager) {
        manager.subordinates.push(employee);
      } else {
        // Manager not found, treat as root
        rootEmployees.push(employee);
      }
    } else {
      // No manager, this is a root employee (CEO, executives, etc.)
      rootEmployees.push(employee);
    }
  });

  // Calculate total subordinates count recursively (direct + indirect reports)
  const calculateTotalSubordinates = (emp: any): number => {
    let total = emp.subordinates.length;
    emp.subordinates.forEach((sub: any) => {
      total += calculateTotalSubordinates(sub);
    });
    emp.totalSubordinatesCount = total;
    return total;
  };

  // Sort by hierarchy: employees with more subordinates first, then by role priority, then by name
  const rolePriority: Record<string, number> = {
    'ADMIN': 1,
    'HR': 2,
    'MANAGER': 3,
    'ACCOUNTANT': 4,
    'EMPLOYEE': 5,
  };

  const sortByHierarchy = (emps: any[]) => {
    // First calculate total subordinates for all
    emps.forEach((emp) => calculateTotalSubordinates(emp));

    // Sort: more subordinates first, then by role, then by name
    emps.sort((a, b) => {
      // First by total subordinates (descending)
      if (b.totalSubordinatesCount !== a.totalSubordinatesCount) {
        return b.totalSubordinatesCount - a.totalSubordinatesCount;
      }
      // Then by role priority
      const roleA = rolePriority[a.role] || 99;
      const roleB = rolePriority[b.role] || 99;
      if (roleA !== roleB) {
        return roleA - roleB;
      }
      // Finally by last name
      return a.lastName.localeCompare(b.lastName);
    });

    // Recursively sort subordinates
    emps.forEach((emp) => {
      if (emp.subordinates.length > 0) {
        sortByHierarchy(emp.subordinates);
      }
    });
  };

  sortByHierarchy(rootEmployees);

  // Filter to only show root employees who have subordinates (are part of a hierarchy)
  // This excludes standalone employees without any reporting relationships
  const hierarchyRoots = rootEmployees.filter((emp) => emp.subordinates.length > 0);

  // Calculate statistics
  const stats = {
    totalEmployees: employees.length,
    byDepartment: {} as Record<string, number>,
    byRole: {} as Record<string, number>,
    managersCount: employees.filter((e) => e.subordinates.length > 0).length,
    rootLevelCount: hierarchyRoots.length,
  };

  employees.forEach((emp) => {
    // Department stats
    const deptName = emp.department.name;
    stats.byDepartment[deptName] = (stats.byDepartment[deptName] || 0) + 1;

    // Role stats
    const role = emp.user.role;
    stats.byRole[role] = (stats.byRole[role] || 0) + 1;
  });

  return {
    tree: hierarchyRoots,
    flatList: Array.from(employeeMap.values()),
    stats,
  };
}

/**
 * GET /api/admin/organization-tree
 * Fetch complete organizational hierarchy with all employees and their subordinates
 * Uses Redis caching for improved performance (5 min TTL)
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

    // Verify admin/HR/manager access
    const currentUser = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: { role: true, tenantId: true },
    });

    if (!currentUser || !['ADMIN', 'HR', 'MANAGER'].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin, HR, or Manager access required.' },
        { status: 403 }
      );
    }

    const tenantId = sessionData.tenantId;

    // Use cached data if available, otherwise fetch and cache
    const data = await getCachedData(
      CacheKeys.orgChart(tenantId),
      async () => {
        // Fetch all employees with their relationships
        const employees = await prisma.employee.findMany({
          where: {
            tenantId,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
              },
            },
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            subordinates: {
              select: {
                id: true,
              },
            },
          },
          orderBy: [
            { managerId: 'asc' },
            { user: { lastName: 'asc' } },
          ],
        });

        return buildOrganizationTree(employees);
      },
      CacheTTL.ORG_CHART
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error fetching organization tree:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch organization tree',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
