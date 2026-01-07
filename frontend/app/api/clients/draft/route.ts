import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions, redis } from '@/lib/redis';

/**
 * POST /api/clients/draft
 * Save client as draft (stores in Redis temporarily)
 */
export async function POST(request: NextRequest) {
  try {
    // Get session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get session data
    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const userId = sessionData.userId;

    // Store draft in Redis with 24 hour expiry
    const draftKey = `client_draft:${userId}`;
    const redisClient = redis();
    await redisClient.setex(draftKey, 86400, JSON.stringify(body)); // 24 hours

    return NextResponse.json({
      success: true,
      message: 'Draft saved successfully',
    });
  } catch (error) {
    console.error('Save draft error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save draft' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/clients/draft
 * Retrieve saved draft
 */
export async function GET(request: NextRequest) {
  try {
    // Get session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get session data
    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    const userId = sessionData.userId;
    const draftKey = `client_draft:${userId}`;
    const redisClient = redis();

    const draft = await redisClient.get(draftKey);

    if (!draft) {
      return NextResponse.json({
        success: true,
        draft: null,
      });
    }

    return NextResponse.json({
      success: true,
      draft: JSON.parse(draft),
    });
  } catch (error) {
    console.error('Get draft error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve draft' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clients/draft
 * Clear saved draft
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get session data
    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    const userId = sessionData.userId;
    const draftKey = `client_draft:${userId}`;
    const redisClient = redis();

    await redisClient.del(draftKey);

    return NextResponse.json({
      success: true,
      message: 'Draft cleared',
    });
  } catch (error) {
    console.error('Delete draft error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear draft' },
      { status: 500 }
    );
  }
}
