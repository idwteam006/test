/**
 * Upstash Redis Client for Zenora.ai
 *
 * Uses Upstash's REST-based Redis client, which is optimized for:
 * - Serverless environments (Vercel, AWS Lambda)
 * - Edge functions
 * - No connection pooling issues
 * - Automatic retries and error handling
 */

import { Redis } from '@upstash/redis';

// Singleton instance
let redis: Redis | null = null;

/**
 * Check if Upstash is configured
 */
export function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Get the Upstash Redis client (singleton)
 * Returns null if Upstash is not configured
 */
export function getUpstashClient(): Redis | null {
  if (!isUpstashConfigured()) {
    return null;
  }

  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  return redis;
}

/**
 * Upstash Redis wrapper with ioredis-compatible API
 * This provides a unified interface so existing code works without changes
 */
export class UpstashWrapper {
  private client: Redis;

  constructor(client: Redis) {
    this.client = client;
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    try {
      const value = await this.client.get<string>(key);
      return value;
    } catch (error) {
      console.error('[Upstash] GET error:', error);
      return null;
    }
  }

  /**
   * Set a value with expiration (seconds)
   */
  async setex(key: string, seconds: number, value: string): Promise<'OK' | null> {
    try {
      await this.client.setex(key, seconds, value);
      return 'OK';
    } catch (error) {
      console.error('[Upstash] SETEX error:', error);
      return null;
    }
  }

  /**
   * Set a value without expiration
   */
  async set(key: string, value: string): Promise<'OK' | null> {
    try {
      await this.client.set(key, value);
      return 'OK';
    } catch (error) {
      console.error('[Upstash] SET error:', error);
      return null;
    }
  }

  /**
   * Delete one or more keys
   */
  async del(...keys: string[]): Promise<number> {
    try {
      const result = await this.client.del(...keys);
      return result;
    } catch (error) {
      console.error('[Upstash] DEL error:', error);
      return 0;
    }
  }

  /**
   * Find keys matching a pattern
   * Note: Use sparingly in production - KEYS can be slow with many keys
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      const keys = await this.client.keys(pattern);
      return keys;
    } catch (error) {
      console.error('[Upstash] KEYS error:', error);
      return [];
    }
  }

  /**
   * Increment a key's value
   */
  async incr(key: string): Promise<number> {
    try {
      const result = await this.client.incr(key);
      return result;
    } catch (error) {
      console.error('[Upstash] INCR error:', error);
      return 0;
    }
  }

  /**
   * Set expiration on a key (seconds)
   */
  async expire(key: string, seconds: number): Promise<number> {
    try {
      const result = await this.client.expire(key, seconds);
      return result ? 1 : 0;
    } catch (error) {
      console.error('[Upstash] EXPIRE error:', error);
      return 0;
    }
  }

  /**
   * Get TTL of a key (seconds)
   */
  async ttl(key: string): Promise<number> {
    try {
      const result = await this.client.ttl(key);
      return result;
    } catch (error) {
      console.error('[Upstash] TTL error:', error);
      return -2;
    }
  }

  /**
   * Check if key exists
   */
  async exists(...keys: string[]): Promise<number> {
    try {
      const result = await this.client.exists(...keys);
      return result;
    } catch (error) {
      console.error('[Upstash] EXISTS error:', error);
      return 0;
    }
  }

  /**
   * Set multiple hash fields
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    try {
      const result = await this.client.hset(key, { [field]: value });
      return result;
    } catch (error) {
      console.error('[Upstash] HSET error:', error);
      return 0;
    }
  }

  /**
   * Get a hash field
   */
  async hget(key: string, field: string): Promise<string | null> {
    try {
      const result = await this.client.hget<string>(key, field);
      return result;
    } catch (error) {
      console.error('[Upstash] HGET error:', error);
      return null;
    }
  }

  /**
   * Get all hash fields
   */
  async hgetall(key: string): Promise<Record<string, string> | null> {
    try {
      const result = await this.client.hgetall<Record<string, string>>(key);
      return result;
    } catch (error) {
      console.error('[Upstash] HGETALL error:', error);
      return null;
    }
  }

  /**
   * Execute a pipeline of commands
   */
  pipeline() {
    return this.client.pipeline();
  }

  /**
   * Execute multiple commands atomically
   */
  multi() {
    return this.client.multi();
  }

  /**
   * Scan keys with cursor (better than KEYS for large datasets)
   */
  async scan(cursor: number, options?: { match?: string; count?: number }): Promise<[string, string[]]> {
    try {
      const result = await this.client.scan(cursor, options);
      return [result[0].toString(), result[1]];
    } catch (error) {
      console.error('[Upstash] SCAN error:', error);
      return ['0', []];
    }
  }
}

/**
 * Get the Upstash wrapper with ioredis-compatible API
 */
export function getUpstashWrapper(): UpstashWrapper | null {
  const client = getUpstashClient();
  if (!client) {
    return null;
  }
  return new UpstashWrapper(client);
}

// Export the raw Upstash client for advanced use cases
export { Redis };
export default getUpstashWrapper;