/**
 * GET /api/meetings - List meetings for the current user
 * POST /api/meetings - Create a new meeting
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { createZoomMeetingForEvent } from '@/lib/zoom';
import { sendMeetingInvitation } from '@/lib/email-service';

// Force Node.js runtime (needed for nodemailer email sending)
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('[GET /api/meetings] User:', user.id, 'Tenant:', user.tenantId);

    const employee = await prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
    });

    if (!employee) {
      console.log('[GET /api/meetings] Employee not found for user:', user.id);
      // Return empty array if employee record doesn't exist yet
      return NextResponse.json({
        success: true,
        meetings: [],
        total: 0
      });
    }

    console.log('[GET /api/meetings] Employee found:', employee.id);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const meetingType = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const whereClause: any = {
      tenantId: user.tenantId,
      OR: [
        { organizerId: employee.id }, // Meetings organized by user
        {
          attendees: {
            some: { employeeId: employee.id }, // Meetings user is attending
          },
        },
      ],
    };

    if (status) {
      whereClause.status = status;
    }

    if (meetingType) {
      whereClause.meetingType = meetingType;
    }

    if (startDate && endDate) {
      whereClause.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    console.log('[GET /api/meetings] Where clause:', JSON.stringify(whereClause, null, 2));

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
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    console.log('[GET /api/meetings] Found meetings:', meetings.length);

    return NextResponse.json({
      success: true,
      meetings,
    });
  } catch (error) {
    console.error('[GET /api/meetings] Error:', error);
    console.error('[GET /api/meetings] Stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch meetings',
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

    const employee = await prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee record not found. Please contact HR to complete your onboarding.' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      startTime,
      endTime,
      location,
      meetingType,
      attendeeIds, // Array of employee IDs
      agenda,
      createZoomMeeting,
    } = body;

    // Validation
    if (!title || !startTime || !endTime || !meetingType) {
      return NextResponse.json(
        { success: false, error: 'Title, start time, end time, and meeting type are required' },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return NextResponse.json(
        { success: false, error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    let zoomData: any = {};
    let zoomErrorMessage: string | null = null;

    // Create Zoom meeting if requested
    if (createZoomMeeting) {
      try {
        console.log('[POST /api/meetings] Creating Zoom meeting...');

        // Fetch tenant settings to get Zoom host email
        const tenantSettings = await prisma.tenantSettings.findUnique({
          where: { tenantId: user.tenantId },
          select: { zoomHostEmail: true },
        });

        const zoomHostEmail = tenantSettings?.zoomHostEmail || user.email;
        console.log('[POST /api/meetings] Using Zoom host email:', zoomHostEmail);

        const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
        const zoomMeeting = await createZoomMeetingForEvent({
          title,
          startTime: start,
          duration,
          description: description || agenda,
          hostEmail: zoomHostEmail,
        });

        zoomData = {
          zoomMeetingId: zoomMeeting.id.toString(),
          zoomJoinUrl: zoomMeeting.join_url,
          zoomStartUrl: zoomMeeting.start_url,
        };
        console.log('[POST /api/meetings] Zoom meeting created successfully');
      } catch (zoomError) {
        console.error('[POST /api/meetings] Failed to create Zoom meeting:', zoomError);

        // Extract meaningful error message
        if (zoomError instanceof Error) {
          if (zoomError.message.includes('scopes')) {
            zoomErrorMessage = 'Zoom integration unavailable: Missing API permissions. Meeting created without Zoom link.';
          } else if (zoomError.message.includes('access token')) {
            zoomErrorMessage = 'Zoom integration unavailable: Invalid credentials. Meeting created without Zoom link.';
          } else {
            zoomErrorMessage = 'Zoom integration unavailable. Meeting created without Zoom link.';
          }
        }

        console.log('[POST /api/meetings] Continuing without Zoom integration:', zoomErrorMessage);
        // Continue without Zoom integration
      }
    }

    // Create meeting
    const meeting = await prisma.meeting.create({
      data: {
        tenantId: user.tenantId,
        organizerId: employee.id,
        title,
        description,
        startTime: start,
        endTime: end,
        location: location || (createZoomMeeting ? 'Zoom' : null),
        meetingType,
        agenda,
        ...zoomData,
        attendees: {
          create: attendeeIds?.map((empId: string) => ({
            employeeId: empId,
            isRequired: true,
          })) || [],
        },
      },
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
    });

    // Send meeting invitations via email
    console.log('[POST /api/meetings] Attempting to send email invitations...');
    try {
      const organizerName = `${meeting.organizer.user.firstName} ${meeting.organizer.user.lastName}`;

      for (const attendee of meeting.attendees) {
        console.log(`[POST /api/meetings] Sending invitation to ${attendee.employee.user.email}...`);
        await sendMeetingInvitation({
          to: attendee.employee.user.email,
          attendeeName: `${attendee.employee.user.firstName} ${attendee.employee.user.lastName}`,
          meetingTitle: meeting.title,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          organizerName,
          location: meeting.location || undefined,
          zoomJoinUrl: meeting.zoomJoinUrl || undefined,
          agenda: meeting.agenda || undefined,
          meetingType: meeting.meetingType,
          meetingId: meeting.id,
          attendeeId: attendee.id,
        });
        console.log(`[POST /api/meetings] Email sent successfully to ${attendee.employee.user.email}`);
      }
      console.log('[POST /api/meetings] All email invitations sent successfully');
    } catch (emailError) {
      console.error('[POST /api/meetings] Failed to send email invitations:', emailError);
      console.error('[POST /api/meetings] Email error details:', emailError instanceof Error ? emailError.message : 'Unknown error');
      console.error('[POST /api/meetings] Email error stack:', emailError instanceof Error ? emailError.stack : 'No stack');
      // Continue even if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Meeting created successfully',
      meeting,
      warning: zoomErrorMessage, // Include Zoom error if any
    });
  } catch (error) {
    console.error('[POST /api/meetings] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create meeting',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
