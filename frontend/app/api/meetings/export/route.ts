/**
 * GET /api/meetings/export
 * Export meetings as iCal (.ics) file
 * Query params:
 * - meetingId: Export single meeting (optional)
 * - startDate: Filter start date (optional)
 * - endDate: Filter end date (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { generateICalEvent, generateICalFile, responseStatusToPartStat } from '@/lib/ical-generator';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get employee record
    const employee = await prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee record not found. Please contact HR to complete your onboarding.' },
        { status: 404 }
      );
    }

    // Build where clause
    const whereClause: any = {
      tenantId: user.tenantId,
      OR: [
        { organizerId: employee.id },
        { attendees: { some: { employeeId: employee.id } } },
      ],
    };

    if (meetingId) {
      whereClause.id = meetingId;
    }

    if (startDate || endDate) {
      whereClause.startTime = {};
      if (startDate) whereClause.startTime.gte = new Date(startDate);
      if (endDate) whereClause.startTime.lte = new Date(endDate);
    }

    // Fetch meetings
    const meetings = await prisma.meeting.findMany({
      where: whereClause,
      include: {
        organizer: {
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
        attendees: {
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
        },
      },
      orderBy: { startTime: 'asc' },
    });

    if (meetings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No meetings found' },
        { status: 404 }
      );
    }

    // Single meeting export
    if (meetingId && meetings.length === 1) {
      const meeting = meetings[0];
      const icalContent = generateICalEvent({
        uid: meeting.id,
        title: meeting.title,
        description: meeting.description || undefined,
        location: meeting.location || meeting.zoomJoinUrl || undefined,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        organizer: {
          name: `${meeting.organizer.user.firstName} ${meeting.organizer.user.lastName}`,
          email: meeting.organizer.user.email,
        },
        attendees: meeting.attendees.map(att => ({
          name: `${att.employee.user.firstName} ${att.employee.user.lastName}`,
          email: att.employee.user.email,
          status: responseStatusToPartStat(att.responseStatus),
        })),
        url: meeting.zoomJoinUrl || undefined,
        status: meeting.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED',
      });

      return new NextResponse(icalContent, {
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': `attachment; filename="${meeting.title.replace(/[^a-z0-9]/gi, '_')}_${meeting.id}.ics"`,
        },
      });
    }

    // Multiple meetings export
    const icalEvents = meetings.map(meeting => ({
      uid: meeting.id,
      title: meeting.title,
      description: meeting.description || undefined,
      location: meeting.location || meeting.zoomJoinUrl || undefined,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      organizer: {
        name: `${meeting.organizer.user.firstName} ${meeting.organizer.user.lastName}`,
        email: meeting.organizer.user.email,
      },
      attendees: meeting.attendees.map(att => ({
        name: `${att.employee.user.firstName} ${att.employee.user.lastName}`,
        email: att.employee.user.email,
        status: responseStatusToPartStat(att.responseStatus),
      })),
      url: meeting.zoomJoinUrl || undefined,
      status: (meeting.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED') as 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED',
    }));

    const icalContent = generateICalFile(icalEvents);

    const filename = startDate && endDate
      ? `zenora_meetings_${startDate}_to_${endDate}.ics`
      : `zenora_meetings_${new Date().toISOString().split('T')[0]}.ics`;

    return new NextResponse(icalContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[GET /api/meetings/export] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export meetings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
