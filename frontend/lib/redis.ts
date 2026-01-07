/**
 * Redis Integration for Zenora.ai
 * Handles magic link storage, session management, and rate limiting
 *
 * Uses Upstash Redis REST API which is optimized for serverless environments.
 * Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your environment.
 *
 * SECURITY NOTES:
 * - Codes are hashed before storage
 * - Sessions expire after 8 hours
 * - Rate limiting prevents abuse
 * - Device fingerprints track suspicious activity
 */

import * as crypto from 'crypto';
import { getUpstashWrapper, isUpstashConfigured, UpstashWrapper } from './upstash';

// Check if Upstash is available
const REDIS_AVAILABLE = isUpstashConfigured();

// Redis client
let redis: UpstashWrapper | null = null;
let redisInitialized = false;

/**
 * Get the Upstash Redis client
 */
function getRedisClient(): UpstashWrapper | null {
  if (!REDIS_AVAILABLE) {
    return null;
  }

  if (!redisInitialized) {
    redis = getUpstashWrapper();
    if (redis) {
      console.log('[Redis] Connected via Upstash REST API');
      redisInitialized = true;
    }
  }
  return redis;
}

// ============================================================================
// MAGIC LINK STORAGE
// ============================================================================

export interface MagicLinkData {
  token: string;
  codeHash: string;
  email: string;
  userId: string;
  tenantId: string;
  attempts: number;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  expiresAt: number; // Unix timestamp
  createdAt: number; // Unix timestamp
}

/**
 * Store magic link data in Redis
 * Code is hashed before storage - NEVER store plain codes
 */
export async function storeMagicLink(
  token: string,
  code: string,
  email: string,
  userId: string,
  metadata: {
    tenantId: string;
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
  }
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    console.warn('[Redis] Not available - magic link stored only in database');
    return true; // Return true to not block the flow
  }

  try {
    const codeHash = hashCode(code);
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    const data: MagicLinkData = {
      token,
      codeHash,
      email,
      userId,
      tenantId: metadata.tenantId,
      attempts: 0,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      deviceFingerprint: metadata.deviceFingerprint,
      expiresAt,
      createdAt: Date.now(),
    };

    const key = `magic_link:${token}`;
    await client.setex(key, 900, JSON.stringify(data)); // 15 min TTL

    return true;
  } catch (error) {
    console.error('[Redis] Failed to store magic link:', error);
    return false;
  }
}

/**
 * Get magic link data from Redis
 */
export async function getMagicLink(token: string): Promise<MagicLinkData | null> {
  const client = getRedisClient();
  if (!client) {
    console.warn('[Redis] Client not available in getMagicLink');
    return null;
  }

  try {
    const key = `magic_link:${token}`;
    console.log('[Redis] Getting key:', key);
    const data = await client.get(key);
    console.log('[Redis] Data found:', !!data);

    if (!data) {
      return null;
    }

    // Handle both string and object responses (Upstash may return parsed JSON)
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

    // Check expiration
    if (Date.now() > parsed.expiresAt) {
      await client.del(key);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('[Redis] Failed to get magic link:', error);
    return null;
  }
}

/**
 * Increment failed attempts for a magic link
 */
export async function incrementMagicLinkAttempts(token: string): Promise<number> {
  const client = getRedisClient();
  if (!client) {
    return 1;
  }

  try {
    const data = await getMagicLink(token);
    if (!data) {
      return 0;
    }

    data.attempts += 1;

    const key = `magic_link:${token}`;
    const ttl = Math.max(1, Math.floor((data.expiresAt - Date.now()) / 1000));
    await client.setex(key, ttl, JSON.stringify(data));

    return data.attempts;
  } catch (error) {
    console.error('[Redis] Failed to increment attempts:', error);
    return 0;
  }
}

/**
 * Delete magic link from Redis
 */
export async function deleteMagicLink(token: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    return true;
  }

  try {
    const key = `magic_link:${token}`;
    await client.del(key);
    return true;
  } catch (error) {
    console.error('[Redis] Failed to delete magic link:', error);
    return false;
  }
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export interface SessionData {
  sessionId: string;
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  status: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  lastActivityAt: number; // Unix timestamp
}

/**
 * Create session in Redis
 * Sessions expire after 8 hours of inactivity
 */
export async function createSession(
  userId: string,
  tenantId: string,
  email: string,
  role: string,
  status: string,
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
  }
): Promise<string> {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const client = getRedisClient();

  if (!client) {
    console.warn('[Redis] Not available - session stored only in database');
    return sessionId;
  }

  try {
    const data: SessionData = {
      sessionId,
      userId,
      tenantId,
      email,
      role,
      status,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      deviceFingerprint: metadata.deviceFingerprint,
      lastActivityAt: Date.now(),
    };

    const key = `session:${sessionId}`;
    await client.setex(key, 8 * 60 * 60, JSON.stringify(data)); // 8 hours

    return sessionId;
  } catch (error) {
    console.error('[Redis] Failed to create session:', error);
    return sessionId;
  }
}

/**
 * Get session from Redis
 */
export async function getSession(sessionId: string): Promise<SessionData | null> {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const key = `session:${sessionId}`;
    const data = await client.get(key);

    if (!data) {
      return null;
    }

    // Handle both string and object responses
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (error) {
    console.error('[Redis] Failed to get session:', error);
    return null;
  }
}

/**
 * Refresh session TTL
 */
export async function refreshSession(sessionId: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    return true;
  }

  try {
    const data = await getSession(sessionId);
    if (!data) {
      return false;
    }

    data.lastActivityAt = Date.now();

    const key = `session:${sessionId}`;
    await client.setex(key, 8 * 60 * 60, JSON.stringify(data));

    return true;
  } catch (error) {
    console.error('[Redis] Failed to refresh session:', error);
    return false;
  }
}

/**
 * Delete session from Redis
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    return true;
  }

  try {
    const key = `session:${sessionId}`;
    await client.del(key);
    return true;
  } catch (error) {
    console.error('[Redis] Failed to delete session:', error);
    return false;
  }
}

/**
 * Delete all sessions for a user
 */
export async function deleteAllUserSessions(userId: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    return true;
  }

  try {
    const keys = await client.keys(`session:*`);

    for (const key of keys) {
      const data = await client.get(key);
      if (data) {
        // Handle both string and object responses
        const session = typeof data === 'string' ? JSON.parse(data) : data;
        if (session.userId === userId) {
          await client.del(key);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('[Redis] Failed to delete user sessions:', error);
    return false;
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Check rate limit for an IP address
 * Returns true if limit exceeded, false if allowed
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    // Without Redis, allow all requests (not ideal but won't block functionality)
    console.warn('[Redis] Rate limiting disabled - Redis not available');
    return false;
  }

  try {
    const rateLimitKey = `rate_limit:${key}`;
    const current = await client.incr(rateLimitKey);

    if (current === 1) {
      await client.expire(rateLimitKey, windowSeconds);
    }

    return current > maxAttempts;
  } catch (error) {
    console.error('[Redis] Failed to check rate limit:', error);
    return false; // Allow on error
  }
}

/**
 * Rate limit for login code requests (per email)
 */
export async function checkLoginCodeRateLimit(email: string): Promise<boolean> {
  return checkRateLimit(`login_code:${email}`, 5, 15 * 60); // 5 per 15 min
}

/**
 * Rate limit for verification attempts (per token)
 */
export async function checkVerificationRateLimit(token: string): Promise<boolean> {
  return checkRateLimit(`verify:${token}`, 5, 15 * 60); // 5 per 15 min
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Hash verification code using SHA-256
 */
function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Verify code against hash
 */
function verifyCode(code: string, hash: string): boolean {
  const codeHash = hashCode(code);
  return crypto.timingSafeEqual(Buffer.from(codeHash), Buffer.from(hash));
}

/**
 * Check if Redis is available
 */
export function getRedisStatus(): {
  available: boolean;
  type: 'upstash' | 'none';
} {
  if (REDIS_AVAILABLE) {
    return { available: true, type: 'upstash' };
  }
  return { available: false, type: 'none' };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const magicLinks = {
  create: storeMagicLink,
  get: getMagicLink,
  verifyCode: async (token: string, code: string): Promise<boolean> => {
    const data = await getMagicLink(token);
    if (!data) return false;
    return verifyCode(code, data.codeHash);
  },
  incrementAttempts: incrementMagicLinkAttempts,
  delete: deleteMagicLink,
};

export const sessions = {
  create: createSession,
  get: getSession,
  refresh: refreshSession,
  delete: deleteSession,
  deleteAllUserSessions,
};

export const rateLimiter = {
  checkRateLimit,
  checkLoginCodeRateLimit,
  checkVerificationRateLimit,
};

export { getRedisClient as redis };
export default getRedisClient;
