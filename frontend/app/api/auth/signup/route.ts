/**
 * Signup API Route
 * POST /api/auth/signup
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { PrismaClient, Role } from '@prisma/client';
import {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  validatePasswordStrength,
  getTokenExpiryDate,
} from '@/lib/auth';

const prisma = new PrismaClient();

// Validation schema
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  organizationName: z.string().min(2, 'Organization name is required'),
  role: z.nativeEnum(Role).optional().default(Role.ADMIN), // First user is admin
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = signupSchema.safeParse(body);

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

    const { email, password, name, organizationName, role } = validation.data;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password does not meet requirements',
          details: passwordValidation.errors,
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email already registered',
        },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create tenant (organization)
    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    const finalSlug = existingTenant ? `${slug}-${Date.now()}` : slug;

    // Create tenant and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: organizationName,
          slug: finalSlug,
        },
      });

      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          firstName: name.split(' ')[0] || name,
          lastName: name.split(' ').slice(1).join(' ') || name,
          role,
          tenantId: tenant.id,
          isActive: true,
          emailVerified: false,
        },
        include: {
          tenant: true,
        },
      });

      return { tenant, user };
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: result.user.id,
      tenantId: result.user.tenantId,
      email: result.user.email,
      role: result.user.role,
      name: result.user.name,
    });

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: result.user.id,
        sessionId: crypto.randomBytes(32).toString('hex'),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        expiresAt: getTokenExpiryDate(process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
      },
    });

    const refreshToken = generateRefreshToken({
      userId: result.user.id,
      tenantId: result.user.tenantId,
      sessionId: session.id,
    });

    // Create response
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          tenantId: result.user.tenantId,
          tenantName: result.tenant.name,
        },
        accessToken,
      },
    });

    // Set cookies
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during signup',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
