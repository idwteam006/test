import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/settings
 * Get tenant settings (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData?.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        id: true,
        tenantId: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only admins can access settings
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Get tenant settings
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    });

    if (!settings) {
      return NextResponse.json(
        { success: false, error: 'Settings not found' },
        { status: 404 }
      );
    }

    // Default leave policies if not set
    const defaultLeavePolicies = {
      ANNUAL: 20,
      SICK: 10,
      PERSONAL: 5,
      MATERNITY: 90,
      PATERNITY: 15,
      UNPAID: 0,
    };

    return NextResponse.json({
      success: true,
      settings: {
        id: settings.id,
        companyName: settings.companyName,
        timezone: settings.timezone,
        timeFormat: settings.timeFormat,
        dateFormat: settings.dateFormat,
        weekStartDay: settings.weekStartDay,
        currency: settings.currency,
        isDevelopmentMode: settings.isDevelopmentMode,
        workingHours: settings.workingHours,
        allowFutureExpenses: settings.allowFutureExpenses,
        allowFutureTimesheets: settings.allowFutureTimesheets,
        allowFutureLeaveRequests: settings.allowFutureLeaveRequests,
        requireLeaveApproval: settings.requireLeaveApproval,
        minimumLeaveNoticeDays: settings.minimumLeaveNoticeDays ?? 1,
        maximumConsecutiveLeaveDays: settings.maximumConsecutiveLeaveDays ?? null,
        allowHalfDayLeave: settings.allowHalfDayLeave ?? false,
        carryForwardLeave: settings.carryForwardLeave ?? false,
        maxCarryForwardDays: settings.maxCarryForwardDays ?? 0,
        leaveAllocationDay: settings.leaveAllocationDay ?? '01-01',
        autoAllocateLeave: settings.autoAllocateLeave ?? true,
        leavePolicies: settings.leavePolicies ?? defaultLeavePolicies,
      },
    });

  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch settings',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/settings
 * Update tenant settings (admin only)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Authentication
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData?.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        id: true,
        tenantId: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only admins can update settings
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      isDevelopmentMode,
      timezone,
      timeFormat,
      dateFormat,
      weekStartDay,
      workingHours,
      allowFutureExpenses,
      allowFutureTimesheets,
      allowFutureLeaveRequests,
      requireLeaveApproval
    } = body;

    // Build update data object with only provided fields
    const updateData: Record<string, any> = {};

    // Validate and add isDevelopmentMode if provided
    if (typeof isDevelopmentMode === 'boolean') {
      updateData.isDevelopmentMode = isDevelopmentMode;
    }

    // Validate and add timezone if provided
    if (timezone !== undefined) {
      // List of common timezones
      const validTimezones = [
        'UTC',
        'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
        'America/Toronto', 'America/Vancouver', 'America/Mexico_City',
        'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Madrid',
        'Asia/Kolkata', 'Asia/Mumbai', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore',
        'Asia/Dubai', 'Asia/Hong_Kong', 'Asia/Seoul',
        'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth',
        'Pacific/Auckland', 'Pacific/Honolulu',
        'Africa/Johannesburg', 'Africa/Cairo',
      ];
      if (!validTimezones.includes(timezone)) {
        return NextResponse.json(
          { success: false, error: 'Invalid timezone. Please select a valid timezone.' },
          { status: 400 }
        );
      }
      updateData.timezone = timezone;
    }

    // Validate and add timeFormat if provided
    if (timeFormat !== undefined) {
      if (!['12h', '24h'].includes(timeFormat)) {
        return NextResponse.json(
          { success: false, error: 'timeFormat must be either "12h" or "24h"' },
          { status: 400 }
        );
      }
      updateData.timeFormat = timeFormat;
    }

    // Validate and add dateFormat if provided
    if (dateFormat !== undefined) {
      const validDateFormats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY', 'MMM DD, YYYY'];
      if (!validDateFormats.includes(dateFormat)) {
        return NextResponse.json(
          { success: false, error: 'Invalid date format' },
          { status: 400 }
        );
      }
      updateData.dateFormat = dateFormat;
    }

    // Validate and add weekStartDay if provided
    if (weekStartDay !== undefined) {
      const validWeekStartDays = ['SUNDAY', 'MONDAY', 'SATURDAY'];
      if (!validWeekStartDays.includes(weekStartDay)) {
        return NextResponse.json(
          { success: false, error: 'weekStartDay must be SUNDAY, MONDAY, or SATURDAY' },
          { status: 400 }
        );
      }
      updateData.weekStartDay = weekStartDay;
    }

    // Validate and add workingHours if provided
    if (workingHours !== undefined) {
      if (typeof workingHours !== 'object' || !workingHours.start || !workingHours.end || !Array.isArray(workingHours.days)) {
        return NextResponse.json(
          { success: false, error: 'workingHours must include start, end, and days array' },
          { status: 400 }
        );
      }
      updateData.workingHours = workingHours;
    }

    // Validate and add allowFutureExpenses if provided
    if (typeof allowFutureExpenses === 'boolean') {
      updateData.allowFutureExpenses = allowFutureExpenses;
    }

    // Validate and add allowFutureTimesheets if provided
    if (typeof allowFutureTimesheets === 'boolean') {
      updateData.allowFutureTimesheets = allowFutureTimesheets;
    }

    // Validate and add allowFutureLeaveRequests if provided
    if (typeof allowFutureLeaveRequests === 'boolean') {
      updateData.allowFutureLeaveRequests = allowFutureLeaveRequests;
    }

    // Validate and add requireLeaveApproval if provided
    if (typeof requireLeaveApproval === 'boolean') {
      updateData.requireLeaveApproval = requireLeaveApproval;
    }

    // Validate and add leave policy fields
    const {
      minimumLeaveNoticeDays,
      maximumConsecutiveLeaveDays,
      allowHalfDayLeave,
      carryForwardLeave,
      maxCarryForwardDays,
      leaveAllocationDay,
      autoAllocateLeave,
    } = body;

    if (typeof minimumLeaveNoticeDays === 'number') {
      if (minimumLeaveNoticeDays < 0 || minimumLeaveNoticeDays > 365) {
        return NextResponse.json(
          { success: false, error: 'minimumLeaveNoticeDays must be between 0 and 365' },
          { status: 400 }
        );
      }
      updateData.minimumLeaveNoticeDays = minimumLeaveNoticeDays;
    }

    if (maximumConsecutiveLeaveDays !== undefined) {
      if (maximumConsecutiveLeaveDays !== null && (maximumConsecutiveLeaveDays < 1 || maximumConsecutiveLeaveDays > 365)) {
        return NextResponse.json(
          { success: false, error: 'maximumConsecutiveLeaveDays must be between 1 and 365 or null' },
          { status: 400 }
        );
      }
      updateData.maximumConsecutiveLeaveDays = maximumConsecutiveLeaveDays;
    }

    if (typeof allowHalfDayLeave === 'boolean') {
      updateData.allowHalfDayLeave = allowHalfDayLeave;
    }

    if (typeof carryForwardLeave === 'boolean') {
      updateData.carryForwardLeave = carryForwardLeave;
    }

    if (typeof maxCarryForwardDays === 'number') {
      if (maxCarryForwardDays < 0 || maxCarryForwardDays > 365) {
        return NextResponse.json(
          { success: false, error: 'maxCarryForwardDays must be between 0 and 365' },
          { status: 400 }
        );
      }
      updateData.maxCarryForwardDays = maxCarryForwardDays;
    }

    if (typeof leaveAllocationDay === 'string') {
      // Validate format MM-DD
      if (!/^\d{2}-\d{2}$/.test(leaveAllocationDay)) {
        return NextResponse.json(
          { success: false, error: 'leaveAllocationDay must be in MM-DD format (e.g., 01-01)' },
          { status: 400 }
        );
      }
      updateData.leaveAllocationDay = leaveAllocationDay;
    }

    if (typeof autoAllocateLeave === 'boolean') {
      updateData.autoAllocateLeave = autoAllocateLeave;
    }

    // Validate and add leavePolicies if provided
    const { leavePolicies } = body;
    if (leavePolicies !== undefined) {
      // Validate leave policies structure
      const validLeaveTypes = ['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'UNPAID'];
      if (typeof leavePolicies !== 'object' || leavePolicies === null) {
        return NextResponse.json(
          { success: false, error: 'leavePolicies must be an object' },
          { status: 400 }
        );
      }

      // Validate each leave type value
      for (const [leaveType, days] of Object.entries(leavePolicies)) {
        if (!validLeaveTypes.includes(leaveType)) {
          return NextResponse.json(
            { success: false, error: `Invalid leave type: ${leaveType}` },
            { status: 400 }
          );
        }
        if (typeof days !== 'number' || days < 0 || days > 365) {
          return NextResponse.json(
            { success: false, error: `${leaveType} days must be a number between 0 and 365` },
            { status: 400 }
          );
        }
      }

      updateData.leavePolicies = leavePolicies;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields provided for update' },
        { status: 400 }
      );
    }

    // Update settings
    const updatedSettings = await prisma.tenantSettings.update({
      where: { tenantId: user.tenantId },
      data: updateData,
      select: {
        id: true,
        companyName: true,
        timezone: true,
        timeFormat: true,
        dateFormat: true,
        weekStartDay: true,
        currency: true,
        isDevelopmentMode: true,
        workingHours: true,
        allowFutureExpenses: true,
        allowFutureTimesheets: true,
        allowFutureLeaveRequests: true,
        requireLeaveApproval: true,
        minimumLeaveNoticeDays: true,
        maximumConsecutiveLeaveDays: true,
        allowHalfDayLeave: true,
        carryForwardLeave: true,
        maxCarryForwardDays: true,
        leaveAllocationDay: true,
        autoAllocateLeave: true,
        leavePolicies: true,
      },
    });

    // Log the change
    console.log(`[Admin Settings] ${user.id} updated settings:`, Object.keys(updateData));

    // Build appropriate success message
    let message = 'Settings updated successfully';
    if (updateData.isDevelopmentMode !== undefined) {
      message = `Successfully switched to ${updateData.isDevelopmentMode ? 'Development' : 'Production'} mode`;
    } else if (updateData.timezone) {
      message = `Timezone updated to ${updateData.timezone}`;
    }

    // Default leave policies for response
    const defaultLeavePolicies = {
      ANNUAL: 20,
      SICK: 10,
      PERSONAL: 5,
      MATERNITY: 90,
      PATERNITY: 15,
      UNPAID: 0,
    };

    return NextResponse.json({
      success: true,
      message,
      settings: {
        id: updatedSettings.id,
        companyName: updatedSettings.companyName,
        timezone: updatedSettings.timezone,
        timeFormat: updatedSettings.timeFormat,
        dateFormat: updatedSettings.dateFormat,
        weekStartDay: updatedSettings.weekStartDay,
        currency: updatedSettings.currency,
        isDevelopmentMode: updatedSettings.isDevelopmentMode,
        workingHours: updatedSettings.workingHours,
        allowFutureExpenses: updatedSettings.allowFutureExpenses,
        allowFutureTimesheets: updatedSettings.allowFutureTimesheets,
        allowFutureLeaveRequests: updatedSettings.allowFutureLeaveRequests,
        requireLeaveApproval: updatedSettings.requireLeaveApproval,
        minimumLeaveNoticeDays: updatedSettings.minimumLeaveNoticeDays,
        maximumConsecutiveLeaveDays: updatedSettings.maximumConsecutiveLeaveDays,
        allowHalfDayLeave: updatedSettings.allowHalfDayLeave,
        carryForwardLeave: updatedSettings.carryForwardLeave,
        maxCarryForwardDays: updatedSettings.maxCarryForwardDays,
        leaveAllocationDay: updatedSettings.leaveAllocationDay,
        autoAllocateLeave: updatedSettings.autoAllocateLeave,
        leavePolicies: updatedSettings.leavePolicies ?? defaultLeavePolicies,
      },
    });

  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update settings',
        details: error.message
      },
      { status: 500 }
    );
  }
}
