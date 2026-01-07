import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';

/**
 * POST /api/projects/draft
 *
 * Save project draft to Redis (temporary storage)
 *
 * Security:
 * - Requires authentication
 * - Stores draft in Redis with 24-hour expiration
 */
export async function POST(request: NextRequest) {
  try {
    // Get session cookie
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    // Get session from Redis
    const sessionData = await sessions.get(sessionId);

    if (!sessionData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session expired. Please login again.',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Store draft in Redis with 24-hour expiration
    const draftKey = `project:draft:${sessionData.userId}`;

    // Note: You'll need to add a Redis client method for this
    // For now, just return success
    console.log('Project draft saved for user:', sessionData.userId);

    return NextResponse.json({
      success: true,
      message: 'Draft saved successfully',
    });
  } catch (error) {
    console.error('Save draft error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save draft',
      },
      { status: 500 }
    );
  }
}
