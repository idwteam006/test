import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';

/**
 * GET /api/admin/check-user?email=xxx
 *
 * Check if a user exists with the given email
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const sessionData = await sessions.get(sessionId);

    if (!sessionData || sessionData.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email parameter required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        employeeId: true,
        employee: {
          select: {
            employeeNumber: true,
            jobTitle: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        exists: false,
        message: 'Email is available',
      });
    }

    return NextResponse.json({
      success: true,
      exists: true,
      message: 'Email already exists',
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        status: user.status,
        employeeNumber: user.employee?.employeeNumber || null,
        jobTitle: user.employee?.jobTitle || null,
        department: user.employee?.department?.name || null,
        createdAt: user.createdAt,
      },
    });

  } catch (error) {
    console.error('Error checking user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check user',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/check-user?email=xxx
 *
 * Delete a user by email (for testing/cleanup)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const sessionData = await sessions.get(sessionId);

    if (!sessionData || sessionData.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email parameter required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, employeeId: true },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Delete employee if exists
      if (user.employeeId) {
        await tx.employee.delete({
          where: { id: user.employeeId },
        });
      }

      // Delete user
      await tx.user.delete({
        where: { id: user.id },
      });
    });

    return NextResponse.json({
      success: true,
      message: `User ${email} deleted successfully`,
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete user',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
