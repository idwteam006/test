/**
 * PATCH /api/employee/goals/[id] - Update goal
 * DELETE /api/employee/goals/[id] - Delete goal
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, dueDate, progress, status } = body;

    // Get employee
    const employee = await prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee profile not found' },
        { status: 404 }
      );
    }

    // Verify goal belongs to employee
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id,
        employeeId: employee.id,
        tenantId: user.tenantId,
      },
    });

    if (!existingGoal) {
      return NextResponse.json(
        { success: false, error: 'Goal not found' },
        { status: 404 }
      );
    }

    // Update goal
    const goal = await prisma.goal.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(progress !== undefined && { progress }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Goal updated successfully',
      goal,
    });
  } catch (error) {
    console.error('[PATCH /api/employee/goals/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update goal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      return NextResponse.json(
        { success: false, error: 'Employee profile not found' },
        { status: 404 }
      );
    }

    // Verify goal belongs to employee
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id,
        employeeId: employee.id,
        tenantId: user.tenantId,
      },
    });

    if (!existingGoal) {
      return NextResponse.json(
        { success: false, error: 'Goal not found' },
        { status: 404 }
      );
    }

    // Delete goal
    await prisma.goal.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Goal deleted successfully',
    });
  } catch (error) {
    console.error('[DELETE /api/employee/goals/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete goal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}