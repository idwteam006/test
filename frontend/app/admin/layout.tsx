'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderKanban,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  User,
  ChevronDown,
  ChevronRight,
  Zap,
  UserPlus,
  Upload,
  BarChart3,
  FileText,
  Database,
  RefreshCw,
  Eye,
  AlertTriangle,
  MessageSquare,
  DollarSign,
  Building,
  Clock,
  Network,
  Receipt,
  GraduationCap,
  Target,
  Award,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const navigationItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'System Users', href: '/admin/system-users', icon: User },
  { name: 'Employees', href: '/admin/employees', icon: Users },
  { name: 'Org Chart', href: '/admin/org-chart', icon: Network },
  { name: 'Clients', href: '/admin/clients', icon: Building2 },
  { name: 'Projects', href: '/admin/projects', icon: FolderKanban },
  {
    name: 'Leave',
    icon: Calendar,
    subItems: [
      { name: 'My Leave', href: '/admin/leave' },
      { name: 'Leave Approvals', href: '/admin/leave-approvals' },
      { name: 'Balance Management', href: '/admin/leave/balance-management' },
      { name: 'Reports & Analytics', href: '/admin/leave/reports' },
    ],
  },
  {
    name: 'Timesheets',
    icon: Clock,
    subItems: [
      { name: 'Add Timesheet', href: '/admin/timesheets' },
      { name: 'Approval Timesheet', href: '/admin/timesheet-approvals' },
    ],
  },
  {
    name: 'Expenses',
    icon: Receipt,
    subItems: [
      { name: 'Add Expense', href: '/admin/expenses' },
      { name: 'Expense Approvals', href: '/admin/expense-approvals' },
    ],
  },
  { name: 'Invoices', href: '/admin/invoices', icon: FileText },
  { name: 'Payroll', href: '/admin/payroll', icon: DollarSign },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { name: 'Performance', href: '/admin/performance', icon: Award },
  { name: 'Learning', href: '/admin/learning', icon: GraduationCap },
  { name: 'Goals', href: '/admin/goals', icon: Target },
  { name: 'Onboarding', href: '/admin/onboarding', icon: UserPlus },
  { name: 'Organization', href: '/admin/organization', icon: Building },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

const quickActions = [
  { icon: UserPlus, label: 'Add User', color: 'text-blue-600', action: '/admin/employees/new' },
  { icon: Upload, label: 'Import Users', color: 'text-purple-600', action: '/admin/employees/import' },
  { icon: Search, label: 'Search Users', color: 'text-green-600', action: '/admin/employees' },
  { icon: BarChart3, label: 'Generate Report', color: 'text-orange-600', action: '/admin/reports' },
  { icon: Bell, label: 'Send Announcement', color: 'text-red-600', action: 'coming-soon' },
  { icon: FileText, label: 'View Invoices', color: 'text-slate-600', action: '/admin/invoices' },
  { icon: Settings, label: 'System Settings', color: 'text-indigo-600', action: '/admin/settings' },
  { icon: DollarSign, label: 'Process Payroll', color: 'text-emerald-600', action: '/admin/payroll' },
  { icon: RefreshCw, label: 'Review Onboarding', color: 'text-cyan-600', action: '/admin/onboarding' },
  { icon: Eye, label: 'Monitor System', color: 'text-violet-600', action: 'coming-soon' },
  { icon: AlertTriangle, label: 'View Alerts', color: 'text-yellow-600', action: 'coming-soon' },
  { icon: MessageSquare, label: 'Broadcast Message', color: 'text-pink-600', action: 'coming-soon' },
  { icon: Users, label: 'Manage Departments', color: 'text-teal-600', action: 'coming-soon' },
  { icon: Building, label: 'Organization Settings', color: 'text-amber-600', action: '/admin/organization' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
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
    // Fetch user info
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setUser(data.data);
          // Check if user has admin/manager/HR access
          if (!['ADMIN', 'MANAGER', 'HR'].includes(data.data.role)) {
            toast.error('Access denied', {
              description: 'You do not have permission to access this area',
            });
            router.push('/dashboard');
          }
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
                <p className="text-xs text-slate-500">Admin Panel</p>
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
            <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
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
                    onClick={() => router.push('/admin/profile')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    Profile Settings
                  </button>
                  <button
                    onClick={() => router.push('/admin/settings')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    System Settings
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
          {navigationItems.map((item: any) => {
            const Icon = item.icon;

            // Check if this item or any of its sub-items are active
            const isActive = item.href
              ? pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
              : item.subItems?.some((sub: any) => pathname === sub.href || pathname.startsWith(sub.href));

            const isExpanded = expandedMenus[item.name];

            if (item.subItems) {
              return (
                <div key={item.name} className="mb-1">
                  <button
                    onClick={() => setExpandedMenus({ ...expandedMenus, [item.name]: !isExpanded })}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{item.name}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.subItems.map((subItem: any) => {
                        const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href);
                        return (
                          <button
                            key={subItem.href}
                            onClick={() => router.push(subItem.href)}
                            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all text-left ${
                              isSubActive
                                ? 'bg-purple-100 text-purple-700 font-medium'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {subItem.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

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
