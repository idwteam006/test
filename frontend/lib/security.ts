/**
 * Security Utilities for Zenora.ai
 * Handles email domain validation, CSRF protection, input sanitization, and secure code generation
 *
 * SECURITY BEST PRACTICES:
 * - Use crypto.randomInt for secure random number generation
 * - Validate all inputs against whitelist
 * - Sanitize user inputs to prevent XSS
 * - Use CSRF tokens for state-changing operations
 */

import crypto from 'crypto';
import { prisma } from './prisma';

// ============================================================================
// EMAIL DOMAIN VALIDATION
// ============================================================================

/**
 * Validate email domain against tenant whitelist
 * Prevents unauthorized users from registering
 */
export async function isEmailDomainAllowed(
  email: string,
  tenantId: string
): Promise<boolean> {
  try {
    const emailDomain = email.split('@')[1]?.toLowerCase();

    if (!emailDomain) {
      return false;
    }

    // Get tenant settings
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { allowedEmailDomains: true },
    });

    if (!settings || !settings.allowedEmailDomains) {
      // If no whitelist is configured, allow all domains (for testing)
      console.warn('[Security] No email domain whitelist configured for tenant:', tenantId);
      return true;
    }

    // Parse allowed domains from JSON
    const allowedDomains = settings.allowedEmailDomains as string[];

    // Check if wildcard (*) is present - allows all domains
    if (allowedDomains.includes('*')) {
      return true;
    }

    // Check if domain is in whitelist (case-insensitive)
    const isAllowed = allowedDomains.some(
      (domain) => domain.toLowerCase() === emailDomain
    );

    if (!isAllowed) {
      console.warn('[Security] Email domain not allowed:', {
        email: email.replace(/(.{3}).*(@.*)/, '$1***$2'), // Redact email
        domain: emailDomain,
        allowedDomains,
      });
    }

    return isAllowed;
  } catch (error) {
    console.error('[Security] Error checking email domain:', error);
    return false;
  }
}

/**
 * Extract domain from email address
 */
export function getEmailDomain(email: string): string | null {
  const domain = email.split('@')[1];
  return domain ? domain.toLowerCase() : null;
}

/**
 * Validate email format using regex
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================================================
// SECURE CODE GENERATION
// ============================================================================

/**
 * Generate a cryptographically secure 6-digit code
 * Uses crypto.randomInt (not Math.random)
 */
export function generateSecureCode(): string {
  // Generate a random number between 100000 and 999999
  const code = crypto.randomInt(100000, 1000000);
  return code.toString();
}

/**
 * Generate a cryptographically secure token
 * Used for magic link URLs
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

// ============================================================================
// CSRF PROTECTION
// ============================================================================

/**
 * Generate CSRF token
 * Should be stored in session and validated on POST requests
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate CSRF token
 * Compare provided token with stored token (constant-time)
 */
export function validateCSRFToken(
  providedToken: string,
  storedToken: string
): boolean {
  if (!providedToken || !storedToken) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedToken),
      Buffer.from(storedToken)
    );
  } catch {
    return false;
  }
}

/**
 * Extract CSRF token from request headers or body
 */
export function extractCSRFToken(headers: Headers, body?: any): string | null {
  // Check X-CSRF-Token header
  const headerToken = headers.get('x-csrf-token');
  if (headerToken) {
    return headerToken;
  }

  // Check body
  if (body && typeof body === 'object' && 'csrfToken' in body) {
    return body.csrfToken;
  }

  return null;
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize string input to prevent XSS
 * Escapes HTML special characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize email input
 * Remove whitespace and convert to lowercase
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Validate and sanitize name input
 * Allow only letters, spaces, hyphens, and apostrophes
 */
export function sanitizeName(name: string): string {
  if (typeof name !== 'string') {
    return '';
  }

  // Remove any characters that aren't letters, spaces, hyphens, or apostrophes
  return name
    .trim()
    .replace(/[^a-zA-Z\s'-]/g, '')
    .substring(0, 100); // Limit length
}

/**
 * Validate employee ID format
 * Allow only alphanumeric characters and hyphens
 */
export function validateEmployeeId(employeeId: string): boolean {
  if (typeof employeeId !== 'string') {
    return false;
  }

  const regex = /^[a-zA-Z0-9-]{1,50}$/;
  return regex.test(employeeId);
}

// ============================================================================
// PASSWORD VALIDATION (for future use if needed)
// ============================================================================

/**
 * Validate password strength
 * Minimum 8 characters, at least one uppercase, one lowercase, one number, one special char
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// IP ADDRESS EXTRACTION
// ============================================================================

/**
 * Extract IP address from request headers
 * Handles proxies and load balancers
 */
export function getClientIp(headers: Headers): string | undefined {
  // Check common proxy headers
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP if there are multiple
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get('cf-connecting-ip'); // Cloudflare
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return undefined;
}

/**
 * Extract user agent from request headers
 */
export function getUserAgent(headers: Headers): string | undefined {
  return headers.get('user-agent') || undefined;
}

// ============================================================================
// ROLE-BASED ACCESS CONTROL
// ============================================================================

/**
 * Check if user has required role
 */
export function hasRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    ADMIN: 4,
    MANAGER: 3,
    ACCOUNTANT: 2,
    EMPLOYEE: 1,
  };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.some((role) => hasRole(userRole, role));
}

/**
 * Check if user is admin
 */
export function isAdmin(userRole: string): boolean {
  return userRole === 'ADMIN';
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

/**
 * Get security headers for HTTP responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Enable XSS protection
    'X-XSS-Protection': '1; mode=block',

    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Content Security Policy (adjust as needed)
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline/eval in dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; '),

    // HSTS (HTTPS only - enable in production)
    ...(process.env.NODE_ENV === 'production'
      ? {
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        }
      : {}),
  };
}

/**
 * Apply security headers to NextResponse
 */
export function applySecurityHeaders(response: Response): Response {
  const headers = getSecurityHeaders();

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// ============================================================================
// SUSPICIOUS ACTIVITY DETECTION
// ============================================================================

/**
 * Check if login attempt is suspicious
 * Factors: too many failed attempts, new device, unusual location, etc.
 */
export interface SuspiciousActivityCheck {
  isSuspicious: boolean;
  reasons: string[];
  riskScore: number; // 0-100
}

export async function checkSuspiciousActivity(
  userId: string,
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
  }
): Promise<SuspiciousActivityCheck> {
  const reasons: string[] = [];
  let riskScore = 0;

  // Check if device is known
  // This would be implemented with the redis.isKnownDevice function
  // For now, we'll return a basic check

  // Add more sophisticated checks here:
  // - Check if IP is from suspicious location (GeoIP)
  // - Check if user agent is suspicious
  // - Check if there have been multiple failed attempts
  // - Check if login is at unusual time for user
  // - Check if multiple accounts are being accessed from same IP

  return {
    isSuspicious: reasons.length > 0,
    reasons,
    riskScore,
  };
}

// ============================================================================
// ADMIN PROTECTION
// ============================================================================

/**
 * Prevent admin from deactivating themselves
 */
export function canDeactivateUser(
  actorUserId: string,
  targetUserId: string
): boolean {
  return actorUserId !== targetUserId;
}

/**
 * Check if tenant has at least one active admin
 */
export async function hasActiveAdmin(
  tenantId: string,
  excludeUserId?: string
): Promise<boolean> {
  const adminCount = await prisma.user.count({
    where: {
      tenantId,
      role: 'ADMIN',
      status: 'ACTIVE',
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });

  return adminCount > 0;
}
