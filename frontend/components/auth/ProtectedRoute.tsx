'use client';

/**
 * Protected Route Component
 * Ensures user is authenticated and has required permissions
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Shield } from 'lucide-react';
import { Role } from '@prisma/client';
import { hasPermission, Permission } from '@/lib/rbac';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  requiredRole?: Role;
  fallbackUrl?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
}

export default function ProtectedRoute({
  children,
  requiredPermission,
  requiredRole,
  fallbackUrl = '/login',
}: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('[ProtectedRoute] Checking authentication...');
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Ensure cookies are sent
      });

      console.log('[ProtectedRoute] Response status:', response.status);

      if (!response.ok) {
        console.log('[ProtectedRoute] Not authenticated, redirecting to login');
        router.push(`${fallbackUrl}?redirect=${window.location.pathname}`);
        return;
      }

      const data = await response.json();
      console.log('[ProtectedRoute] User data:', data);

      if (data.success) {
        const userData = data.data;
        setUser(userData);

        // Check if user has required permission
        if (requiredPermission && !hasPermission(userData.role, requiredPermission)) {
          console.log('[ProtectedRoute] Permission denied');
          router.push('/unauthorized');
          return;
        }

        // Check if user has required role
        if (requiredRole && userData.role !== requiredRole) {
          console.log('[ProtectedRoute] Role mismatch');
          router.push('/unauthorized');
          return;
        }

        console.log('[ProtectedRoute] Authorization successful');
        setAuthorized(true);
      } else {
        console.log('[ProtectedRoute] Invalid response, redirecting');
        router.push(fallbackUrl);
      }
    } catch (error) {
      console.error('[ProtectedRoute] Auth check error:', error);
      router.push(fallbackUrl);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white text-lg font-medium"
          >
            Verifying access...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
