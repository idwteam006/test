/**
 * GET /api/manager/goals - Get goals from direct reports
 * Returns goals for all employees that report to the current manager/admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Only managers and admins can access this endpoint
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Manager or Admin access required.' },
        { status: 403 }
      );
    }

    // Get current user's employee record
    const currentUserEmployee = await prisma.employee.findFirst({
      where: {
        userId: user.id,
        tenantId: user.tenantId,
      },
      select: { id: true, managerId: true },
    });

    if (!currentUserEmployee) {
      return NextResponse.json(
        { success: false, error: 'Employee record not found' },
        { status: 400 }
      );
    }

    // Get direct reports
    const directReports = await prisma.employee.findMany({
      where: {
        tenantId: user.tenantId,
        managerId: currentUserEmployee.id,
      },
      select: { id: true, userId: true },
    });

    const directReportIds = directReports.map((emp) => emp.id);

    // If no direct reports, return empty
    if (directReportIds.length === 0) {
      return NextResponse.json({
        success: true,
        goals: [],
        teamMembers: [],
        summary: {
          totalGoals: 0,
          completed: 0,
          inProgress: 0,
          notStarted: 0,
          overdue: 0,
        },
      });
    }

    // Get all goals for direct reports
    const goals = await prisma.goal.findMany({
      where: {
        tenantId: user.tenantId,
        employeeId: {
          in: directReportIds,
        },
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                employeeId: true,
              },
            },
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
      ],
    });

    // Format goals
    const formattedGoals = goals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      description: goal.description,
      status: goal.status,
      progress: goal.progress,
      dueDate: goal.dueDate?.toISOString(),
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
      employee: {
        id: goal.employee.id,
        name: `${goal.employee.user.firstName} ${goal.employee.user.lastName}`,
        email: goal.employee.user.email,
        employeeId: goal.employee.user.employeeId,
      },
    }));

    // Get team members summary
    const teamMembers = directReports.map((emp) => {
      const employeeGoals = goals.filter((g) => g.employeeId === emp.id);
      return {
        employeeId: emp.id,
        userId: emp.userId,
        totalGoals: employeeGoals.length,
        completed: employeeGoals.filter((g) => g.status === 'COMPLETED').length,
        inProgress: employeeGoals.filter((g) => g.status === 'IN_PROGRESS').length,
        notStarted: employeeGoals.filter((g) => g.status === 'NOT_STARTED').length,
      };
    });

    // Calculate summary
    const now = new Date();
    const summary = {
      totalGoals: goals.length,
      completed: goals.filter((g) => g.status === 'COMPLETED').length,
      inProgress: goals.filter((g) => g.status === 'IN_PROGRESS').length,
      notStarted: goals.filter((g) => g.status === 'NOT_STARTED').length,
      overdue: goals.filter(
        (g) => g.status === 'IN_PROGRESS' && g.dueDate && new Date(g.dueDate) < now
      ).length,
    };

    return NextResponse.json({
      success: true,
      goals: formattedGoals,
      teamMembers,
      summary,
    });
  } catch (error) {
    console.error('[GET /api/manager/goals] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch team goals',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
