/**
 * Login API Route
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  getTokenExpiryDate,
} from '@/lib/auth';
import { sessions } from '@/lib/redis';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password',
        },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account is inactive. Please contact administrator.',
        },
        { status: 403 }
      );
    }

    // Check if tenant is active
    if (!user.tenant.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organization account is inactive. Please contact support.',
        },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password',
        },
        { status: 401 }
      );
    }

    // Get request metadata
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const deviceFingerprint = crypto.createHash('sha256').update(`${ipAddress}:${userAgent}`).digest('hex');

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    // Create session in Redis (8-hour duration) with tenantId
    const sessionId = await sessions.create(
      user.id,
      user.tenantId,
      user.email,
      user.role,
      user.status,
      {
        ipAddress,
        userAgent,
        deviceFingerprint,
      }
    );

    // Create session record in database
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        sessionId,
        ipAddress,
        userAgent,
        deviceFingerprint,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
        lastActivityAt: new Date(),
      },
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      tenantId: user.tenantId,
      sessionId: session.id,
    });

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        lastLoginDevice: userAgent.substring(0, 255),
      },
    });

    // Create response with cookies
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: user.tenant.name,
        },
        accessToken,
      },
    });

    // Set session cookie (primary authentication cookie for API routes)
    response.cookies.set('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/',
    });

    // Set cookies with explicit domain for localhost
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: false, // Temporarily false for debugging
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
      domain: process.env.NODE_ENV === 'development' ? 'localhost' : undefined,
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false, // Temporarily false for debugging
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      domain: process.env.NODE_ENV === 'development' ? 'localhost' : undefined,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);

    // More detailed error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = process.env.NODE_ENV === 'development' ? errorMessage : 'An error occurred during login';

    return NextResponse.json(
      {
        success: false,
        error: errorDetails,
        ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined }),
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
