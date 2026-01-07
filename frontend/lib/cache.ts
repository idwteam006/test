/**
 * Redis Caching Utility Layer
 * Provides high-level caching functions with automatic fallback
 *
 * Works with both Upstash Redis and ioredis seamlessly.
 * Upstash is preferred for serverless environments (Vercel).
 */

import getRedisClient from './redis';

/**
 * Get cached data or fetch and cache if not available
 * @param key - Cache key
 * @param fetcher - Function to fetch data if not cached
 * @param ttl - Time to live in seconds (default: 300 = 5 minutes)
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  const redis = getRedisClient();

  // If Redis is not available, just fetch the data
  if (!redis) {
    console.warn('[Cache] Redis not available, fetching data directly');
    return fetcher();
  }

  try {
    // Try to get from cache
    const cached = await redis.get(key);
    if (cached) {
      console.log(`[Cache] HIT: ${key}`);
      // Handle both string and object responses (Upstash may return parsed JSON)
      return (typeof cached === 'string' ? JSON.parse(cached) : cached) as T;
    }

    console.log(`[Cache] MISS: ${key}`);

    // Fetch fresh data
    const data = await fetcher();

    // Cache the result (always stringify for consistency)
    await redis.setex(key, ttl, JSON.stringify(data));

    return data;
  } catch (error) {
    console.error('[Cache] Error:', error);
    // Fallback to fetching directly
    return fetcher();
  }
}

/**
 * Invalidate cache by pattern
 * @param pattern - Key pattern to invalidate (supports wildcards like "user:*")
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[Cache] Invalidated ${keys.length} keys matching: ${pattern}`);
    }
  } catch (error) {
    console.error('[Cache] Invalidation error:', error);
  }
}

/**
 * Invalidate specific cache key
 * @param key - Cache key to invalidate
 */
export async function invalidateCacheKey(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.del(key);
    console.log(`[Cache] Invalidated key: ${key}`);
  } catch (error) {
    console.error('[Cache] Invalidation error:', error);
  }
}

/**
 * Set cache data directly
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttl - Time to live in seconds
 */
export async function setCacheData<T>(
  key: string,
  data: T,
  ttl: number = 300
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.setex(key, ttl, JSON.stringify(data));
    console.log(`[Cache] SET: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    console.error('[Cache] Set error:', error);
  }
}

/**
 * Get cache data directly
 * @param key - Cache key
 */
export async function getCacheData<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const cached = await redis.get(key);
    if (cached) {
      // Handle both string and object responses
      return (typeof cached === 'string' ? JSON.parse(cached) : cached) as T;
    }
    return null;
  } catch (error) {
    console.error('[Cache] Get error:', error);
    return null;
  }
}

/**
 * Check if a key exists in cache
 * @param key - Cache key
 */
export async function cacheExists(key: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    return false;
  }

  try {
    const exists = await redis.exists(key);
    return exists > 0;
  } catch (error) {
    console.error('[Cache] Exists error:', error);
    return false;
  }
}

/**
 * Get TTL (time to live) of a cached key in seconds
 * Returns -2 if key doesn't exist, -1 if no expiry
 * @param key - Cache key
 */
export async function getCacheTTL(key: string): Promise<number> {
  const redis = getRedisClient();
  if (!redis) {
    return -2;
  }

  try {
    return await redis.ttl(key);
  } catch (error) {
    console.error('[Cache] TTL error:', error);
    return -2;
  }
}

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  ORG_CHART: 300,      // 5 minutes - org chart changes infrequently
  DEPARTMENTS: 600,    // 10 minutes - departments rarely change
  MANAGERS: 300,       // 5 minutes - manager list
  EMPLOYEES: 180,      // 3 minutes - employee list
  USER_PROFILE: 300,   // 5 minutes - user profile data
  TEAMS: 300,          // 5 minutes - team list
  PROJECTS: 300,       // 5 minutes - project list
  CLIENTS: 300,        // 5 minutes - client list
  DASHBOARD: 60,       // 1 minute - dashboard stats (more frequent updates)
  REPORTS: 180,        // 3 minutes - report data
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 600,           // 10 minutes
  VERY_LONG: 1800,     // 30 minutes
} as const;

/**
 * Cache keys for common queries
 */
export const CacheKeys = {
  // Existing keys
  timesheetReport: (tenantId: string, params: string) =>
    `timesheet_report:${tenantId}:${params}`,
  employeeList: (tenantId: string, filters: string) =>
    `employees:${tenantId}:${filters}`,
  userProfile: (userId: string) =>
    `user_profile:${userId}`,
  pendingTimesheets: (tenantId: string, managerId?: string) =>
    `pending_timesheets:${tenantId}${managerId ? `:${managerId}` : ''}`,
  projectList: (tenantId: string) =>
    `projects:${tenantId}`,
  clientList: (tenantId: string) =>
    `clients:${tenantId}`,

  // Organization & hierarchy keys
  orgChart: (tenantId: string) =>
    `org_chart:${tenantId}`,
  departments: (tenantId: string) =>
    `departments:${tenantId}`,
  managers: (tenantId: string, roles?: string) =>
    `managers:${tenantId}${roles ? `:${roles.replace(/,/g, '-')}` : ''}`,
  teams: (tenantId: string) =>
    `teams:${tenantId}`,

  // Dashboard keys
  hrDashboard: (tenantId: string) =>
    `hr_dashboard:${tenantId}`,
  adminDashboard: (tenantId: string) =>
    `admin_dashboard:${tenantId}`,
  managerDashboard: (tenantId: string, managerId: string) =>
    `manager_dashboard:${tenantId}:${managerId}`,
  employeeDashboard: (tenantId: string, userId: string) =>
    `employee_dashboard:${tenantId}:${userId}`,

  // Report keys
  leaveReport: (tenantId: string, params: string) =>
    `leave_report:${tenantId}:${params}`,
  expenseReport: (tenantId: string, params: string) =>
    `expense_report:${tenantId}:${params}`,
};

/**
 * Cache invalidation patterns
 */
export const CachePatterns = {
  allTimesheets: (tenantId: string) => `timesheet_*:${tenantId}:*`,
  allEmployees: (tenantId: string) => `employees:${tenantId}:*`,
  userProfile: (userId: string) => `user_profile:${userId}`,
  allProjects: (tenantId: string) => `projects:${tenantId}*`,
  allClients: (tenantId: string) => `clients:${tenantId}*`,

  // Organization patterns
  orgChart: (tenantId: string) => `org_chart:${tenantId}`,
  allDepartments: (tenantId: string) => `departments:${tenantId}`,
  allManagers: (tenantId: string) => `managers:${tenantId}*`,
  allTeams: (tenantId: string) => `teams:${tenantId}*`,

  // Dashboard patterns
  allDashboards: (tenantId: string) => `*_dashboard:${tenantId}*`,
  hrDashboard: (tenantId: string) => `hr_dashboard:${tenantId}`,
  adminDashboard: (tenantId: string) => `admin_dashboard:${tenantId}`,

  // Report patterns
  allReports: (tenantId: string) => `*_report:${tenantId}:*`,
};

/**
 * Invalidate all employee-related caches for a tenant
 * Call this when employee data changes (create, update, delete, role change)
 */
export async function invalidateEmployeeRelatedCaches(tenantId: string): Promise<void> {
  console.log('[Cache] Bulk invalidating employee caches for tenant:', tenantId);

  await Promise.all([
    invalidateCache(CachePatterns.orgChart(tenantId)),
    invalidateCache(CachePatterns.allEmployees(tenantId)),
    invalidateCache(CachePatterns.allManagers(tenantId)),
    invalidateCache(CachePatterns.allDashboards(tenantId)),
  ]);
}

/**
 * Invalidate all caches for a tenant
 * Call this for major changes or troubleshooting
 */
export async function invalidateAllTenantCaches(tenantId: string): Promise<void> {
  console.log('[Cache] Invalidating ALL caches for tenant:', tenantId);

  await Promise.all([
    invalidateCache(CachePatterns.orgChart(tenantId)),
    invalidateCache(CachePatterns.allDepartments(tenantId)),
    invalidateCache(CachePatterns.allManagers(tenantId)),
    invalidateCache(CachePatterns.allEmployees(tenantId)),
    invalidateCache(CachePatterns.allTeams(tenantId)),
    invalidateCache(CachePatterns.allTimesheets(tenantId)),
    invalidateCache(CachePatterns.allProjects(tenantId)),
    invalidateCache(CachePatterns.allClients(tenantId)),
    invalidateCache(CachePatterns.allDashboards(tenantId)),
    invalidateCache(CachePatterns.allReports(tenantId)),
  ]);
}

/**
 * Invalidate project-related caches
 */
export async function invalidateProjectCaches(tenantId: string): Promise<void> {
  console.log('[Cache] Invalidating project caches for tenant:', tenantId);

  await Promise.all([
    invalidateCache(CachePatterns.allProjects(tenantId)),
    invalidateCache(CachePatterns.allDashboards(tenantId)),
  ]);
}

/**
 * Invalidate client-related caches
 */
export async function invalidateClientCaches(tenantId: string): Promise<void> {
  console.log('[Cache] Invalidating client caches for tenant:', tenantId);

  await Promise.all([
    invalidateCache(CachePatterns.allClients(tenantId)),
    invalidateCache(CachePatterns.allProjects(tenantId)),
    invalidateCache(CachePatterns.allDashboards(tenantId)),
  ]);
}

/**
 * Invalidate timesheet-related caches
 */
export async function invalidateTimesheetCaches(tenantId: string): Promise<void> {
  console.log('[Cache] Invalidating timesheet caches for tenant:', tenantId);

  await Promise.all([
    invalidateCache(CachePatterns.allTimesheets(tenantId)),
    invalidateCache(CachePatterns.allDashboards(tenantId)),
    invalidateCache(CachePatterns.allReports(tenantId)),
  ]);
}
