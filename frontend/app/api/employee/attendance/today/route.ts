import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    // Get session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sessionData = await sessions.get(sessionId);

    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        id: true,
        tenantId: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (!attendance) {
      return NextResponse.json({
        success: true,
        attendance: null,
      });
    }

    return NextResponse.json({
      success: true,
      attendance: {
        id: attendance.id,
        date: attendance.date,
        clockIn: attendance.clockIn,
        clockOut: attendance.clockOut,
        breakStartTime: attendance.breakStartTime,
        breakEndTime: attendance.breakEndTime,
        totalBreakMinutes: attendance.totalBreakMinutes,
        status: attendance.status,
        workHours: attendance.workHours,
        clockInLocation: attendance.clockInLocation,
        clockOutLocation: attendance.clockOutLocation,
      },
    });
  } catch (error) {
    console.error('Fetch today attendance error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
