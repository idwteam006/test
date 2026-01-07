import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { notifyManagerLeaveRequested } from '@/lib/email-notifications';
import { format } from 'date-fns';
import { uploadFileToS3, generateS3Key, validateFile, ALLOWED_FILE_TYPES } from '@/lib/s3';
import { calculateBusinessDays } from '@/lib/date-utils';

// GET /api/employee/leave - Fetch employee's leave requests
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const year = searchParams.get('year');

    // Get employee record
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee record not found' }, { status: 404 });
    }

    // Build query filters
    const where: any = {
      employeeId: employee.id,
      tenantId: user.tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (year) {
      const yearNum = parseInt(year);
      where.startDate = {
        gte: new Date(`${yearNum}-01-01`),
        lte: new Date(`${yearNum}-12-31`),
      };
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, leaveRequests });
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leave requests' },
      { status: 500 }
    );
  }
}

// POST /api/employee/leave - Create new leave request
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Handle both JSON and FormData
    const contentType = request.headers.get('content-type') || '';
    let body: any;
    let medicalCertificateFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = {
        leaveType: formData.get('leaveType') as string,
        startDate: formData.get('startDate') as string,
        endDate: formData.get('endDate') as string,
        reason: formData.get('reason') as string,
        days: formData.get('days') ? parseFloat(formData.get('days') as string) : undefined,
      };
      medicalCertificateFile = formData.get('medicalCertificate') as File | null;
    } else {
      body = await request.json();
    }

    const { leaveType, startDate, endDate, reason, days } = body;

    // Validate required fields
    if (!leaveType || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get employee record with manager info for notification
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        managerId: true,
        manager: {
          select: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee record not found' }, { status: 404 });
    }

    // Get tenant settings for policy enforcement
    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: {
        minimumLeaveNoticeDays: true,
        maximumConsecutiveLeaveDays: true,
        allowFutureLeaveRequests: true,
        leavePolicies: true,
      },
    });

    // Calculate business days (excluding weekends - Saturday and Sunday)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const calculatedDays = days || calculateBusinessDays(startDate, endDate);

    // Validate that at least one business day is selected
    if (calculatedDays === 0) {
      return NextResponse.json(
        { success: false, error: 'Selected dates fall on weekends only. Please select at least one weekday.' },
        { status: 400 }
      );
    }

    // Validate dates
    if (end < start) {
      return NextResponse.json(
        { success: false, error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Enforce minimum notice period
    const minimumNoticeDays = tenantSettings?.minimumLeaveNoticeDays || 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);

    const daysDifference = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference < minimumNoticeDays) {
      return NextResponse.json(
        {
          success: false,
          error: `Leave requests require at least ${minimumNoticeDays} day(s) advance notice. Your request is ${daysDifference} day(s) in advance.`,
        },
        { status: 400 }
      );
    }

    // Enforce maximum consecutive days if configured
    const maxConsecutiveDays = tenantSettings?.maximumConsecutiveLeaveDays;
    if (maxConsecutiveDays && calculatedDays > maxConsecutiveDays) {
      return NextResponse.json(
        {
          success: false,
          error: `Leave requests cannot exceed ${maxConsecutiveDays} consecutive days. You requested ${calculatedDays} days.`,
        },
        { status: 400 }
      );
    }

    // Check leave balance for the year of the leave request
    const leaveYear = start.getFullYear();

    console.log(`[Leave Request] Checking balance - EmployeeId: ${employee.id}, LeaveType: ${leaveType}, Year: ${leaveYear}`);

    const leaveBalance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveType_year: {
          employeeId: employee.id,
          leaveType,
          year: leaveYear,
        },
      },
    });

    console.log(`[Leave Request] Found balance record:`, leaveBalance ? JSON.stringify(leaveBalance) : 'null (will use org default)');

    // Default leave policies (fallback)
    const DEFAULT_LEAVE_POLICIES: Record<string, number> = {
      ANNUAL: 20,
      SICK: 10,
      PERSONAL: 5,
      MATERNITY: 90,
      PATERNITY: 15,
      UNPAID: 0,
    };

    // Get available balance - use existing balance OR org-wide default from tenant settings
    let availableBalance: number;
    let balanceSource: string;

    if (leaveBalance) {
      // Use existing balance record
      availableBalance = leaveBalance.balance;
      balanceSource = 'database record';
    } else {
      // No individual balance - use org-wide leave policy as default
      // Merge tenant leave policies with defaults
      const orgLeavePolicies = {
        ...DEFAULT_LEAVE_POLICIES,
        ...(tenantSettings?.leavePolicies as Record<string, number> || {}),
      };
      availableBalance = orgLeavePolicies[leaveType] ?? 0;
      balanceSource = 'org default';
    }

    console.log(`[Leave Request] Available balance: ${availableBalance} days (source: ${balanceSource}), Requested: ${calculatedDays} days`);

    // Validate sufficient balance
    if (availableBalance < calculatedDays) {
      // Provide helpful message if balance is negative (indicates data issue)
      const errorMessage = availableBalance < 0
        ? `Insufficient leave balance. Available: ${availableBalance} days, Requested: ${calculatedDays} days. Your balance appears incorrect - please use the "Reset to Org Defaults" button to fix it.`
        : `Insufficient leave balance. Available: ${availableBalance} days, Requested: ${calculatedDays} days`;

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          needsReset: availableBalance < 0, // Flag to indicate balance needs reset
        },
        { status: 400 }
      );
    }

    // Check for overlapping leave requests
    const overlappingRequests = await prisma.leaveRequest.findMany({
      where: {
        employeeId: employee.id,
        tenantId: user.tenantId,
        status: {
          in: ['PENDING', 'APPROVED'],
        },
        OR: [
          {
            AND: [{ startDate: { lte: start } }, { endDate: { gte: start } }],
          },
          {
            AND: [{ startDate: { lte: end } }, { endDate: { gte: end } }],
          },
          {
            AND: [{ startDate: { gte: start } }, { endDate: { lte: end } }],
          },
        ],
      },
    });

    if (overlappingRequests.length > 0) {
      return NextResponse.json(
        { success: false, error: 'You already have a leave request for this date range' },
        { status: 400 }
      );
    }

    // Handle medical certificate upload for sick leave
    let medicalCertificateUrl: string | null = null;
    if (leaveType === 'SICK' && medicalCertificateFile) {
      // Validate file
      const validation = validateFile(
        { size: medicalCertificateFile.size, type: medicalCertificateFile.type },
        {
          maxSize: 5 * 1024 * 1024, // 5MB limit for medical certificates
          allowedTypes: [...ALLOWED_FILE_TYPES.DOCUMENTS, ...ALLOWED_FILE_TYPES.IMAGES],
        }
      );

      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }

      // Upload to S3
      try {
        const fileBuffer = Buffer.from(await medicalCertificateFile.arrayBuffer());
        const s3Key = generateS3Key(
          user.tenantId,
          'leave/medical-certificates',
          medicalCertificateFile.name
        );

        medicalCertificateUrl = await uploadFileToS3(
          fileBuffer,
          s3Key,
          medicalCertificateFile.type,
          {
            employeeId: employee.id,
            leaveType,
            uploadedAt: new Date().toISOString(),
          }
        );
      } catch (uploadError) {
        console.error('Failed to upload medical certificate:', uploadError);
        return NextResponse.json(
          { success: false, error: 'Failed to upload medical certificate' },
          { status: 500 }
        );
      }
    }

    // Create leave request
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        tenantId: user.tenantId,
        employeeId: employee.id,
        leaveType,
        startDate: start,
        endDate: end,
        days: calculatedDays,
        reason: reason || null,
        medicalCertificateUrl,
        status: 'PENDING',
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Send email notification to manager (if employee has a manager)
    if (employee.manager?.user?.email) {
      const managerUser = employee.manager.user;
      const employeeUser = leaveRequest.employee.user;
      const employeeName = `${employeeUser.firstName} ${employeeUser.lastName}`;
      const managerName = `${managerUser.firstName} ${managerUser.lastName}`;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zenora.ai';

      // Format leave type for display
      const leaveTypeDisplay = leaveType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

      notifyManagerLeaveRequested({
        managerEmail: managerUser.email,
        managerName,
        employeeName,
        leaveType: leaveTypeDisplay,
        startDate: format(start, 'MMM d, yyyy'),
        endDate: format(end, 'MMM d, yyyy'),
        days: calculatedDays,
        reason: reason || undefined,
        reviewUrl: `${appUrl}/manager/leave-approvals`,
      }).catch((err) => {
        console.error('Failed to send leave request notification:', err);
      });
    }

    return NextResponse.json({ success: true, leaveRequest });
  } catch (error) {
    console.error('Error creating leave request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create leave request' },
      { status: 500 }
    );
  }
}
