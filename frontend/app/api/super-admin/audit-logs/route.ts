import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/super-admin-helpers';

/**
 * GET /api/super-admin/audit-logs
 * List all audit logs across all tenants (super admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action') || '';
    const entityType = searchParams.get('entityType') || '';
    const success = searchParams.get('success');

    const where: any = {};

    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (success !== null && success !== '') {
      where.success = success === 'true';
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Fetch user names for logs that have userId
    const userIds = logs.filter((log) => log.userId).map((log) => log.userId as string);
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Format logs with user info
    const formattedLogs = logs.map((log) => {
      const user = log.userId ? userMap.get(log.userId) : null;
      return {
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        userId: log.userId,
        userName: user?.name || 'System',
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        metadata: log.metadata,
        success: log.success ?? true,
        createdAt: log.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[Super Admin] Get audit logs error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch audit logs',
      },
      { status: error.message === 'Not authenticated' ? 401 : error.message === 'Super admin access required' ? 403 : 500 }
    );
  }
}
