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

    // Check if already clocked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (existingAttendance && existingAttendance.clockIn) {
      return NextResponse.json(
        { error: 'Already clocked in today' },
        { status: 400 }
      );
    }

    const clockInTime = new Date();
    const clockInLocation = {
      latitude,
      longitude,
      timestamp: clockInTime.toISOString(),
    };

    // Create or update attendance record
    const attendance = existingAttendance
      ? await prisma.attendance.update({
          where: { id: existingAttendance.id },
          data: {
            clockIn: clockInTime,
            clockInLocation,
          },
        })
      : await prisma.attendance.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            date: today,
            clockIn: clockInTime,
            clockInLocation,
            status: 'PRESENT',
          },
        });

    return NextResponse.json({
      success: true,
      attendance: {
        id: attendance.id,
        clockIn: attendance.clockIn,
        clockInLocation: attendance.clockInLocation,
      },
    });
  } catch (error) {
    console.error('Clock in error:', error);
    return NextResponse.json(
      { error: 'Failed to clock in', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
