import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';

/**
 * GET /api/employee/leave/holidays
 * Fetch holidays for a given date range to display in leave request form
 * and exclude from leave day calculations
 *
 * Query params:
 * - startDate: Start date (YYYY-MM-DD)
 * - endDate: End date (YYYY-MM-DD)
 * - year: Optional year to fetch all holidays for that year
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const yearParam = searchParams.get('year');

    let whereClause: any = {
      tenantId: sessionData.tenantId,
    };

    // If year is provided, get all holidays for that year
    if (yearParam) {
      const year = parseInt(yearParam);
      whereClause.date = {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31, 23, 59, 59),
      };
    }
    // If date range is provided, get holidays in that range
    else if (startDateParam && endDateParam) {
      whereClause.date = {
        gte: new Date(startDateParam),
        lte: new Date(endDateParam),
      };
    }
    // Default: get current year's holidays
    else {
      const currentYear = new Date().getFullYear();
      whereClause.date = {
        gte: new Date(currentYear, 0, 1),
        lte: new Date(currentYear, 11, 31, 23, 59, 59),
      };
    }

    const holidays = await prisma.holiday.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        date: true,
        type: true,
        isOptional: true,
        description: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Transform holidays to a more usable format
    const holidayDates = holidays.map(h => ({
      id: h.id,
      name: h.name,
      date: h.date.toISOString().split('T')[0], // YYYY-MM-DD format
      type: h.type,
      isOptional: h.isOptional,
      description: h.description,
    }));

    // Create a Set of holiday date strings for easy lookup (excluding optional holidays from mandatory count)
    const mandatoryHolidayDates = holidayDates
      .filter(h => !h.isOptional)
      .map(h => h.date);

    return NextResponse.json({
      success: true,
      holidays: holidayDates,
      mandatoryHolidayDates, // Array of YYYY-MM-DD strings for mandatory holidays
      total: holidays.length,
    });
  } catch (error) {
    console.error('Fetch holidays error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch holidays' },
      { status: 500 }
    );
  }
}
