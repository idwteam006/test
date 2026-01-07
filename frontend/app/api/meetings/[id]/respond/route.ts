/**
 * POST /api/meetings/[id]/respond - Respond to meeting invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

export async function POST(
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

    const body = await request.json();
    const { response } = body; // ACCEPTED, DECLINED, TENTATIVE

    if (!['ACCEPTED', 'DECLINED', 'TENTATIVE'].includes(response)) {
      return NextResponse.json(
        { success: false, error: 'Invalid response. Must be ACCEPTED, DECLINED, or TENTATIVE' },
        { status: 400 }
      );
    }

    // Find attendee record
    const attendee = await prisma.meetingAttendee.findFirst({
      where: {
        meetingId: id,
        employeeId: employee.id,
      },
      include: {
        meeting: {
          select: {
            tenantId: true,
            title: true,
          },
        },
      },
    });

    if (!attendee) {
      return NextResponse.json(
        { success: false, error: 'You are not invited to this meeting' },
        { status: 404 }
      );
    }

    if (attendee.meeting.tenantId !== user.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update response
    const updatedAttendee = await prisma.meetingAttendee.update({
      where: { id: attendee.id },
      data: {
        responseStatus: response,
        respondedAt: new Date(),
      },
    });

    // TODO: Notify organizer of response

    return NextResponse.json({
      success: true,
      message: `Meeting invitation ${response.toLowerCase()}`,
      attendee: updatedAttendee,
    });
  } catch (error) {
    console.error('[POST /api/meetings/[id]/respond] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to respond to meeting invitation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
