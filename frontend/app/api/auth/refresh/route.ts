/**
 * Refresh Token API Route
 * POST /api/auth/refresh
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  getTokenExpiryDate,
} from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookies
    const oldRefreshToken = request.cookies.get('refreshToken')?.value;

    if (!oldRefreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'No refresh token provided',
        },
        { status: 401 }
      );
    }

    // Verify refresh token
    const payload = verifyRefreshToken(oldRefreshToken);

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid refresh token',
        },
        { status: 401 }
      );
    }

    // Check if session exists and is valid
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: {
        user: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found',
        },
        { status: 401 }
      );
    }

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      // Delete expired session
      await prisma.session.delete({
        where: { id: session.id },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Session expired',
        },
        { status: 401 }
      );
    }

    // Check if user is still active
    if (!session.user.isActive || !session.user.tenant.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account is inactive',
        },
        { status: 403 }
      );
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      email: session.user.email,
      role: session.user.role,
      name: session.user.name,
    });

    // Generate new refresh token
    const newRefreshToken = generateRefreshToken({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      sessionId: session.id,
    });

    // Update session expiry
    await prisma.session.update({
      where: { id: session.id },
      data: {
        expiresAt: getTokenExpiryDate(process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
        lastActivityAt: new Date(),
      },
    });

    // Create response
    const response = NextResponse.json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });

    // Set new cookies
    response.cookies.set('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
    });

    response.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during token refresh',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
