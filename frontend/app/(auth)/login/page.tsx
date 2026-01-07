'use client';

/**
 * Login Page - DEPRECATED
 * Redirects to new passwordless auth at /auth/login
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function OldLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to new passwordless login
    router.replace('/auth/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to passwordless login...</p>
      </div>
    </div>
  );
}
