/**
 * Authentication Utilities
 * Centralized authentication system for Zenora.ai
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Token Payloads
export interface AccessTokenPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: Role;
  name: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tenantId: string;
  sessionId: string;
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate Access Token (15 minutes)
 */
export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload as object, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as string,
    issuer: 'zenora.ai',
    audience: 'zenora.ai',
  } as jwt.SignOptions);
}

/**
 * Generate Refresh Token (7 days)
 */
export function generateRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload as object, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN as string,
    issuer: 'zenora.ai',
    audience: 'zenora.ai',
  } as jwt.SignOptions);
}

/**
 * Verify Access Token
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    console.log('[verifyAccessToken] Verifying token with secret length:', JWT_SECRET?.length || 0);
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'zenora.ai',
      audience: 'zenora.ai',
    }) as AccessTokenPayload;
    console.log('[verifyAccessToken] Token valid, user:', decoded.email);
    return decoded;
  } catch (error) {
    console.error('[verifyAccessToken] Token verification failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Verify Refresh Token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'zenora.ai',
      audience: 'zenora.ai',
    }) as RefreshTokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Generate random token for password reset
 */
export function generatePasswordResetToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Password strength validation
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
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
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate token expiry date
 */
export function getTokenExpiryDate(expiresIn: string): Date {
  const now = new Date();
  const match = expiresIn.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error('Invalid expiresIn format');
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's':
      now.setSeconds(now.getSeconds() + value);
      break;
    case 'm':
      now.setMinutes(now.getMinutes() + value);
      break;
    case 'h':
      now.setHours(now.getHours() + value);
      break;
    case 'd':
      now.setDate(now.getDate() + value);
      break;
  }

  return now;
}
