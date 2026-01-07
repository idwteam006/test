/**
 * POST /api/manager/timesheets/send-reminder
 * Send a reminder to employees who haven't submitted their timesheets
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { sendEmail } from '@/lib/resend-email';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
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
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only managers and admins can send reminders
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Manager access required.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { employeeIds, weekStart, weekEnd, message } = body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No employees specified' },
        { status: 400 }
      );
    }

    // Get manager's employee ID to verify they manage these employees
    const managerEmployee = await prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
      select: { id: true },
    });

    // Get employee details
    const employees = await prisma.user.findMany({
      where: {
        id: { in: employeeIds },
        tenantId: user.tenantId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        employee: {
          select: {
            managerId: true,
          },
        },
      },
    });

    if (employees.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid employees found' },
        { status: 404 }
      );
    }

    // If MANAGER role, verify employees are direct reports
    if (user.role === 'MANAGER' && managerEmployee) {
      const invalidEmployees = employees.filter(
        (emp) => emp.employee?.managerId !== managerEmployee.id
      );

      if (invalidEmployees.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Some employees are not your direct reports',
            invalidCount: invalidEmployees.length,
          },
          { status: 403 }
        );
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const managerName = `${user.firstName} ${user.lastName}`;

    // Send reminder emails
    const emailPromises = employees.map((emp) => {
      const emailContent = {
        to: emp.email,
        subject: `Timesheet Reminder - ${weekStart ? format(new Date(weekStart), 'MMM d') : 'This Week'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">Timesheet Reminder</h2>
            <p>Hi ${emp.firstName},</p>
            <p>This is a friendly reminder from <strong>${managerName}</strong> to submit your timesheet${weekStart ? ` for the week of ${format(new Date(weekStart), 'MMMM d')} - ${format(new Date(weekEnd), 'MMMM d, yyyy')}` : ''}.</p>
            ${message ? `<p style="background-color: #f3f4f6; padding: 12px; border-radius: 8px; border-left: 4px solid #7c3aed;"><em>"${message}"</em></p>` : ''}
            <p>Please log your hours and submit your timesheet as soon as possible.</p>
            <div style="margin: 24px 0;">
              <a href="${appUrl}/employee/timesheets" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Go to Timesheets</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Thank you,<br/>Zenora HR System</p>
          </div>
        `,
      };

      return sendEmail(emailContent).catch((err) => {
        console.error(`Failed to send reminder to ${emp.email}:`, err);
        return { failed: true, email: emp.email };
      });
    });

    const results = await Promise.allSettled(emailPromises);
    const sentCount = results.filter((r) => r.status === 'fulfilled' && !(r.value as any)?.failed).length;
    const failedCount = results.length - sentCount;

    return NextResponse.json({
      success: true,
      message: `Reminders sent to ${sentCount} employee(s)`,
      sentCount,
      failedCount,
      totalRequested: employeeIds.length,
    });
  } catch (error) {
    console.error('[POST /api/manager/timesheets/send-reminder] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send reminders',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
