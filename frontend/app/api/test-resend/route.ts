import { NextRequest, NextResponse } from 'next/server';
import { testResendConfiguration } from '@/lib/resend-email';

/**
 * GET /api/test-resend?email=your@email.com
 * Test Resend email configuration
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const testEmail = searchParams.get('email');

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Email parameter is required. Usage: /api/test-resend?email=your@email.com' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.log('[Test Resend] Sending test email to:', testEmail);

    const success = await testResendConfiguration(testEmail);

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}. Check your inbox!`,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send test email. Check server logs for details.',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Test Resend] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
