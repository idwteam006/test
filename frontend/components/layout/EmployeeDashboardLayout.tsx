'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Clock,
  Calendar,
  User,
  FileText,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Zap,
  Search,
  FolderKanban,
  Users,
  MessageSquare,
  HelpCircle,
  ClipboardCheck,
  Award,
  GraduationCap,
  Briefcase,
  Target,
  Package,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { NotificationBell } from '@/components/ui/notification-bell';

interface EmployeeDashboardLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { name: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
  { name: 'My Profile', href: '/employee/profile', icon: User },
  { name: 'Attendance', href: '/employee/attendance', icon: ClipboardCheck },
  { name: 'Timesheets', href: '/employee/timesheets', icon: Clock },
  { name: 'Leave Management', href: '/employee/leave', icon: Calendar },
  { name: 'My Tasks', href: '/employee/tasks', icon: FolderKanban },
  { name: 'Meetings', href: '/employee/meetings', icon: Video },
  { name: 'Payslips', href: '/employee/payslips', icon: DollarSign },
  { name: 'Expenses', href: '/employee/expenses', icon: Briefcase },
  { name: 'Learning', href: '/employee/learning', icon: GraduationCap },
  { name: 'Goals', href: '/employee/goals', icon: Target },
  { name: 'My Assets', href: '/employee/assets', icon: Package },
  { name: 'Team', href: '/employee/team', icon: Users },
  { name: 'Team Requests', href: '/employee/team-requests', icon: MessageSquare },
];

const quickActions = [
  { icon: ClipboardCheck, label: 'Clock In/Out', color: 'text-blue-600', action: '/employee/attendance' },
  { icon: Clock, label: 'Log Time', color: 'text-indigo-600', action: '/employee/timesheets' },
  { icon: Video, label: 'My Meetings', color: 'text-blue-600', action: '/employee/meetings' },
  { icon: Calendar, label: 'Apply Leave', color: 'text-purple-600', action: '/employee/leave' },
  { icon: Briefcase, label: 'Submit Expense', color: 'text-orange-600', action: '/employee/expenses' },
  { icon: User, label: 'Update Profile', color: 'text-green-600', action: '/employee/profile' },
  { icon: GraduationCap, label: 'My Courses', color: 'text-pink-600', action: '/employee/learning' },
  { icon: Award, label: 'Give Recognition', color: 'text-yellow-600', action: '/employee/recognition' },
];

export default function EmployeeDashboardLayout({ children }: EmployeeDashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    // Fetch user info
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setUser(data.data);
        } else {
          router.push('/auth/login');
        }
      })
      .catch(() => {
        router.push('/auth/login');
      })
      .finally(() => setLoading(false));
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 shadow-sm z-40">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Zenora.ai</h1>
                <p className="text-xs text-slate-500">Employee Portal</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none outline-none text-sm w-64"
              />
            </div>

            {/* Notifications */}
            <NotificationBell />

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium text-slate-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-slate-500">{user?.role}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* User Dropdown */}
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2"
                >
                  <div className="px-4 py-3 border-b border-slate-200">
                    <p className="text-sm font-medium text-slate-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => router.push('/employee/profile')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    My Profile
                  </button>
                  <div className="border-t border-slate-200 mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-slate-200 shadow-lg overflow-y-auto transition-transform duration-300 z-30 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Main Navigation */}
        <nav className="p-4 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Main Menu</p>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/employee/dashboard' && pathname.startsWith(item.href));
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all mb-1 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-purple-600" />
            <p className="text-xs font-semibold text-slate-500 uppercase">Quick Actions</p>
          </div>
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleQuickAction(action.action)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 rounded-lg transition-all group"
            >
              <action.icon className={`w-4 h-4 ${action.color} group-hover:scale-110 transition-transform`} />
              <span className="group-hover:translate-x-1 transition-transform">{action.label}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`pt-16 transition-all duration-300 ${
          sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'
        }`}
      >
        <div className="min-h-[calc(100vh-8rem)]">
          {children}
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-6 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <p className="text-sm font-medium text-slate-900">Zenora.ai</p>
                <p className="text-xs text-slate-500">
                  Employee Management System © {new Date().getFullYear()}
                </p>
              </div>
              <div className="flex items-center gap-6 text-xs text-slate-600">
                <a href="#" className="hover:text-purple-600 transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="hover:text-purple-600 transition-colors">
                  Terms of Service
                </a>
                <a href="#" className="hover:text-purple-600 transition-colors">
                  Support
                </a>
                <a href="#" className="hover:text-purple-600 transition-colors">
                  Documentation
                </a>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-slate-600">System Healthy</span>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
