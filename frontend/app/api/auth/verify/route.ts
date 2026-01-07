import { NextRequest, NextResponse } from 'next/server';
import { magicLinks } from '@/lib/redis';

/**
 * GET /api/auth/verify?token=xxx
 *
 * Get magic link details for auto-filling verification code
 *
 * This endpoint is called when user clicks the magic link in their email.
 * It returns the token and email (for display), but NOT the code itself.
 * The frontend will use this token to submit the verification with the code.
 *
 * Security:
 * - Only returns non-sensitive data (email for display)
 * - Does NOT return the actual code (user must enter it)
 * - Checks if token is valid and not expired
 * - Does NOT consume the token (can be verified later)
 *
 * Flow:
 * 1. Extract token from query params
 * 2. Get magic link from Redis
 * 3. Return email and token status (not the code)
 * 4. Frontend displays verification form with email pre-filled
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing verification token',
        },
        { status: 400 }
      );
    }

    // Get magic link from Redis
    console.log('[verify] Checking token:', token.substring(0, 10) + '...');
    const magicLink = await magicLinks.get(token);
    console.log('[verify] Magic link found:', !!magicLink, magicLink ? 'Email: ' + magicLink.email : 'Not found');

    if (!magicLink) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired verification link',
          expired: true,
        },
        { status: 400 }
      );
    }

    // Return token status (NOT the actual code)
    return NextResponse.json(
      {
        success: true,
        token,
        email: magicLink.email,
        expiresAt: magicLink.expiresAt,
        attemptsRemaining: Math.max(0, 5 - magicLink.attempts),
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Verify token error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred. Please try again.'
      },
      { status: 500 }
    );
  }
}

// Prevent POST requests (this endpoint is GET only for magic link clicks)
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use GET.' },
    { status: 405 }
  );
}
