/**
 * Audit Trail Logger
 *
 * Logs all important actions for compliance (IT Act - 7 year retention)
 *
 * Usage:
 * ```ts
 * await logAudit({
 *   tenantId,
 *   userId,
 *   userEmail,
 *   action: 'ONBOARDING_SUBMITTED',
 *   entity: 'OnboardingInvite',
 *   entityId: invite.id,
 *   changes: { status: { from: 'IN_PROGRESS', to: 'SUBMITTED' } },
 *   ipAddress: req.ip,
 *   userAgent: req.headers['user-agent'],
 * });
 * ```
 */

import { prisma } from '@/lib/prisma';

export type AuditAction =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_ACTIVATED'
  | 'USER_DEACTIVATED'
  | 'USER_DELETED'
  | 'ONBOARDING_INVITED'
  | 'ONBOARDING_STARTED'
  | 'ONBOARDING_DRAFT_SAVED'
  | 'ONBOARDING_SUBMITTED'
  | 'ONBOARDING_APPROVED'
  | 'ONBOARDING_REJECTED'
  | 'ONBOARDING_CHANGES_REQUESTED'
  | 'ONBOARDING_REMINDER_SENT'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PASSWORD_CHANGED'
  | 'PROFILE_VIEWED'
  | 'DOCUMENT_DOWNLOADED'
  | 'DOCUMENT_UPLOADED'
  | 'SENSITIVE_DATA_ACCESSED'
  | 'SETTINGS_CHANGED'
  | 'PERMISSION_MODIFIED'
  | 'ROLE_ASSIGNED'
  | 'DEPARTMENT_CREATED'
  | 'DEPARTMENT_UPDATED';

export interface LogAuditOptions {
  tenantId: string;
  userId?: string;
  userEmail: string;
  userName?: string;
  userRole?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit trail entry
 * Automatically sets retention period to 7 years from now
 */
export async function logAudit(options: LogAuditOptions): Promise<void> {
  try {
    // Calculate retention until date (7 years from now)
    const retentionUntil = new Date();
    retentionUntil.setFullYear(retentionUntil.getFullYear() + 7);

    // NOTE: This will fail until AuditLog model is added to schema
    // Uncomment when schema is updated
    /*
    await prisma.auditLog.create({
      data: {
        tenantId: options.tenantId,
        userId: options.userId,
        userEmail: options.userEmail,
        userName: options.userName,
        userRole: options.userRole,
        action: options.action,
        entity: options.entity,
        entityId: options.entityId,
        changes: options.changes as any,
        metadata: options.metadata as any,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        retentionUntil,
      },
    });
    */

    // Temporary: Log to console until schema is updated
    console.log('[Audit]', {
      timestamp: new Date().toISOString(),
      ...options,
      retentionUntil: retentionUntil.toISOString(),
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('[Audit] Failed to log audit trail:', error);
  }
}

/**
 * Get audit logs for an entity
 */
export async function getAuditLogs(
  tenantId: string,
  entity: string,
  entityId: string
): Promise<any[]> {
  try {
    // NOTE: Uncomment when schema is updated
    /*
    return await prisma.auditLog.findMany({
      where: {
        tenantId,
        entity,
        entityId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    */

    return [];
  } catch (error) {
    console.error('[Audit] Failed to fetch audit logs:', error);
    return [];
  }
}

/**
 * Clean up expired audit logs
 * Run this as a cron job daily
 */
export async function cleanupExpiredAuditLogs(): Promise<number> {
  try {
    // NOTE: Uncomment when schema is updated
    /*
    const result = await prisma.auditLog.deleteMany({
      where: {
        retentionUntil: {
          lt: new Date(),
        },
      },
    });

    console.log(`[Audit] Cleaned up ${result.count} expired audit logs`);
    return result.count;
    */

    return 0;
  } catch (error) {
    console.error('[Audit] Failed to cleanup audit logs:', error);
    return 0;
  }
}

/**
 * Helper function to extract IP from Next.js request
 */
export function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return undefined;
}

/**
 * Helper function to get user agent
 */
export function getUserAgent(request: Request): string | undefined {
  return request.headers.get('user-agent') || undefined;
}
