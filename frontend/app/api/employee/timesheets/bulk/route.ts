import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData?.userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { entries } = body;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'No entries provided' }, { status: 400 });
    }

    // Create all entries
    const createdEntries = await Promise.all(
      entries.map(async (entry: any) => {
        return prisma.timesheetEntry.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            projectId: entry.projectId || null,
            taskId: entry.taskId || null,
            workDate: new Date(entry.workDate),
            startTime: entry.startTime || null,
            endTime: entry.endTime || null,
            breakHours: entry.breakHours || 0,
            hoursWorked: entry.hoursWorked,
            description: entry.description,
            activityType: entry.activityType || null,
            isBillable: entry.isBillable !== undefined ? entry.isBillable : true,
            workType: entry.workType || 'REGULAR',
            status: 'DRAFT',
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      message: `${createdEntries.length} entries created`,
      entries: createdEntries.map(entry => ({
        ...entry,
        workDate: entry.workDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD
      })),
      count: createdEntries.length,
    });
  } catch (error) {
    console.error('Bulk create timesheets error:', error);
    return NextResponse.json({ error: 'Failed to create bulk entries' }, { status: 500 });
  }
}
