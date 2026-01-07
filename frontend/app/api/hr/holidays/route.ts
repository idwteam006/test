import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { z } from 'zod';

// Validation schemas
const createHolidaySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  type: z.enum(['PUBLIC', 'COMPANY', 'REGIONAL', 'RELIGIOUS', 'OPTIONAL']).default('PUBLIC'),
  isOptional: z.boolean().default(false),
  description: z.string().optional(),
  location: z.string().optional(),
});

const bulkCreateSchema = z.object({
  holidays: z.array(createHolidaySchema),
});

/**
 * GET /api/hr/holidays
 * Fetch holidays for the tenant
 * Query params:
 * - year: Filter by year (defaults to current year)
 * - type: Filter by holiday type
 * - location: Filter by location
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
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();
    const typeFilter = searchParams.get('type');
    const locationFilter = searchParams.get('location');

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const where: any = {
      tenantId: sessionData.tenantId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (typeFilter) {
      where.type = typeFilter;
    }

    if (locationFilter) {
      where.location = locationFilter;
    }

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: {
        date: 'asc',
      },
    });

    // Get unique locations for filter dropdown
    const locations = await prisma.holiday.findMany({
      where: {
        tenantId: sessionData.tenantId,
        location: { not: null },
      },
      select: {
        location: true,
      },
      distinct: ['location'],
    });

    return NextResponse.json({
      success: true,
      data: holidays,
      total: holidays.length,
      year,
      locations: locations.map(l => l.location).filter(Boolean),
    });
  } catch (error) {
    console.error('Fetch holidays error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch holidays' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hr/holidays
 * Create a new holiday or bulk create holidays
 * Only HR and ADMIN can create holidays
 */
export async function POST(request: NextRequest) {
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

    // Check permissions
    if (!['ADMIN', 'HR'].includes(sessionData.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. HR or Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Check if it's a bulk create request
    if (body.holidays && Array.isArray(body.holidays)) {
      const validation = bulkCreateSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: 'Validation failed', details: validation.error.flatten() },
          { status: 400 }
        );
      }

      const holidaysData = validation.data.holidays.map(h => ({
        tenantId: sessionData.tenantId,
        name: h.name,
        date: new Date(h.date),
        type: h.type,
        isOptional: h.isOptional,
        description: h.description || null,
        location: h.location || null,
      }));

      const created = await prisma.holiday.createMany({
        data: holidaysData,
        skipDuplicates: true,
      });

      return NextResponse.json({
        success: true,
        message: `${created.count} holidays created successfully`,
        count: created.count,
      });
    }

    // Single holiday create
    const validation = createHolidaySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { name, date, type, isOptional, description, location } = validation.data;

    // Check for duplicate
    const existing = await prisma.holiday.findFirst({
      where: {
        tenantId: sessionData.tenantId,
        date: new Date(date),
        name,
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A holiday with this name and date already exists' },
        { status: 409 }
      );
    }

    const holiday = await prisma.holiday.create({
      data: {
        tenantId: sessionData.tenantId,
        name,
        date: new Date(date),
        type,
        isOptional,
        description: description || null,
        location: location || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: holiday,
      message: 'Holiday created successfully',
    });
  } catch (error) {
    console.error('Create holiday error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create holiday' },
      { status: 500 }
    );
  }
}
