/**
 * GET /api/employee/goals - Get employee's goals
 * POST /api/employee/goals - Create new goal
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

    // Get employee
    const employee = await prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
    });

    if (!employee) {
      // Return empty array if employee record doesn't exist yet
      return NextResponse.json({
        success: true,
        goals: []
      });
    }

    // Get all goals for this employee
    const goals = await prisma.goal.findMany({
      where: {
        employeeId: employee.id,
        tenantId: user.tenantId,
      },
      orderBy: [
        { status: 'asc' }, // Active goals first
        { dueDate: 'asc' }, // Sort by due date
      ],
    });

    return NextResponse.json({
      success: true,
      goals,
    });
  } catch (error) {
    console.error('[GET /api/employee/goals] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch goals',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, dueDate, progress, status } = body;

    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Get employee
    const employee = await prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee record not found. Please contact HR to complete your onboarding.' },
        { status: 404 }
      );
    }

    // Create goal
    const goal = await prisma.goal.create({
      data: {
        tenantId: user.tenantId,
        employeeId: employee.id,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        progress: progress || 0,
        status: status || 'NOT_STARTED',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Goal created successfully',
      goal,
    });
  } catch (error) {
    console.error('[POST /api/employee/goals] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create goal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
