import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { notifyEmployeeStatusChanged } from '@/lib/email-notifications';

/**
 * PATCH /api/admin/employees/[id]/status
 *
 * Update employee status (activate, deactivate, suspend)
 *
 * Security:
 * - Only ADMIN, MANAGER, HR can update employee status
 * - Can only update employees in their own tenant
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Get session and validate authentication
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

    // Check if user has admin/manager/HR permissions
    if (!['ADMIN', 'MANAGER', 'HR'].includes(sessionData.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // 2. Get user ID from params
    const { id: userId } = await params;

    // 3. Parse request body
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be ACTIVE, INACTIVE, or SUSPENDED' },
        { status: 400 }
      );
    }

    // 4. Check if user exists and belongs to same tenant
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        tenantId: true,
        status: true,
        employee: {
          select: {
            id: true,
            status: true,
          }
        }
      }
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check tenant match
    if (targetUser.tenantId !== sessionData.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Employee not found or does not belong to your organization' },
        { status: 403 }
      );
    }

    // 5. Update user status (UserStatus enum: ACTIVE, INACTIVE, SUSPENDED, etc.)
    await prisma.user.update({
      where: { id: userId },
      data: { status }
    });

    // 6. Update employee status if employee record exists
    // Note: EmploymentStatus enum only has: ACTIVE, INACTIVE, TERMINATED, ON_LEAVE
    // Map UserStatus to EmploymentStatus appropriately
    if (targetUser.employee) {
      let employeeStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'ON_LEAVE' = 'ACTIVE';
      if (status === 'SUSPENDED' || status === 'INACTIVE') {
        employeeStatus = 'INACTIVE';
      } else if (status === 'ACTIVE') {
        employeeStatus = 'ACTIVE';
      }

      await prisma.employee.update({
        where: { id: targetUser.employee.id },
        data: { status: employeeStatus }
      });
    }

    // 7. Get updated user with tenant info for notifications
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        status: true,
        tenant: {
          select: {
            name: true,
          }
        }
      }
    });

    // 8. Get admin user details for "changed by"
    const adminUser = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: { name: true }
    });

    // 9. Send email notification to employee
    if (updatedUser && status !== targetUser.status) {
      try {
        await notifyEmployeeStatusChanged({
          employeeEmail: updatedUser.email,
          employeeName: updatedUser.name,
          newStatus: status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
          previousStatus: targetUser.status || 'UNKNOWN',
          changedBy: adminUser?.name || sessionData.email,
          organizationName: updatedUser.tenant?.name || 'Zenora',
        });
      } catch (emailError) {
        console.error('Error sending status change email notification:', emailError);
        // Don't fail the request if email sending fails
      }
    }

    // 10. Create audit log
    await prisma.auditLog.create({
      data: {
        userId: sessionData.userId,
        tenantId: sessionData.tenantId,
        action: 'employee.status_updated',
        entityType: 'User',
        entityId: userId,
        changes: {
          from: targetUser.status,
          to: status,
          updatedBy: sessionData.email,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    });

    return NextResponse.json({
      success: true,
      message: `Employee status updated to ${status}`,
      data: {
        id: userId,
        status,
      }
    });

  } catch (error) {
    console.error('Update employee status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update employee status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
