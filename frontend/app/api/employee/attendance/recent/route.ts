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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Fetch recent attendance records
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: limit,
    });

    // Calculate statistics
    const stats = {
      totalDays: attendanceRecords.length,
      present: attendanceRecords.filter((a) => a.status === 'PRESENT' || a.status === 'WORK_FROM_HOME').length,
      absent: attendanceRecords.filter((a) => a.status === 'ABSENT').length,
      late: attendanceRecords.filter((a) => a.status === 'LATE').length,
      workFromHome: attendanceRecords.filter((a) => a.status === 'WORK_FROM_HOME').length,
      totalHours: attendanceRecords.reduce((sum, a) => sum + (a.workHours || 0), 0),
      avgHoursPerDay: 0,
    };

    if (stats.present > 0) {
      stats.avgHoursPerDay = Math.round((stats.totalHours / stats.present) * 100) / 100;
    }

    return NextResponse.json({
      success: true,
      attendance: attendanceRecords.map((a) => ({
        id: a.id,
        date: a.date,
        clockIn: a.clockIn,
        clockOut: a.clockOut,
        status: a.status,
        workHours: a.workHours,
        totalBreakMinutes: a.totalBreakMinutes,
      })),
      stats,
    });
  } catch (error) {
    console.error('Fetch recent attendance error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
