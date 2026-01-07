/**
 * GET /api/meetings/[id] - Get meeting details
 * PATCH /api/meetings/[id] - Update meeting
 * DELETE /api/meetings/[id] - Delete/Cancel meeting
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { zoomAPI } from '@/lib/zoom';
import { sendMeetingUpdate, sendMeetingCancellation } from '@/lib/email-service';

export async function GET(
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

    const meeting = await prisma.meeting.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
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
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: 'Meeting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      meeting,
    });
  } catch (error) {
    console.error('[GET /api/meetings/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch meeting',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

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

    const employee = await prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee record not found. Please contact HR to complete your onboarding.' },
        { status: 404 }
      );
    }

    // Verify meeting exists and user is the organizer
    const existingMeeting = await prisma.meeting.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        organizerId: employee.id,
      },
    });

    if (!existingMeeting) {
      return NextResponse.json(
        { success: false, error: 'Meeting not found or you are not the organizer' },
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
      agenda,
      notes,
      actionItems,
      status,
    } = body;

    // Update Zoom meeting if it exists
    if (existingMeeting.zoomMeetingId && (title || startTime || endTime || description)) {
      try {
        const updateData: any = {};
        if (title) updateData.topic = title;
        if (description || agenda) updateData.agenda = description || agenda;
        if (startTime) updateData.start_time = new Date(startTime).toISOString();
        if (startTime && endTime) {
          const duration = Math.round(
            (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60)
          );
          updateData.duration = duration;
        }

        await zoomAPI.updateMeeting(existingMeeting.zoomMeetingId, updateData);
      } catch (zoomError) {
        console.error('Failed to update Zoom meeting:', zoomError);
        // Continue with database update
      }
    }

    // Update meeting
    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(location !== undefined && { location }),
        ...(agenda !== undefined && { agenda }),
        ...(notes !== undefined && { notes }),
        ...(actionItems !== undefined && { actionItems }),
        ...(status && { status }),
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

    return NextResponse.json({
      success: true,
      message: 'Meeting updated successfully',
      meeting,
    });
  } catch (error) {
    console.error('[PATCH /api/meetings/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update meeting',
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

    const employee = await prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee record not found. Please contact HR to complete your onboarding.' },
        { status: 404 }
      );
    }

    // Verify meeting exists and user is the organizer
    const meeting = await prisma.meeting.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        organizerId: employee.id,
      },
      include: {
        organizer: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
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

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: 'Meeting not found or you are not the organizer' },
        { status: 404 }
      );
    }

    // Delete Zoom meeting if it exists
    if (meeting.zoomMeetingId) {
      try {
        await zoomAPI.deleteMeeting(meeting.zoomMeetingId);
      } catch (zoomError) {
        console.error('Failed to delete Zoom meeting:', zoomError);
        // Continue with database deletion
      }
    }

    // Send cancellation emails before deleting
    try {
      const organizerName = `${meeting.organizer.user.firstName} ${meeting.organizer.user.lastName}`;

      for (const attendee of meeting.attendees) {
        await sendMeetingCancellation({
          to: attendee.employee.user.email,
          attendeeName: `${attendee.employee.user.firstName} ${attendee.employee.user.lastName}`,
          meetingTitle: meeting.title,
          startTime: meeting.startTime,
          organizerName,
        });
      }
    } catch (emailError) {
      console.error('Failed to send cancellation emails:', emailError);
      // Continue with deletion even if email fails
    }

    // Delete meeting (attendees will be cascade deleted)
    await prisma.meeting.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Meeting cancelled successfully',
    });
  } catch (error) {
    console.error('[DELETE /api/meetings/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cancel meeting',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
