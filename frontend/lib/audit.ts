/**
 * Audit Logging Utilities for Zenora.ai
 * Comprehensive event tracking for security, compliance, and debugging
 *
 * EVENT TYPES:
 * - auth: Authentication events (login, logout, code requests)
 * - admin: Administrative actions (employee creation, role changes)
 * - security: Security events (suspicious activity, rate limit exceeded)
 * - session: Session management events
 * - employee: Employee-related events
 * - system: System events
 */

import { prisma } from './prisma';

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

export interface AuditLogData {
  tenantId: string;
  userId?: string;
  eventType: string;
  action: string;
  entityType?: string;
  entityId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  success?: boolean;
  errorMessage?: string;
}

// ============================================================================
// AUDIT LOG FUNCTIONS
// ============================================================================

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        eventType: data.eventType,
        action: data.action,
        entityType: data.entityType || 'system',
        entityId: data.entityId || data.userId || 'system',
        changes: data.changes ? JSON.parse(JSON.stringify(data.changes)) : null,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        deviceFingerprint: data.deviceFingerprint,
        success: data.success !== undefined ? data.success : true,
        errorMessage: data.errorMessage,
      },
    });

    // Log to console for debugging (redact sensitive data)
    console.log('[Audit]', {
      eventType: data.eventType,
      action: data.action,
      userId: data.userId,
      entityType: data.entityType,
      entityId: data.entityId,
      success: data.success !== undefined ? data.success : true,
      // Don't log full metadata/changes to avoid leaking sensitive data
    });
  } catch (error) {
    console.error('[Audit] Failed to create audit log:', error);
    // Don't throw - audit logging should never break the main flow
  }
}

// ============================================================================
// AUTHENTICATION EVENTS
// ============================================================================

/**
 * Log: auth.code.requested
 */
export async function logCodeRequested(data: {
  userId: string;
  tenantId: string;
  email: string;
  ipAddress: string;
  userAgent: string;
}): Promise<void> {
  await createAuditLog({
    tenantId: data.tenantId,
    userId: data.userId,
    eventType: 'auth',
    action: 'code.requested',
    entityType: 'user',
    entityId: data.userId,
    metadata: {
      email: data.email.replace(/(.{3}).*(@.*)/, '$1***$2'), // Redact email
      // NEVER log the actual code
    },
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    success: true,
  });
}

/**
 * Log: auth.code.sent
 */
export async function logCodeSent(
  tenantId: string,
  userId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    tenantId,
    userId,
    eventType: 'auth',
    action: 'code.sent',
    metadata: {
      email: email.replace(/(.{3}).*(@.*)/, '$1***$2'), // Redact email
    },
    ipAddress,
    userAgent,
    success: true,
  });
}

/**
 * Log: auth.login.success
 */
export async function logLoginSuccess(data: {
  userId: string;
  tenantId: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
}): Promise<void> {
  await createAuditLog({
    tenantId: data.tenantId,
    userId: data.userId,
    eventType: 'auth',
    action: 'login.success',
    metadata: {
      email: data.email.replace(/(.{3}).*(@.*)/, '$1***$2'), // Redact email
    },
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    deviceFingerprint: data.deviceFingerprint,
    success: true,
  });
}

/**
 * Log: auth.login.failed
 */
export async function logLoginFailed(data: {
  userId?: string;
  tenantId?: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  reason: string;
}): Promise<void> {
  await createAuditLog({
    tenantId: data.tenantId || '',
    userId: data.userId,
    eventType: 'auth',
    action: 'login.failed',
    metadata: {
      email: data.email.replace(/(.{3}).*(@.*)/, '$1***$2'), // Redact email
      reason: data.reason,
    },
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    success: false,
    errorMessage: data.reason,
  });
}

/**
 * Log: auth.logout
 */
export async function logLogout(data: {
  userId: string;
  tenantId: string;
  email: string;
  ipAddress: string;
  userAgent: string;
}): Promise<void> {
  await createAuditLog({
    tenantId: data.tenantId,
    userId: data.userId,
    eventType: 'auth',
    action: 'logout',
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    success: true,
  });
}

// ============================================================================
// ADMIN EVENTS
// ============================================================================

/**
 * Log: admin.employee.created
 */
export async function logEmployeeCreated(data: {
  userId: string;
  tenantId: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  newEmployeeId: string;
  newEmployeeEmail: string;
  newEmployeeNumber: string;
}): Promise<void> {
  await createAuditLog({
    tenantId: data.tenantId,
    userId: data.userId,
    eventType: 'admin',
    action: 'employee.created',
    entityType: 'Employee',
    entityId: data.newEmployeeId,
    metadata: {
      email: data.newEmployeeEmail.replace(/(.{3}).*(@.*)/, '$1***$2'),
      employeeNumber: data.newEmployeeNumber,
      performedBy: data.email.replace(/(.{3}).*(@.*)/, '$1***$2'),
    },
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    success: true,
  });
}

/**
 * Log: admin.employees.imported
 */
export async function logEmployeesImported(data: {
  userId: string;
  tenantId: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  employeeCount: number;
  employeeEmails: string[];
}): Promise<void> {
  await createAuditLog({
    tenantId: data.tenantId,
    userId: data.userId,
    eventType: 'admin',
    action: 'employees.imported',
    metadata: {
      count: data.employeeCount,
      emails: data.employeeEmails.map(e => e.replace(/(.{3}).*(@.*)/, '$1***$2')),
      performedBy: data.email.replace(/(.{3}).*(@.*)/, '$1***$2'),
    },
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    success: true,
  });
}

/**
 * Log: admin.employee.deactivated
 */
export async function logEmployeeDeactivated(data: {
  userId: string;
  tenantId: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  targetEmployeeId: string;
  targetUserId: string;
  targetEmail: string;
  reason?: string;
}): Promise<void> {
  await createAuditLog({
    tenantId: data.tenantId,
    userId: data.userId,
    eventType: 'admin',
    action: 'employee.deactivated',
    entityType: 'Employee',
    entityId: data.targetEmployeeId,
    metadata: {
      targetUserId: data.targetUserId,
      targetEmail: data.targetEmail.replace(/(.{3}).*(@.*)/, '$1***$2'),
      performedBy: data.email.replace(/(.{3}).*(@.*)/, '$1***$2'),
      reason: data.reason,
    },
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    success: true,
  });
}

/**
 * Log: admin.employee.status.changed
 */
export async function logEmployeeStatusChanged(
  tenantId: string,
  adminUserId: string,
  employeeUserId: string,
  oldStatus: string,
  newStatus: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    tenantId,
    userId: adminUserId,
    eventType: 'admin',
    action: 'employee.status.changed',
    entityType: 'User',
    entityId: employeeUserId,
    changes: {
      status: {
        from: oldStatus,
        to: newStatus,
      },
    },
    ipAddress,
    userAgent,
    success: true,
  });
}

/**
 * Log: admin.employee.role.changed
 */
export async function logEmployeeRoleChanged(
  tenantId: string,
  adminUserId: string,
  employeeUserId: string,
  oldRole: string,
  newRole: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    tenantId,
    userId: adminUserId,
    eventType: 'admin',
    action: 'employee.role.changed',
    entityType: 'User',
    entityId: employeeUserId,
    changes: {
      role: {
        from: oldRole,
        to: newRole,
      },
    },
    ipAddress,
    userAgent,
    success: true,
  });
}

// ============================================================================
// SESSION EVENTS
// ============================================================================

/**
 * Log: session.created
 */
export async function logSessionCreated(
  tenantId: string,
  userId: string,
  sessionId: string,
  ipAddress?: string,
  userAgent?: string,
  deviceFingerprint?: string
): Promise<void> {
  await createAuditLog({
    tenantId,
    userId,
    eventType: 'session',
    action: 'created',
    entityType: 'Session',
    entityId: sessionId,
    ipAddress,
    userAgent,
    deviceFingerprint,
    success: true,
  });
}

/**
 * Log: session.expired
 */
export async function logSessionExpired(
  tenantId: string,
  userId: string,
  sessionId: string
): Promise<void> {
  await createAuditLog({
    tenantId,
    userId,
    eventType: 'session',
    action: 'expired',
    entityType: 'Session',
    entityId: sessionId,
    success: true,
  });
}

/**
 * Log: session.revoked
 */
export async function logSessionRevoked(
  tenantId: string,
  userId: string,
  sessionId: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    tenantId,
    userId,
    eventType: 'session',
    action: 'revoked',
    entityType: 'Session',
    entityId: sessionId,
    metadata: {
      reason,
    },
    ipAddress,
    userAgent,
    success: true,
  });
}

// ============================================================================
// SECURITY EVENTS
// ============================================================================

/**
 * Log: security.suspicious
 */
export async function logSuspiciousActivity(data: {
  userId?: string;
  tenantId?: string;
  email?: string;
  ipAddress: string;
  userAgent: string;
  activityType: string;
  details?: any;
}): Promise<void> {
  await createAuditLog({
    tenantId: data.tenantId || '',
    userId: data.userId,
    eventType: 'security',
    action: 'suspicious',
    metadata: {
      activityType: data.activityType,
      email: data.email ? data.email.replace(/(.{3}).*(@.*)/, '$1***$2') : undefined,
      details: data.details,
    },
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    success: false,
  });
}

/**
 * Log: security.rate_limit.exceeded
 */
export async function logRateLimitExceeded(data: {
  email?: string;
  ipAddress: string;
  userAgent: string;
  rateLimitType: string;
  attemptsInWindow: number;
  windowSeconds: number;
}): Promise<void> {
  await createAuditLog({
    tenantId: '',
    eventType: 'security',
    action: 'rate_limit.exceeded',
    metadata: {
      email: data.email ? data.email.replace(/(.{3}).*(@.*)/, '$1***$2') : undefined,
      rateLimitType: data.rateLimitType,
      attemptsInWindow: data.attemptsInWindow,
      windowSeconds: data.windowSeconds,
    },
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    success: false,
    errorMessage: 'Rate limit exceeded',
  });
}

/**
 * Log: security.unauthorized_access
 */
export async function logUnauthorizedAccess(
  tenantId: string,
  userId: string | undefined,
  resource: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    tenantId,
    userId,
    eventType: 'security',
    action: 'unauthorized_access',
    metadata: {
      resource,
    },
    ipAddress,
    userAgent,
    success: false,
    errorMessage: 'Unauthorized access attempt',
  });
}

/**
 * Log: security.invalid_token
 */
export async function logInvalidToken(
  tenantId: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createAuditLog({
    tenantId,
    eventType: 'security',
    action: 'invalid_token',
    metadata: {
      reason,
    },
    ipAddress,
    userAgent,
    success: false,
    errorMessage: reason,
  });
}

/**
 * Log: employee.reactivated
 */
export async function logEmployeeReactivated(data: {
  userId: string;
  tenantId: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  targetEmployeeId: string;
  targetUserId: string;
  targetEmail: string;
}): Promise<void> {
  await createAuditLog({
    tenantId: data.tenantId,
    userId: data.userId,
    eventType: 'employee',
    action: 'employee.reactivated',
    entityType: 'employee',
    entityId: data.targetEmployeeId,
    metadata: {
      targetUserId: data.targetUserId,
      targetEmail: data.targetEmail.replace(/(.{3}).*(@.*)/, '$1***$2'),
      performedBy: data.email.replace(/(.{3}).*(@.*)/, '$1***$2'),
    },
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });
}

/**
 * Log: employee.suspended
 */
export async function logEmployeeSuspended(data: {
  userId: string;
  tenantId: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  targetEmployeeId: string;
  targetUserId: string;
  targetEmail: string;
  reason?: string;
}): Promise<void> {
  await createAuditLog({
    tenantId: data.tenantId,
    userId: data.userId,
    eventType: 'employee',
    action: 'employee.suspended',
    entityType: 'employee',
    entityId: data.targetEmployeeId,
    metadata: {
      targetUserId: data.targetUserId,
      targetEmail: data.targetEmail.replace(/(.{3}).*(@.*)/, '$1***$2'),
      performedBy: data.email.replace(/(.{3}).*(@.*)/, '$1***$2'),
      reason: data.reason,
    },
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get recent audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 50
): Promise<any[]> {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get recent audit logs for a tenant
 */
export async function getTenantAuditLogs(
  tenantId: string,
  filters?: {
    eventType?: string;
    action?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  },
  limit: number = 100
): Promise<any[]> {
  return prisma.auditLog.findMany({
    where: {
      tenantId,
      ...(filters?.eventType && { eventType: filters.eventType }),
      ...(filters?.action && { action: filters.action }),
      ...(filters?.userId && { userId: filters.userId }),
      ...(filters?.startDate && {
        createdAt: {
          gte: filters.startDate,
          ...(filters?.endDate && { lte: filters.endDate }),
        },
      }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get failed login attempts for an email
 */
export async function getFailedLoginAttempts(
  tenantId: string,
  email: string,
  since: Date
): Promise<number> {
  const count = await prisma.auditLog.count({
    where: {
      tenantId,
      eventType: 'auth',
      action: 'login.failed',
      metadata: {
        path: ['email'],
        string_contains: email.substring(0, 3), // Partial match on redacted email
      },
      createdAt: {
        gte: since,
      },
    },
  });

  return count;
}
