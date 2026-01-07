import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { getCachedData, invalidateCacheKey, CacheKeys, CacheTTL } from '@/lib/cache';

// Validation schema
const DepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(100),
});

/**
 * GET /api/admin/departments
 * Fetch all departments for the tenant
 * Uses Redis caching for improved performance (10 min TTL)
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

    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    const tenantId = sessionData.tenantId;

    // Use cached data if available, otherwise fetch and cache
    const departments = await getCachedData(
      CacheKeys.departments(tenantId),
      async () => {
        return prisma.department.findMany({
          where: {
            tenantId,
          },
          include: {
            _count: {
              select: {
                employees: true,
                users: true,
              }
            }
          },
          orderBy: {
            name: 'asc',
          },
        });
      },
      CacheTTL.DEPARTMENTS
    );

    return NextResponse.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error('Fetch departments error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch departments',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/departments
 * Create a new department
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

    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (sessionData.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = DepartmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input data',
          details: validation.error.format()
        },
        { status: 400 }
      );
    }

    const { name } = validation.data;

    // Check if department already exists
    const existing = await prisma.department.findFirst({
      where: {
        tenantId: sessionData.tenantId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'A department with this name already exists'
        },
        { status: 409 }
      );
    }

    // Create department
    const department = await prisma.department.create({
      data: {
        name,
        tenantId: sessionData.tenantId,
      },
      include: {
        _count: {
          select: {
            employees: true,
            users: true,
          }
        }
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: sessionData.userId,
        tenantId: sessionData.tenantId,
        action: 'department.created',
        entityType: 'Department',
        entityId: department.id,
        changes: {
          name,
          createdBy: sessionData.email,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    });

    // Invalidate departments cache
    await invalidateCacheKey(CacheKeys.departments(sessionData.tenantId));

    return NextResponse.json(
      {
        success: true,
        message: 'Department created successfully',
        data: department,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Create department error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create department',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
