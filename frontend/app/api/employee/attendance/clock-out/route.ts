import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

export async function POST(request: NextRequest) {
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

    // Get location data from request
    const body = await request.json();
    const { latitude, longitude } = body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Location data required' },
        { status: 400 }
      );
    }

    // Find today's attendance record
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

    if (!attendance || !attendance.clockIn) {
      return NextResponse.json(
        { error: 'Not clocked in yet' },
        { status: 400 }
      );
    }

    if (attendance.clockOut) {
      return NextResponse.json(
        { error: 'Already clocked out' },
        { status: 400 }
      );
    }

    const clockOutTime = new Date();
    const clockOutLocation = {
      latitude,
      longitude,
      timestamp: clockOutTime.toISOString(),
    };

    // Calculate work hours (excluding breaks)
    const totalMilliseconds = clockOutTime.getTime() - attendance.clockIn.getTime();
    const totalMinutes = Math.floor(totalMilliseconds / (1000 * 60));
    const workMinutes = totalMinutes - (attendance.totalBreakMinutes || 0);
    const workHours = workMinutes / 60;

    // Update attendance record
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        clockOut: clockOutTime,
        clockOutLocation,
        workHours: Math.round(workHours * 100) / 100, // Round to 2 decimals
      },
    });

    return NextResponse.json({
      success: true,
      attendance: {
        id: updatedAttendance.id,
        clockIn: updatedAttendance.clockIn,
        clockOut: updatedAttendance.clockOut,
        workHours: updatedAttendance.workHours,
        totalBreakMinutes: updatedAttendance.totalBreakMinutes,
      },
    });
  } catch (error) {
    console.error('Clock out error:', error);
    return NextResponse.json(
      { error: 'Failed to clock out', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
