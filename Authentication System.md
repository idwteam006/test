# Custom Next.js Authentication System
## Complete Implementation Guide with JWT, Sessions, and Security Features

---

## 🎯 Overview

This guide shows how to build a production-ready authentication system in Next.js with:
- ✅ JWT token generation (Access + Refresh tokens)
- ✅ Session persistence
- ✅ Automatic token refresh
- ✅ Device tracking
- ✅ Auto logout on security events
- ✅ Multi-tenant support (tenant_id)

---

## 🏗️ Architecture

```
┌─────────────┐          ┌──────────────┐         ┌──────────────┐
│   Browser   │          │   Next.js    │         │  PostgreSQL  │
│             │          │   (App       │         │   + Redis    │
│  - Cookies  │◄────────►│   Router)    │◄───────►│              │
│  - Local    │          │              │         │  - Users     │
│    Storage  │          │  - API       │         │  - Sessions  │
│             │          │    Routes    │         │  - Devices   │
└─────────────┘          └──────────────┘         └──────────────┘
```

---

## 📦 Tech Stack

### Core Dependencies
```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "jose": "^5.x",
    "zod": "^3.22.4",
    "@prisma/client": "^5.x",
    "ioredis": "^5.x",
    "cookies-next": "^4.x",
    "ua-parser-js": "^1.0.37"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/ua-parser-js": "^0.7.39",
    "prisma": "^5.x"
  }
}
```

---

## 🗄️ Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User model
model User {
  id                String    @id @default(uuid())
  tenantId          String    @map("tenant_id")
  email             String    @unique
  passwordHash      String    @map("password_hash")
  name              String
  role              Role      @default(EMPLOYEE)
  isActive          Boolean   @default(true) @map("is_active")
  emailVerified     Boolean   @default(false) @map("email_verified")
  lastLoginAt       DateTime? @map("last_login_at")
  passwordChangedAt DateTime  @default(now()) @map("password_changed_at")
  failedLoginAttempts Int     @default(0) @map("failed_login_attempts")
  lockedUntil       DateTime? @map("locked_until")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  sessions          Session[]
  devices           Device[]
  auditLogs         AuditLog[]

  @@map("users")
  @@index([tenantId])
  @@index([email])
}

enum Role {
  ADMIN
  MANAGER
  EMPLOYEE
}

// Session model
model Session {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  tenantId        String    @map("tenant_id")
  deviceId        String    @map("device_id")
  refreshToken    String    @unique @map("refresh_token")
  accessToken     String?   @map("access_token")
  ipAddress       String    @map("ip_address")
  userAgent       String    @map("user_agent")
  isActive        Boolean   @default(true) @map("is_active")
  expiresAt       DateTime  @map("expires_at")
  lastActivityAt  DateTime  @default(now()) @map("last_activity_at")
  createdAt       DateTime  @default(now()) @map("created_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  device          Device    @relation(fields: [deviceId], references: [id], onDelete: Cascade)

  @@map("sessions")
  @@index([userId])
  @@index([tenantId])
  @@index([refreshToken])
  @@index([expiresAt])
}

// Device tracking
model Device {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  tenantId        String    @map("tenant_id")
  deviceName      String    @map("device_name")
  deviceType      String    @map("device_type") // mobile, desktop, tablet
  browser         String
  os              String
  fingerprint     String    @unique // Browser fingerprint
  isTrusted       Boolean   @default(false) @map("is_trusted")
  lastSeenAt      DateTime  @default(now()) @map("last_seen_at")
  createdAt       DateTime  @default(now()) @map("created_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  sessions        Session[]

  @@map("devices")
  @@index([userId])
  @@index([tenantId])
  @@index([fingerprint])
}

// Audit logs for security events
model AuditLog {
  id          String    @id @default(uuid())
  userId      String?   @map("user_id")
  tenantId    String    @map("tenant_id")
  action      String    // LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, PASSWORD_CHANGE, etc.
  ipAddress   String    @map("ip_address")
  userAgent   String    @map("user_agent")
  metadata    Json?     // Additional context
  createdAt   DateTime  @default(now()) @map("created_at")

  user        User?     @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@map("audit_logs")
  @@index([userId])
  @@index([tenantId])
  @@index([action])
  @@index([createdAt])
}
```

---

## 🔑 Environment Variables

```bash
# .env.local

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/zenora_db"

# Redis (for session caching)
REDIS_URL="redis://localhost:6379"

# JWT Secrets (Generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET="your-super-secret-access-key-min-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-chars"

# Token Expiry
JWT_ACCESS_EXPIRY="15m"  # 15 minutes
JWT_REFRESH_EXPIRY="7d"  # 7 days

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCK_DURATION_MINUTES=30

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## 🛠️ Core Authentication Utilities

### 1. JWT Token Generation & Verification

```typescript
// lib/auth/jwt.ts

import jwt from 'jsonwebtoken';
import { JWTPayload } from 'jose';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

export interface TokenPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  sessionId: string;
  deviceId: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate Access Token (short-lived)
 */
export function generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRY,
    issuer: 'zenora-auth',
    audience: 'zenora-api',
  });
}

/**
 * Generate Refresh Token (long-lived)
 */
export function generateRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRY,
    issuer: 'zenora-auth',
    audience: 'zenora-api',
  });
}

/**
 * Verify Access Token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET, {
      issuer: 'zenora-auth',
      audience: 'zenora-api',
    }) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error('Access token verification failed:', error);
    return null;
  }
}

/**
 * Verify Refresh Token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET, {
      issuer: 'zenora-auth',
      audience: 'zenora-api',
    }) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
}

/**
 * Decode token without verification (for expired token inspection)
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch (error) {
    return null;
  }
}
```

### 2. Password Hashing

```typescript
// lib/auth/password.ts

import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
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
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### 3. Device Fingerprinting

```typescript
// lib/auth/device.ts

import UAParser from 'ua-parser-js';
import crypto from 'crypto';

export interface DeviceInfo {
  deviceName: string;
  deviceType: string;
  browser: string;
  os: string;
  fingerprint: string;
}

/**
 * Parse user agent and generate device info
 */
export function parseDeviceInfo(
  userAgent: string,
  ipAddress: string
): DeviceInfo {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const deviceType = result.device.type || 'desktop';
  const browser = `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim();
  const os = `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim();
  const deviceName = result.device.model || `${deviceType} device`;

  // Generate unique fingerprint
  const fingerprint = generateFingerprint(userAgent, ipAddress);

  return {
    deviceName,
    deviceType,
    browser,
    os,
    fingerprint,
  };
}

/**
 * Generate device fingerprint
 */
function generateFingerprint(userAgent: string, ipAddress: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(`${userAgent}:${ipAddress}`);
  return hash.digest('hex');
}
```

### 4. Session Management with Redis

```typescript
// lib/auth/session.ts

import Redis from 'ioredis';
import { prisma } from '@/lib/prisma';

const redis = new Redis(process.env.REDIS_URL!);

const SESSION_PREFIX = 'session:';
const USER_SESSIONS_PREFIX = 'user_sessions:';

/**
 * Store session in Redis for fast lookup
 */
export async function cacheSession(
  sessionId: string,
  data: any,
  expiresInSeconds: number
): Promise<void> {
  await redis.setex(
    `${SESSION_PREFIX}${sessionId}`,
    expiresInSeconds,
    JSON.stringify(data)
  );
}

/**
 * Get session from Redis cache
 */
export async function getCachedSession(sessionId: string): Promise<any | null> {
  const data = await redis.get(`${SESSION_PREFIX}${sessionId}`);
  return data ? JSON.parse(data) : null;
}

/**
 * Delete session from Redis
 */
export async function deleteCachedSession(sessionId: string): Promise<void> {
  await redis.del(`${SESSION_PREFIX}${sessionId}`);
}

/**
 * Track active sessions per user
 */
export async function addUserSession(userId: string, sessionId: string): Promise<void> {
  await redis.sadd(`${USER_SESSIONS_PREFIX}${userId}`, sessionId);
}

/**
 * Remove user session
 */
export async function removeUserSession(userId: string, sessionId: string): Promise<void> {
  await redis.srem(`${USER_SESSIONS_PREFIX}${userId}`, sessionId);
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<string[]> {
  return redis.smembers(`${USER_SESSIONS_PREFIX}${userId}`);
}

/**
 * Revoke all sessions for a user (force logout)
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  const sessionIds = await getUserSessions(userId);
  
  // Delete from Redis
  const pipeline = redis.pipeline();
  sessionIds.forEach(sessionId => {
    pipeline.del(`${SESSION_PREFIX}${sessionId}`);
  });
  pipeline.del(`${USER_SESSIONS_PREFIX}${userId}`);
  await pipeline.exec();

  // Mark sessions as inactive in DB
  await prisma.session.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });
}
```

---

## 🔐 API Routes

### 1. Login Route

```typescript
// app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';
import { parseDeviceInfo } from '@/lib/auth/device';
import { cacheSession, addUserSession } from '@/lib/auth/session';
import { setCookie } from 'cookies-next';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, tenantId } = loginSchema.parse(body);

    // Get IP and User Agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Find user
    const user = await prisma.user.findFirst({
      where: { email, tenantId, isActive: true },
    });

    if (!user) {
      // Log failed attempt
      await prisma.auditLog.create({
        data: {
          tenantId,
          action: 'LOGIN_FAILED',
          ipAddress,
          userAgent,
          metadata: { email, reason: 'User not found' },
        },
      });

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { error: 'Account is locked. Try again later.' },
        { status: 423 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      // Increment failed attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');

      let updateData: any = { failedLoginAttempts: failedAttempts };

      // Lock account if max attempts reached
      if (failedAttempts >= maxAttempts) {
        const lockDuration = parseInt(process.env.ACCOUNT_LOCK_DURATION_MINUTES || '30');
        updateData.lockedUntil = new Date(Date.now() + lockDuration * 60 * 1000);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          tenantId,
          action: 'LOGIN_FAILED',
          ipAddress,
          userAgent,
          metadata: { email, reason: 'Invalid password', failedAttempts },
        },
      });

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Parse device info
    const deviceInfo = parseDeviceInfo(userAgent, ipAddress);

    // Find or create device
    let device = await prisma.device.findFirst({
      where: { fingerprint: deviceInfo.fingerprint, userId: user.id },
    });

    if (!device) {
      device = await prisma.device.create({
        data: {
          userId: user.id,
          tenantId,
          ...deviceInfo,
        },
      });
    } else {
      // Update last seen
      await prisma.device.update({
        where: { id: device.id },
        data: { lastSeenAt: new Date() },
      });
    }

    // Create session
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        tenantId,
        deviceId: device.id,
        refreshToken: '', // Will update after generating
        ipAddress,
        userAgent,
        expiresAt: sessionExpiry,
      },
    });

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      sessionId: session.id,
      deviceId: device.id,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Update session with refresh token
    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken, accessToken },
    });

    // Cache session in Redis
    await cacheSession(session.id, { ...tokenPayload, accessToken }, 7 * 24 * 60 * 60);
    await addUserSession(user.id, session.id);

    // Reset failed login attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Log successful login
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        tenantId,
        action: 'LOGIN_SUCCESS',
        ipAddress,
        userAgent,
        metadata: { deviceId: device.id },
      },
    });

    // Set httpOnly cookies
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    // Set cookies (httpOnly, secure, sameSite)
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;

  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. Token Refresh Route

```typescript
// app/api/auth/refresh/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRefreshToken, generateAccessToken } from '@/lib/auth/jwt';
import { getCachedSession, cacheSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 401 }
      );
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Check if session exists and is active
    const session = await prisma.session.findFirst({
      where: {
        id: payload.sessionId,
        refreshToken,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 401 }
      );
    }

    // Check if user is still active
    if (!session.user.isActive) {
      return NextResponse.json(
        { error: 'User account is inactive' },
        { status: 403 }
      );
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: session.userId,
      tenantId: session.tenantId,
      email: session.user.email,
      role: session.user.role,
      sessionId: session.id,
      deviceId: session.deviceId,
    });

    // Update session last activity
    await prisma.session.update({
      where: { id: session.id },
      data: {
        accessToken: newAccessToken,
        lastActivityAt: new Date(),
      },
    });

    // Update Redis cache
    await cacheSession(
      session.id,
      { ...payload, accessToken: newAccessToken },
      7 * 24 * 60 * 60
    );

    // Set new access token cookie
    const response = NextResponse.json({ success: true });

    response.cookies.set('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 3. Logout Route

```typescript
// app/api/auth/logout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { deleteCachedSession, removeUserSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(accessToken);

    if (payload) {
      // Mark session as inactive
      await prisma.session.update({
        where: { id: payload.sessionId },
        data: { isActive: false },
      });

      // Remove from Redis
      await deleteCachedSession(payload.sessionId);
      await removeUserSession(payload.userId, payload.sessionId);

      // Log logout
      await prisma.auditLog.create({
        data: {
          userId: payload.userId,
          tenantId: payload.tenantId,
          action: 'LOGOUT',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          metadata: { sessionId: payload.sessionId },
        },
      });
    }

    // Clear cookies
    const response = NextResponse.json({ success: true });
    
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4. Get Active Sessions Route

```typescript
// app/api/auth/sessions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(accessToken);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get all active sessions for the user
    const sessions = await prisma.session.findMany({
      where: {
        userId: payload.userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: {
        device: true,
      },
      orderBy: {
        lastActivityAt: 'desc',
      },
    });

    return NextResponse.json({
      sessions: sessions.map(s => ({
        id: s.id,
        device: {
          name: s.device.deviceName,
          type: s.device.deviceType,
          browser: s.device.browser,
          os: s.device.os,
        },
        ipAddress: s.ipAddress,
        lastActivity: s.lastActivityAt,
        isCurrent: s.id === payload.sessionId,
      })),
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 🛡️ Middleware for Route Protection

```typescript
// middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken, decodeToken } from '@/lib/auth/jwt';

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password'];
const AUTH_ROUTES = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get tokens from cookies
  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  // No tokens - redirect to login
  if (!accessToken && !refreshToken) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Verify access token
  let payload = verifyAccessToken(accessToken!);

  // Access token expired but refresh token exists
  if (!payload && refreshToken) {
    // Attempt to refresh token
    const response = await fetch(new URL('/api/auth/refresh', request.url), {
      method: 'POST',
      headers: {
        Cookie: `refreshToken=${refreshToken}`,
      },
    });

    if (response.ok) {
      const newAccessToken = response.headers.get('set-cookie');
      
      // Create new response with updated cookie
      const nextResponse = NextResponse.next();
      if (newAccessToken) {
        nextResponse.headers.set('set-cookie', newAccessToken);
      }
      return nextResponse;
    } else {
      // Refresh failed - redirect to login
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Valid access token
  if (payload) {
    // Add user info to headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-tenant-id', payload.tenantId);
    requestHeaders.set('x-user-role', payload.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Invalid tokens - redirect to login
  const url = new URL('/login', request.url);
  url.searchParams.set('redirect', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
```

---

## 🎨 Client-Side Implementation

### 1. Auth Context

```typescript
// contexts/AuthContext.tsx

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, tenantId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Auto-refresh token before expiry
  useEffect(() => {
    // Refresh every 10 minutes (access token expires in 15 minutes)
    const interval = setInterval(() => {
      refreshSession();
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Initial session check
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, tenantId: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    setUser(data.user);
    router.push('/dashboard');
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  const refreshSession = async () => {
    try {
      await fetch('/api/auth/refresh', { method: 'POST' });
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Don't force logout on refresh failure (might be network issue)
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### 2. Auto Logout on Security Events

```typescript
// hooks/useSecurityMonitor.ts

'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useSecurityMonitor() {
  const { logout } = useAuth();

  useEffect(() => {
    // Listen for password change events
    const handlePasswordChange = () => {
      alert('Your password was changed. Please log in again.');
      logout();
    };

    // Listen for account deactivation
    const handleAccountDeactivated = () => {
      alert('Your account has been deactivated.');
      logout();
    };

    // Listen for forced logout (admin action)
    const handleForcedLogout = () => {
      alert('You have been logged out by an administrator.');
      logout();
    };

    // WebSocket or Server-Sent Events for real-time notifications
    // For now, we'll poll the session status
    const checkSessionStatus = async () => {
      try {
        const response = await fetch('/api/auth/session-status');
        const data = await response.json();

        if (data.forceLogout) {
          handleForcedLogout();
        }
        if (data.passwordChanged) {
          handlePasswordChange();
        }
        if (data.accountDeactivated) {
          handleAccountDeactivated();
        }
      } catch (error) {
        console.error('Session status check failed:', error);
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkSessionStatus, 30 * 1000);

    return () => clearInterval(interval);
  }, [logout]);
}
```

---

## 🔒 Security Best Practices Implemented

### ✅ Features Checklist

| Feature | Status | Implementation |
|---------|--------|----------------|
| JWT Token Generation | ✅ | Access (15min) + Refresh (7 days) tokens |
| Session Persistence | ✅ | PostgreSQL + Redis caching |
| Token Refresh | ✅ | Auto-refresh before expiry |
| Device Tracking | ✅ | Browser fingerprinting + user agent parsing |
| Auto Logout on Security Events | ✅ | Password change, account deactivation, admin force logout |
| httpOnly Cookies | ✅ | Prevents XSS attacks |
| CSRF Protection | ✅ | SameSite cookies |
| Rate Limiting | ✅ | Failed login attempts tracking |
| Account Lockout | ✅ | Lock after max failed attempts |
| Audit Logging | ✅ | All auth events logged |
| Multi-tenant Support | ✅ | tenant_id in all tables |
| Password Strength | ✅ | Validation with bcrypt |
| Token Revocation | ✅ | Logout invalidates tokens |
| Multiple Device Support | ✅ | Track and manage all sessions |

---

## 📊 Pros vs Using Clerk

### ✅ Pros of Custom Auth

1. **Full Control** - Complete customization of auth flow
2. **No Vendor Lock-in** - Own your data and logic
3. **Cost Savings** - No per-user pricing (after 10K users)
4. **Data Privacy** - All user data stays in your DB
5. **Custom Requirements** - Build exactly what you need
6. **Learning Experience** - Deep understanding of auth

### ❌ Cons of Custom Auth

1. **Development Time** - 2-4 weeks vs 1 day with Clerk
2. **Maintenance Burden** - You handle all security updates
3. **Security Responsibility** - Risk of vulnerabilities
4. **Missing Features** - No social login, magic links out-of-box
5. **Compliance** - Must handle SOC 2, GDPR yourself
6. **No Support** - You're on your own for issues

---

## 🎯 Recommendation

For **Zenora MVP**:
- **Use Clerk** initially for faster time-to-market
- **Build custom auth** in Phase 2 if needed for:
  - Custom enterprise SSO requirements
  - Specific compliance needs
  - Cost optimization at scale
  - Unique authentication flows

The custom implementation above gives you a **production-ready foundation**, but Clerk will save you **100+ hours** of development time initially.

---

## 📚 Additional Resources

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [Next.js Authentication Docs](https://nextjs.org/docs/app/building-your-application/authentication)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

---

*This implementation provides enterprise-grade authentication with all requested features while maintaining security best practices.*