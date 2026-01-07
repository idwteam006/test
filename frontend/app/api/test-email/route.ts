import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/resend-email';

/**
 * POST /api/test-email
 * 
 * Test endpoint to send a welcome email
 * 
 * Body: {
 *   email: string,
 *   firstName: string,
 *   companyName: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, companyName } = body;

    if (!email || !firstName || !companyName) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: email, firstName, companyName' 
        },
        { status: 400 }
      );
    }

    console.log(`Sending test email to ${email}...`);

    const success = await sendWelcomeEmail(email, firstName, companyName);

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Welcome email sent successfully to ${email}`,
        details: {
          to: email,
          firstName,
          companyName,
          template: 'Welcome Email',
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email. Check Resend API configuration.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Test email error:', error);
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
