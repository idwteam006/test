/**
 * Role-Based Access Control (RBAC) System
 * Centralized permissions and access control for Zenora.ai
 */

import { Role } from '@prisma/client';

// Define permissions for each role
export enum Permission {
  // User Management
  VIEW_USERS = 'view_users',
  CREATE_USERS = 'create_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',

  // Employee Management
  VIEW_EMPLOYEES = 'view_employees',
  CREATE_EMPLOYEES = 'create_employees',
  EDIT_EMPLOYEES = 'edit_employees',
  DELETE_EMPLOYEES = 'delete_employees',
  VIEW_ALL_EMPLOYEES = 'view_all_employees', // See all employees (not just subordinates)

  // Department Management
  VIEW_DEPARTMENTS = 'view_departments',
  CREATE_DEPARTMENTS = 'create_departments',
  EDIT_DEPARTMENTS = 'edit_departments',
  DELETE_DEPARTMENTS = 'delete_departments',

  // Timesheet Management
  VIEW_TIMESHEETS = 'view_timesheets',
  CREATE_TIMESHEETS = 'create_timesheets',
  EDIT_TIMESHEETS = 'edit_timesheets',
  DELETE_TIMESHEETS = 'delete_timesheets',
  APPROVE_TIMESHEETS = 'approve_timesheets',
  VIEW_ALL_TIMESHEETS = 'view_all_timesheets',

  // Leave Management
  VIEW_LEAVES = 'view_leaves',
  CREATE_LEAVES = 'create_leaves',
  EDIT_LEAVES = 'edit_leaves',
  DELETE_LEAVES = 'delete_leaves',
  APPROVE_LEAVES = 'approve_leaves',
  VIEW_ALL_LEAVES = 'view_all_leaves',

  // Performance Management
  VIEW_PERFORMANCE = 'view_performance',
  CREATE_PERFORMANCE = 'create_performance',
  EDIT_PERFORMANCE = 'edit_performance',
  DELETE_PERFORMANCE = 'delete_performance',
  VIEW_ALL_PERFORMANCE = 'view_all_performance',

  // Project Management
  VIEW_PROJECTS = 'view_projects',
  CREATE_PROJECTS = 'create_projects',
  EDIT_PROJECTS = 'edit_projects',
  DELETE_PROJECTS = 'delete_projects',
  VIEW_ALL_PROJECTS = 'view_all_projects',

  // Client Management
  VIEW_CLIENTS = 'view_clients',
  CREATE_CLIENTS = 'create_clients',
  EDIT_CLIENTS = 'edit_clients',
  DELETE_CLIENTS = 'delete_clients',

  // Invoice Management
  VIEW_INVOICES = 'view_invoices',
  CREATE_INVOICES = 'create_invoices',
  EDIT_INVOICES = 'edit_invoices',
  DELETE_INVOICES = 'delete_invoices',
  APPROVE_INVOICES = 'approve_invoices',

  // Payroll Management
  VIEW_PAYROLL = 'view_payroll',
  CREATE_PAYROLL = 'create_payroll',
  EDIT_PAYROLL = 'edit_payroll',
  DELETE_PAYROLL = 'delete_payroll',
  PROCESS_PAYROLL = 'process_payroll',
  VIEW_ALL_PAYROLL = 'view_all_payroll',

  // Reports
  VIEW_REPORTS = 'view_reports',
  GENERATE_REPORTS = 'generate_reports',
  EXPORT_REPORTS = 'export_reports',

  // Settings
  VIEW_SETTINGS = 'view_settings',
  EDIT_SETTINGS = 'edit_settings',

  // Tenant Management
  MANAGE_TENANT = 'manage_tenant',
}

// Role-Permission Mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // SUPER_ADMIN - Full platform access across all tenants
  [Role.SUPER_ADMIN]: Object.values(Permission),

  // ADMIN - Full access to everything
  [Role.ADMIN]: [
    // Users
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.EDIT_USERS,
    Permission.DELETE_USERS,

    // Employees
    Permission.VIEW_EMPLOYEES,
    Permission.CREATE_EMPLOYEES,
    Permission.EDIT_EMPLOYEES,
    Permission.DELETE_EMPLOYEES,
    Permission.VIEW_ALL_EMPLOYEES,

    // Departments
    Permission.VIEW_DEPARTMENTS,
    Permission.CREATE_DEPARTMENTS,
    Permission.EDIT_DEPARTMENTS,
    Permission.DELETE_DEPARTMENTS,

    // Timesheets
    Permission.VIEW_TIMESHEETS,
    Permission.CREATE_TIMESHEETS,
    Permission.EDIT_TIMESHEETS,
    Permission.DELETE_TIMESHEETS,
    Permission.APPROVE_TIMESHEETS,
    Permission.VIEW_ALL_TIMESHEETS,

    // Leave
    Permission.VIEW_LEAVES,
    Permission.CREATE_LEAVES,
    Permission.EDIT_LEAVES,
    Permission.DELETE_LEAVES,
    Permission.APPROVE_LEAVES,
    Permission.VIEW_ALL_LEAVES,

    // Performance
    Permission.VIEW_PERFORMANCE,
    Permission.CREATE_PERFORMANCE,
    Permission.EDIT_PERFORMANCE,
    Permission.DELETE_PERFORMANCE,
    Permission.VIEW_ALL_PERFORMANCE,

    // Projects
    Permission.VIEW_PROJECTS,
    Permission.CREATE_PROJECTS,
    Permission.EDIT_PROJECTS,
    Permission.DELETE_PROJECTS,
    Permission.VIEW_ALL_PROJECTS,

    // Clients
    Permission.VIEW_CLIENTS,
    Permission.CREATE_CLIENTS,
    Permission.EDIT_CLIENTS,
    Permission.DELETE_CLIENTS,

    // Invoices
    Permission.VIEW_INVOICES,
    Permission.CREATE_INVOICES,
    Permission.EDIT_INVOICES,
    Permission.DELETE_INVOICES,
    Permission.APPROVE_INVOICES,

    // Payroll
    Permission.VIEW_PAYROLL,
    Permission.CREATE_PAYROLL,
    Permission.EDIT_PAYROLL,
    Permission.DELETE_PAYROLL,
    Permission.PROCESS_PAYROLL,
    Permission.VIEW_ALL_PAYROLL,

    // Reports
    Permission.VIEW_REPORTS,
    Permission.GENERATE_REPORTS,
    Permission.EXPORT_REPORTS,

    // Settings
    Permission.VIEW_SETTINGS,
    Permission.EDIT_SETTINGS,

    // Tenant
    Permission.MANAGE_TENANT,
  ],

  // MANAGER - Manage team and approve requests
  [Role.MANAGER]: [
    // Employees (view all, edit team members)
    Permission.VIEW_EMPLOYEES,
    Permission.VIEW_ALL_EMPLOYEES,
    Permission.EDIT_EMPLOYEES,

    // Departments
    Permission.VIEW_DEPARTMENTS,

    // Timesheets (view and approve for team)
    Permission.VIEW_TIMESHEETS,
    Permission.CREATE_TIMESHEETS,
    Permission.EDIT_TIMESHEETS,
    Permission.APPROVE_TIMESHEETS,
    Permission.VIEW_ALL_TIMESHEETS,

    // Leave (view and approve for team)
    Permission.VIEW_LEAVES,
    Permission.CREATE_LEAVES,
    Permission.APPROVE_LEAVES,
    Permission.VIEW_ALL_LEAVES,

    // Performance (manage team performance)
    Permission.VIEW_PERFORMANCE,
    Permission.CREATE_PERFORMANCE,
    Permission.EDIT_PERFORMANCE,
    Permission.VIEW_ALL_PERFORMANCE,

    // Projects
    Permission.VIEW_PROJECTS,
    Permission.CREATE_PROJECTS,
    Permission.EDIT_PROJECTS,
    Permission.VIEW_ALL_PROJECTS,

    // Reports
    Permission.VIEW_REPORTS,
    Permission.GENERATE_REPORTS,
  ],

  // HR - Employee management and HR functions
  [Role.HR]: [
    // Employees (full access for HR purposes)
    Permission.VIEW_EMPLOYEES,
    Permission.CREATE_EMPLOYEES,
    Permission.EDIT_EMPLOYEES,
    Permission.VIEW_ALL_EMPLOYEES,

    // Departments
    Permission.VIEW_DEPARTMENTS,
    Permission.CREATE_DEPARTMENTS,
    Permission.EDIT_DEPARTMENTS,

    // Leave (approve and manage all leave requests)
    Permission.VIEW_LEAVES,
    Permission.CREATE_LEAVES,
    Permission.EDIT_LEAVES,
    Permission.APPROVE_LEAVES,
    Permission.VIEW_ALL_LEAVES,

    // Performance (view and manage all performance reviews)
    Permission.VIEW_PERFORMANCE,
    Permission.CREATE_PERFORMANCE,
    Permission.EDIT_PERFORMANCE,
    Permission.VIEW_ALL_PERFORMANCE,

    // Timesheets (view for attendance tracking)
    Permission.VIEW_TIMESHEETS,
    Permission.VIEW_ALL_TIMESHEETS,

    // Reports (HR reports)
    Permission.VIEW_REPORTS,
    Permission.GENERATE_REPORTS,
    Permission.EXPORT_REPORTS,
  ],

  // EMPLOYEE - Basic access to own data
  [Role.EMPLOYEE]: [
    // Employees (view own profile)
    Permission.VIEW_EMPLOYEES,

    // Departments
    Permission.VIEW_DEPARTMENTS,

    // Timesheets (own timesheets only)
    Permission.VIEW_TIMESHEETS,
    Permission.CREATE_TIMESHEETS,
    Permission.EDIT_TIMESHEETS,

    // Leave (own leave requests only)
    Permission.VIEW_LEAVES,
    Permission.CREATE_LEAVES,
    Permission.EDIT_LEAVES,

    // Performance (view own performance)
    Permission.VIEW_PERFORMANCE,

    // Projects (assigned projects only)
    Permission.VIEW_PROJECTS,
  ],

  // ACCOUNTANT - Financial management
  [Role.ACCOUNTANT]: [
    // Employees (view for payroll purposes)
    Permission.VIEW_EMPLOYEES,
    Permission.VIEW_ALL_EMPLOYEES,

    // Departments
    Permission.VIEW_DEPARTMENTS,

    // Invoices (full access)
    Permission.VIEW_INVOICES,
    Permission.CREATE_INVOICES,
    Permission.EDIT_INVOICES,
    Permission.DELETE_INVOICES,
    Permission.APPROVE_INVOICES,

    // Payroll (full access)
    Permission.VIEW_PAYROLL,
    Permission.CREATE_PAYROLL,
    Permission.EDIT_PAYROLL,
    Permission.DELETE_PAYROLL,
    Permission.PROCESS_PAYROLL,
    Permission.VIEW_ALL_PAYROLL,

    // Clients (view for invoicing)
    Permission.VIEW_CLIENTS,
    Permission.CREATE_CLIENTS,
    Permission.EDIT_CLIENTS,

    // Reports (financial reports)
    Permission.VIEW_REPORTS,
    Permission.GENERATE_REPORTS,
    Permission.EXPORT_REPORTS,
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Role hierarchy (higher number = more authority)
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 100, // Super admin has highest authority
  [Role.ADMIN]: 5,
  [Role.MANAGER]: 4,
  [Role.HR]: 3,
  [Role.ACCOUNTANT]: 2,
  [Role.EMPLOYEE]: 1,
};

/**
 * Check if one role is senior to another
 */
export function isSeniorRole(role: Role, comparedTo: Role): boolean {
  return ROLE_HIERARCHY[role] > ROLE_HIERARCHY[comparedTo];
}

/**
 * Get accessible routes based on role
 */
export function getAccessibleRoutes(role: Role): string[] {
  const routes: string[] = [
    '/dashboard', // All roles can access dashboard
    '/profile', // All roles can access their profile
  ];

  if (hasPermission(role, Permission.VIEW_EMPLOYEES)) {
    routes.push('/employees');
  }

  if (hasPermission(role, Permission.VIEW_DEPARTMENTS)) {
    routes.push('/departments');
  }

  if (hasPermission(role, Permission.VIEW_TIMESHEETS)) {
    routes.push('/timesheets');
  }

  if (hasPermission(role, Permission.VIEW_LEAVES)) {
    routes.push('/leave');
  }

  if (hasPermission(role, Permission.VIEW_PERFORMANCE)) {
    routes.push('/performance');
  }

  if (hasPermission(role, Permission.VIEW_PROJECTS)) {
    routes.push('/projects');
  }

  if (hasPermission(role, Permission.VIEW_CLIENTS)) {
    routes.push('/clients');
  }

  if (hasPermission(role, Permission.VIEW_INVOICES)) {
    routes.push('/invoices');
  }

  if (hasPermission(role, Permission.VIEW_PAYROLL)) {
    routes.push('/payroll');
  }

  if (hasPermission(role, Permission.VIEW_REPORTS)) {
    routes.push('/reports');
  }

  if (hasPermission(role, Permission.VIEW_SETTINGS)) {
    routes.push('/settings');
  }

  if (hasPermission(role, Permission.VIEW_USERS)) {
    routes.push('/users');
  }

  return routes;
}

/**
 * Get default redirect route based on role
 */
export function getDefaultRoute(role: Role): string {
  switch (role) {
    case Role.ADMIN:
      return '/dashboard';
    case Role.MANAGER:
      return '/dashboard';
    case Role.ACCOUNTANT:
      return '/invoices';
    case Role.EMPLOYEE:
      return '/timesheets';
    default:
      return '/dashboard';
  }
}
