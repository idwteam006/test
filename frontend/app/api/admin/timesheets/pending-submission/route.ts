/**
 * GET /api/admin/timesheets/pending-submission
 * Get employees who have DRAFT timesheets (not yet submitted) - for sending reminders
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { startOfWeek, endOfWeek } from 'date-fns';

export async function GET(request: NextRequest) {
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
      select: { id: true, tenantId: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { id: userId, tenantId, role } = user;

    // Only admins can access this endpoint
    if (role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Default to current week if no dates provided
    const weekStart = startDate
      ? new Date(startDate)
      : startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endDate
      ? new Date(endDate)
      : endOfWeek(new Date(), { weekStartsOn: 1 });

    // Get the current user's employee record
    const currentUserEmployee = await prisma.employee.findFirst({
      where: { userId: userId, tenantId: tenantId },
      select: { id: true, managerId: true },
    });

    if (!currentUserEmployee) {
      return NextResponse.json(
        { success: false, error: 'Employee record not found' },
        { status: 400 }
      );
    }

    // Get direct reports only (one level of hierarchy)
    const directReports = await prisma.employee.findMany({
      where: {
        tenantId: tenantId,
        managerId: currentUserEmployee.id,
      },
      select: { id: true, userId: true },
    });

    // Get user IDs of direct reports only
    const allSubordinateUserIds = directReports
      .filter(report => report.userId)
      .map(report => report.userId as string);

    if (allSubordinateUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        employees: [],
        summary: {
          totalEmployees: 0,
          totalDraftEntries: 0,
          totalDraftHours: 0,
          totalNotSubmitted: 0,
        },
      });
    }

    // Get all subordinate employee details
    const allSubordinates = await prisma.user.findMany({
      where: {
        id: { in: allSubordinateUserIds },
        tenantId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        department: {
          select: { name: true },
        },
      },
    });

    // Get ALL timesheet entries for all subordinates in the date range (any status)
    const allEntries = await prisma.timesheetEntry.findMany({
      where: {
        tenantId,
        userId: { in: allSubordinateUserIds },
        workDate: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      select: {
        id: true,
        userId: true,
        workDate: true,
        hoursWorked: true,
        status: true,
        isBillable: true,
        description: true,
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true,
          },
        },
      },
    });

    // Group entries by user and calculate status
    const userEntriesMap: Record<string, {
      entries: typeof allEntries;
      hasSubmitted: boolean;
      hasDraft: boolean;
      hasApproved: boolean;
      totalHours: number;
      draftHours: number;
      submittedHours: number;
      approvedHours: number;
    }> = {};

    // Initialize all subordinates (even those with no entries)
    allSubordinateUserIds.forEach(userId => {
      userEntriesMap[userId] = {
        entries: [],
        hasSubmitted: false,
        hasDraft: false,
        hasApproved: false,
        totalHours: 0,
        draftHours: 0,
        submittedHours: 0,
        approvedHours: 0,
      };
    });

    // Populate with actual entries
    allEntries.forEach(entry => {
      const userData = userEntriesMap[entry.userId];
      if (userData) {
        userData.entries.push(entry);
        userData.totalHours += entry.hoursWorked;

        if (entry.status === 'DRAFT') {
          userData.hasDraft = true;
          userData.draftHours += entry.hoursWorked;
        } else if (entry.status === 'SUBMITTED') {
          userData.hasSubmitted = true;
          userData.submittedHours += entry.hoursWorked;
        } else if (entry.status === 'APPROVED' || entry.status === 'INVOICED') {
          userData.hasApproved = true;
          userData.approvedHours += entry.hoursWorked;
        }
      }
    });

    // Build employee list with their submission status
    // "Not Submitted" = has DRAFT entries OR has NO entries at all
    const notSubmittedEmployees = allSubordinates
      .filter(user => {
        const userData = userEntriesMap[user.id];
        // Include if: has draft entries OR has no entries at all (and no submitted/approved)
        return userData && (userData.hasDraft || (!userData.hasSubmitted && !userData.hasApproved && userData.entries.length === 0));
      })
      .map(user => {
        const userData = userEntriesMap[user.id];
        const draftEntries = userData.entries.filter(e => e.status === 'DRAFT');

        return {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          employeeId: user.employeeId,
          department: user.department?.name || 'N/A',
          status: userData.entries.length === 0 ? 'no_entries' : 'has_drafts',
          draftEntries: draftEntries.map(entry => ({
            id: entry.id,
            workDate: entry.workDate.toISOString().split('T')[0],
            hoursWorked: entry.hoursWorked,
            isBillable: entry.isBillable,
            description: entry.description,
            project: entry.project,
          })),
          totalDraftHours: userData.draftHours,
          totalDraftEntries: draftEntries.length,
          billableHours: draftEntries.filter(e => e.isBillable).reduce((sum, e) => sum + e.hoursWorked, 0),
        };
      })
      .sort((a, b) => {
        // Sort by status first (no_entries first), then by name
        if (a.status !== b.status) {
          return a.status === 'no_entries' ? -1 : 1;
        }
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      });

    // Calculate summary - use notSubmittedEmployees which includes both DRAFT and NO_ENTRIES
    const noEntriesCount = notSubmittedEmployees.filter(e => e.status === 'no_entries').length;
    const hasDraftsCount = notSubmittedEmployees.filter(e => e.status === 'has_drafts').length;
    const totalDraftHoursCalc = notSubmittedEmployees.reduce((sum, e) => sum + e.totalDraftHours, 0);

    const summary = {
      totalEmployees: notSubmittedEmployees.length,
      totalNotSubmitted: notSubmittedEmployees.length,
      noEntriesCount,
      hasDraftsCount,
      totalDraftEntries: notSubmittedEmployees.reduce((sum, e) => sum + e.totalDraftEntries, 0),
      totalDraftHours: totalDraftHoursCalc,
      totalSubordinates: allSubordinateUserIds.length,
    };

    return NextResponse.json({
      success: true,
      employees: notSubmittedEmployees,
      summary,
      dateRange: {
        startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('[GET /api/admin/timesheets/pending-submission] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pending submissions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
