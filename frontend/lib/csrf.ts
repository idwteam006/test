/**
 * CSRF (Cross-Site Request Forgery) Protection
 * Generates and validates CSRF tokens for form submissions
 */

import crypto from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || 'change-this-in-production';
const TOKEN_LENGTH = 32;

/**
 * Generate a CSRF token
 * Format: timestamp-hmac
 */
export function generateCSRFToken(): string {
  const timestamp = Date.now().toString();
  const randomBytes = crypto.randomBytes(TOKEN_LENGTH / 2).toString('hex');
  const data = `${timestamp}-${randomBytes}`;

  const hmac = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(data)
    .digest('hex');

  return `${data}-${hmac}`;
}

/**
 * Validate a CSRF token
 * Checks HMAC signature and expiration (1 hour)
 */
export function validateCSRFToken(token: string): boolean {
  if (!token) return false;

  try {
    const parts = token.split('-');
    if (parts.length !== 3) return false;

    const [timestamp, randomBytes, receivedHmac] = parts;
    const data = `${timestamp}-${randomBytes}`;

    // Verify HMAC
    const expectedHmac = crypto
      .createHmac('sha256', CSRF_SECRET)
      .update(data)
      .digest('hex');

    // Timing-safe comparison
    if (!crypto.timingSafeEqual(Buffer.from(receivedHmac), Buffer.from(expectedHmac))) {
      return false;
    }

    // Check expiration (1 hour)
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    const maxAge = 60 * 60 * 1000; // 1 hour

    if (tokenAge > maxAge) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('[CSRF] Token validation error:', error);
    return false;
  }
}

/**
 * Extract CSRF token from request headers or body
 */
export function extractCSRFToken(request: Request): string | null {
  // Try X-CSRF-Token header first
  const headerToken = request.headers.get('x-csrf-token');
  if (headerToken) return headerToken;

  // Try request body (for form submissions)
  // Note: Body will be parsed by the route handler
  return null;
}

/**
 * Middleware helper to validate CSRF for state-changing requests
 */
export function requireCSRF(request: Request): { valid: boolean; error?: string } {
  // Only validate for state-changing methods
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  const token = extractCSRFToken(request);

  if (!token) {
    return { valid: false, error: 'CSRF token missing' };
  }

  if (!validateCSRFToken(token)) {
    return { valid: false, error: 'CSRF token invalid or expired' };
  }

  return { valid: true };
}
