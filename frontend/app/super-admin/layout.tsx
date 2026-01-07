'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  User,
  ChevronDown,
  Zap,
  Shield,
  Database,
  Activity,
  Globe,
  Key,
  FileText,
  BarChart3,
  Sun,
} from 'lucide-react';
import { toast } from 'sonner';

const navigationItems = [
  { name: 'Dashboard', href: '/super-admin', icon: LayoutDashboard },
  { name: 'System Health', href: '/super-admin/health', icon: Activity },
  { name: 'API Keys', href: '/super-admin/api-keys', icon: Key },
  { name: 'Audit Logs', href: '/super-admin/audit-logs', icon: FileText },
  { name: 'Analytics', href: '/super-admin/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/super-admin/settings', icon: Settings },
];

const quickActions = [
  { icon: Activity, label: 'System Status', color: 'text-emerald-600', bgColor: 'bg-emerald-50', action: '/super-admin/health' },
  { icon: FileText, label: 'View Audit Logs', color: 'text-amber-600', bgColor: 'bg-amber-50', action: '/super-admin/audit-logs' },
  { icon: Database, label: 'Database Stats', color: 'text-cyan-600', bgColor: 'bg-cyan-50', action: 'coming-soon' },
  { icon: Globe, label: 'Global Settings', color: 'text-indigo-600', bgColor: 'bg-indigo-50', action: '/super-admin/settings' },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setUser(data.data);
          if (data.data.role !== 'ADMIN' && data.data.role !== 'SUPER_ADMIN') {
            toast.error('Super Admin access required', {
              description: 'You do not have permission to access this area',
            });
            router.push('/dashboard');
            return;
          }
          setLoading(false);
        } else {
          router.push('/auth/login');
        }
      })
      .catch(() => {
        router.push('/auth/login');
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Logged out successfully');
        router.push('/auth/login');
      } else {
        toast.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Network error');
    }
  };

  const handleQuickAction = (action: string) => {
    if (action === 'coming-soon') {
      toast.info('Coming Soon', {
        description: 'This feature is under development',
      });
    } else {
      router.push(action);
    }
  };

  // Loading state
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-violet-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading Super Admin...</p>
        </div>
      </div>
    );
  }

  // Unauthorized state
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-violet-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm z-40">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors lg:hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-slate-700" /> : <Menu className="w-5 h-5 text-slate-700" />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">Zenora.ai</h1>
                <p className="text-xs text-violet-600 font-medium">Super Admin</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-slate-100/80 hover:bg-slate-100 rounded-xl border border-slate-200/50 transition-colors">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none outline-none text-sm w-64 text-slate-700 placeholder-slate-400"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-2.5 hover:bg-slate-100 rounded-xl transition-colors">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            </button>

            {/* Back to Admin */}
            <button
              onClick={() => router.push('/admin')}
              className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Admin Panel
            </button>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-semibold text-slate-800">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-violet-600">{user?.role}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* User Dropdown */}
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                      <p className="text-sm font-semibold text-slate-800">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => router.push('/admin/profile')}
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        Profile Settings
                      </button>
                      <button
                        onClick={() => router.push('/admin')}
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-slate-400" />
                        Go to Admin Panel
                      </button>
                    </div>
                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200/80 shadow-sm overflow-y-auto transition-transform duration-300 z-30 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Main Navigation */}
        <nav className="p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">Navigation</p>
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/super-admin' && pathname.startsWith(item.href));
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Quick Actions */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3 px-3">
            <Zap className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Actions</p>
          </div>
          <div className="space-y-1">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action.action)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-all group"
              >
                <div className={`p-1.5 rounded-lg ${action.bgColor} group-hover:scale-110 transition-transform`}>
                  <action.icon className={`w-4 h-4 ${action.color}`} />
                </div>
                <span className="group-hover:translate-x-0.5 transition-transform">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="p-4 border-t border-slate-100">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-slate-500">System Status</span>
            </div>
            <p className="text-sm font-semibold text-emerald-700">All Systems Operational</p>
            <p className="text-xs text-emerald-600 mt-1">Last checked: Just now</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pt-16 lg:pl-72 transition-all duration-300">
        <div className="min-h-[calc(100vh-8rem)] p-6">
          {children}
        </div>

        {/* Footer */}
        <footer className="bg-white/60 backdrop-blur-sm border-t border-slate-200/80 py-6 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <p className="text-sm font-semibold text-slate-700">Zenora.ai</p>
                <p className="text-xs text-slate-400">
                  Super Admin Console © {new Date().getFullYear()}
                </p>
              </div>
              <div className="flex items-center gap-6 text-xs text-slate-500">
                <a href="#" className="hover:text-violet-600 transition-colors">
                  Documentation
                </a>
                <a href="#" className="hover:text-violet-600 transition-colors">
                  API Reference
                </a>
                <a href="#" className="hover:text-violet-600 transition-colors">
                  Support
                </a>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-emerald-700">Connected</span>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
