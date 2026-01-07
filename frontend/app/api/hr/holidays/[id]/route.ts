import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { z } from 'zod';

const updateHolidaySchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date').optional(),
  type: z.enum(['PUBLIC', 'COMPANY', 'REGIONAL', 'RELIGIOUS', 'OPTIONAL']).optional(),
  isOptional: z.boolean().optional(),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
});

/**
 * GET /api/hr/holidays/[id]
 * Get a single holiday by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const holiday = await prisma.holiday.findFirst({
      where: {
        id,
        tenantId: sessionData.tenantId,
      },
    });

    if (!holiday) {
      return NextResponse.json(
        { success: false, error: 'Holiday not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: holiday,
    });
  } catch (error) {
    console.error('Fetch holiday error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch holiday' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/hr/holidays/[id]
 * Update a holiday
 * Only HR and ADMIN can update holidays
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Check if holiday exists and belongs to tenant
    const existing = await prisma.holiday.findFirst({
      where: {
        id,
        tenantId: sessionData.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Holiday not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = updateHolidaySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const updateData: any = {};
    const { name, date, type, isOptional, description, location } = validation.data;

    if (name !== undefined) updateData.name = name;
    if (date !== undefined) updateData.date = new Date(date);
    if (type !== undefined) updateData.type = type;
    if (isOptional !== undefined) updateData.isOptional = isOptional;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;

    // Check for duplicate if name or date is being changed
    if (name || date) {
      const duplicate = await prisma.holiday.findFirst({
        where: {
          tenantId: sessionData.tenantId,
          date: date ? new Date(date) : existing.date,
          name: name || existing.name,
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { success: false, error: 'A holiday with this name and date already exists' },
          { status: 409 }
        );
      }
    }

    const holiday = await prisma.holiday.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: holiday,
      message: 'Holiday updated successfully',
    });
  } catch (error) {
    console.error('Update holiday error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update holiday' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/hr/holidays/[id]
 * Delete a holiday
 * Only HR and ADMIN can delete holidays
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Check if holiday exists and belongs to tenant
    const existing = await prisma.holiday.findFirst({
      where: {
        id,
        tenantId: sessionData.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Holiday not found' },
        { status: 404 }
      );
    }

    await prisma.holiday.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Holiday deleted successfully',
    });
  } catch (error) {
    console.error('Delete holiday error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete holiday' },
      { status: 500 }
    );
  }
}
