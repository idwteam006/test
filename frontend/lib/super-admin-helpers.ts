import { NextRequest } from 'next/server';
import { getUserFromSession } from './auth-helpers';

/**
 * Check if user is a super admin
 */
export async function isSuperAdmin(request: NextRequest): Promise<boolean> {
  const user = await getUserFromSession(request);
  return user?.role === 'SUPER_ADMIN';
}

/**
 * Get super admin user or throw error
 */
export async function requireSuperAdmin(request: NextRequest) {
  const user = await getUserFromSession(request);

  if (!user) {
    throw new Error('Not authenticated');
  }

  if (user.role !== 'SUPER_ADMIN') {
    throw new Error('Super admin access required');
  }

  return user;
}
