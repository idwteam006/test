/**
 * Next.js Middleware
 * Global authentication and authorization middleware
 *
 * PASSWORDLESS AUTH:
 * - Session validation delegated to API routes (Redis check)
 * - Middleware only checks for session cookie presence
 * - Adds security headers to all responses
 *
 * NOTE: Middleware runs in Edge Runtime - limited Node.js APIs
 */

import { NextRequest, NextResponse } from 'next/server';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/', // Public homepage/landing page
  '/features', // Public features/roles page
  '/pricing', // Public pricing page
  '/contact', // Public contact page
  '/auth/login',
  '/auth/verify',
  '/onboard', // Employee onboarding (uses token authentication)
  '/api/auth/request-code',
  '/api/auth/verify-code',
  '/api/auth/verify',
  '/api/contact', // Public contact form submission
  '/api/onboard', // Onboarding API endpoints (use token auth)
  '/api/upload', // File upload (handles both token and session auth internally)
  '/api/health',
  '/api/debug', // REMOVE IN PRODUCTION
  '/api/seed', // REMOVE IN PRODUCTION
  '/api/test-invoice-email', // Test endpoint for invoice email
  '/api/test-complete-invoice', // Test endpoint for complete invoice with S3
  '/api/system/enable-dev-mode', // Emergency dev mode toggle (REMOVE AFTER USE)
];

// API routes that require authentication
const PROTECTED_API_ROUTES = ['/api'];

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Strict-Transport-Security (HSTS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none';"
  );

  // X-Frame-Options
  response.headers.set('X-Frame-Options', 'DENY');

  // X-Content-Type-Options
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Referrer-Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=*'
  );

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  const isPublicRoute = PUBLIC_ROUTES.some((route) => {
    if (route === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(route);
  });

  if (isPublicRoute) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // Get session cookie (passwordless auth)
  const sessionId = request.cookies.get('session')?.value;

  // No session - redirect to login
  if (!sessionId) {
    if (pathname.startsWith('/api')) {
      const response = NextResponse.json(
        { success: false, error: 'Not authenticated', code: 'NO_SESSION' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    // Redirect to login page with return URL
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    return addSecurityHeaders(response);
  }

  // Session exists - allow request (validation happens in API routes)
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
