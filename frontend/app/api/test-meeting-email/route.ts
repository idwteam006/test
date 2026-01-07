/**
 * Test endpoint for sending meeting invitation emails
 * GET /api/test-meeting-email?to=email@example.com
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendMeetingInvitation } from '@/lib/email-service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const to = searchParams.get('to');

    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Email address required. Use ?to=email@example.com' },
        { status: 400 }
      );
    }

    // Test meeting data
    const testMeetingData = {
      to,
      attendeeName: 'Test User',
      meetingTitle: 'Zoom Integration Test Meeting',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // Tomorrow + 1 hour
      organizerName: 'Vijay N',
      location: 'Zoom',
      zoomJoinUrl: 'https://zoom.us/j/1234567890?pwd=test123',
      agenda: 'This is a test email to verify Zoom meeting invitation functionality.',
      meetingType: 'ONE_ON_ONE',
      meetingId: 'test-meeting-id',
      attendeeId: 'test-attendee-id',
    };

    console.log('[GET /api/test-meeting-email] Sending test email to:', to);

    await sendMeetingInvitation(testMeetingData);

    return NextResponse.json({
      success: true,
      message: `Test meeting invitation email sent to ${to}`,
      testData: {
        ...testMeetingData,
        startTime: testMeetingData.startTime.toISOString(),
        endTime: testMeetingData.endTime.toISOString(),
      },
    });
  } catch (error) {
    console.error('[GET /api/test-meeting-email] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
