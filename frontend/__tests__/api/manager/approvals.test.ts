/**
 * Unit Tests for Manager Approvals API (Timesheets & Expenses)
 * Testing for managers: Sneha Iyer (MANAGER), Ravi Krishnan (MANAGER)
 * Testing approval flow for employee: Divya Menon (EMPLOYEE)
 */

import { NextRequest } from 'next/server';
import { GET as getTimesheetsPending } from '@/app/api/manager/timesheets/pending/route';
import { GET as getExpensesPending } from '@/app/api/manager/expenses/pending/route';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    employee: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    timesheetEntry: {
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    expenseClaim: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock Redis sessions
jest.mock('@/lib/redis', () => ({
  sessions: {
    get: jest.fn(),
  },
}));

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn((name: string) => {
      if (name === 'session') {
        return { value: 'mock-session-id' };
      }
      return undefined;
    }),
  })),
}));

import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { cookies } from 'next/headers';

// Test user data
const testUsers = {
  snehaIyer: {
    id: 'user-sneha-001',
    email: 'sneha.iyer@idwteam.com',
    firstName: 'Sneha',
    lastName: 'Iyer',
    role: 'MANAGER',
    tenantId: 'tenant-idwteam-001',
    departmentId: 'dept-001',
  },
  raviKrishnan: {
    id: 'user-ravi-002',
    email: 'ravi.krishnan@idwteam.com',
    firstName: 'Ravi',
    lastName: 'Krishnan',
    role: 'MANAGER',
    tenantId: 'tenant-idwteam-001',
    departmentId: 'dept-002',
  },
  divyaMenon: {
    id: 'user-divya-003',
    email: 'divya.menon@idwteam.com',
    firstName: 'Divya',
    lastName: 'Menon',
    role: 'EMPLOYEE',
    tenantId: 'tenant-idwteam-001',
    departmentId: 'dept-001',
  },
};

const testEmployees = {
  snehaEmployee: {
    id: 'emp-sneha-001',
    userId: testUsers.snehaIyer.id,
  },
  raviEmployee: {
    id: 'emp-ravi-002',
    userId: testUsers.raviKrishnan.id,
  },
  divyaEmployee: {
    id: 'emp-divya-003',
    userId: testUsers.divyaMenon.id,
    managerId: 'emp-sneha-001', // Divya reports to Sneha
  },
};

describe('Manager Timesheet Approvals API - GET /api/manager/timesheets/pending', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication and Authorization Tests', () => {
    it('should return 401 when no session cookie is provided', async () => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      const request = new NextRequest('http://localhost:3000/api/manager/timesheets/pending');
      const response = await getTimesheetsPending(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Not authenticated');
    });

    it('should return 403 for EMPLOYEE role trying to access approvals', async () => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'divya-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.divyaMenon.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.divyaMenon);

      const request = new NextRequest('http://localhost:3000/api/manager/timesheets/pending');
      const response = await getTimesheetsPending(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Unauthorized');
    });
  });

  describe('Timesheet Approvals for Sneha Iyer (MANAGER)', () => {
    beforeEach(() => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'sneha-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.snehaIyer.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.snehaIyer);
    });

    it('should fetch pending timesheets for Sneha direct reports', async () => {
      // Sneha's employee record
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(testEmployees.snehaEmployee);

      // Divya is Sneha's direct report
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([
        { userId: testUsers.divyaMenon.id },
      ]);

      const pendingTimesheets = [
        {
          id: 'ts-divya-1',
          userId: testUsers.divyaMenon.id,
          workDate: new Date('2024-01-15'),
          hoursWorked: 8,
          isBillable: true,
          description: 'Frontend development work',
          status: 'SUBMITTED',
          submittedAt: new Date('2024-01-16'),
          user: {
            id: testUsers.divyaMenon.id,
            email: testUsers.divyaMenon.email,
            firstName: testUsers.divyaMenon.firstName,
            lastName: testUsers.divyaMenon.lastName,
            employeeId: 'EMP-003',
            department: { name: 'Engineering' },
          },
          project: { id: 'proj-1', name: 'Client Portal', projectCode: 'CP-001' },
          task: { id: 'task-1', name: 'UI Development' },
        },
        {
          id: 'ts-divya-2',
          userId: testUsers.divyaMenon.id,
          workDate: new Date('2024-01-16'),
          hoursWorked: 7.5,
          isBillable: true,
          description: 'Bug fixes',
          status: 'SUBMITTED',
          submittedAt: new Date('2024-01-17'),
          user: {
            id: testUsers.divyaMenon.id,
            email: testUsers.divyaMenon.email,
            firstName: testUsers.divyaMenon.firstName,
            lastName: testUsers.divyaMenon.lastName,
            employeeId: 'EMP-003',
            department: { name: 'Engineering' },
          },
          project: { id: 'proj-1', name: 'Client Portal', projectCode: 'CP-001' },
          task: { id: 'task-2', name: 'Bug Fixes' },
        },
      ];

      (prisma.timesheetEntry.count as jest.Mock).mockResolvedValue(2);
      (prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue(pendingTimesheets);

      const request = new NextRequest('http://localhost:3000/api/manager/timesheets/pending');
      const response = await getTimesheetsPending(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.entries).toHaveLength(2);
      expect(data.teamSummary).toHaveLength(1); // One team member (Divya)
      expect(data.teamSummary[0].name).toBe('Divya Menon');
      expect(data.teamSummary[0].totalHours).toBe(15.5);
      expect(data.pagination.totalCount).toBe(2);
    });

    it('should return empty result when no direct reports', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(testEmployees.snehaEmployee);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([]); // No direct reports

      const request = new NextRequest('http://localhost:3000/api/manager/timesheets/pending');
      const response = await getTimesheetsPending(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.entries).toHaveLength(0);
      expect(data.teamSummary).toHaveLength(0);
    });

    it('should filter by date range', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(testEmployees.snehaEmployee);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([
        { userId: testUsers.divyaMenon.id },
      ]);
      (prisma.timesheetEntry.count as jest.Mock).mockResolvedValue(1);
      (prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/manager/timesheets/pending?startDate=2024-01-15&endDate=2024-01-15'
      );
      const response = await getTimesheetsPending(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Timesheet Approvals for Ravi Krishnan (MANAGER)', () => {
    beforeEach(() => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'ravi-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.raviKrishnan.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.raviKrishnan);
    });

    it('should return empty when Ravi has no direct reports', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(testEmployees.raviEmployee);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([]); // Ravi has no direct reports

      const request = new NextRequest('http://localhost:3000/api/manager/timesheets/pending');
      const response = await getTimesheetsPending(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.entries).toHaveLength(0);
    });

    it('should handle search functionality', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(testEmployees.raviEmployee);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([
        { userId: 'user-team-member-1' },
      ]);
      (prisma.timesheetEntry.count as jest.Mock).mockResolvedValue(0);
      (prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/manager/timesheets/pending?search=frontend'
      );
      const response = await getTimesheetsPending(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Pagination Tests', () => {
    beforeEach(() => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'sneha-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.snehaIyer.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.snehaIyer);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(testEmployees.snehaEmployee);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([
        { userId: testUsers.divyaMenon.id },
      ]);
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/manager/timesheets/pending?page=0&limit=1000'
      );
      const response = await getTimesheetsPending(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid pagination parameters');
    });

    it('should handle pagination correctly', async () => {
      (prisma.timesheetEntry.count as jest.Mock).mockResolvedValue(50);
      (prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/manager/timesheets/pending?page=2&limit=10'
      );
      const response = await getTimesheetsPending(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.totalPages).toBe(5);
    });
  });
});

describe('Manager Expense Approvals API - GET /api/manager/expenses/pending', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication and Authorization Tests', () => {
    it('should return 401 when no session cookie is provided', async () => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      const request = new NextRequest('http://localhost:3000/api/manager/expenses/pending');
      const response = await getExpensesPending(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Not authenticated');
    });

    it('should return 403 for EMPLOYEE role', async () => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'divya-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.divyaMenon.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.divyaMenon);

      const request = new NextRequest('http://localhost:3000/api/manager/expenses/pending');
      const response = await getExpensesPending(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Unauthorized');
    });
  });

  describe('Expense Approvals for Sneha Iyer (MANAGER)', () => {
    beforeEach(() => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'sneha-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.snehaIyer.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.snehaIyer);
    });

    it('should fetch pending expenses for Sneha direct reports (Divya)', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(testEmployees.snehaEmployee);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([
        { userId: testUsers.divyaMenon.id },
      ]);

      const pendingExpenses = [
        {
          id: 'exp-divya-1',
          userId: testUsers.divyaMenon.id,
          claimNumber: 'EXP-001',
          title: 'Office Supplies',
          category: 'OFFICE_SUPPLIES',
          amount: 45.50,
          status: 'SUBMITTED',
          expenseDate: new Date('2024-01-15'),
          submittedAt: new Date('2024-01-16'),
          user: {
            id: testUsers.divyaMenon.id,
            email: testUsers.divyaMenon.email,
            firstName: testUsers.divyaMenon.firstName,
            lastName: testUsers.divyaMenon.lastName,
            employeeId: 'EMP-003',
            department: { name: 'Engineering' },
          },
        },
        {
          id: 'exp-divya-2',
          userId: testUsers.divyaMenon.id,
          claimNumber: 'EXP-002',
          title: 'Team Lunch',
          category: 'MEALS',
          amount: 35.00,
          status: 'SUBMITTED',
          expenseDate: new Date('2024-01-17'),
          submittedAt: new Date('2024-01-18'),
          user: {
            id: testUsers.divyaMenon.id,
            email: testUsers.divyaMenon.email,
            firstName: testUsers.divyaMenon.firstName,
            lastName: testUsers.divyaMenon.lastName,
            employeeId: 'EMP-003',
            department: { name: 'Engineering' },
          },
        },
      ];

      (prisma.expenseClaim.findMany as jest.Mock).mockResolvedValue(pendingExpenses);
      (prisma.expenseClaim.groupBy as jest.Mock).mockResolvedValue([
        { category: 'OFFICE_SUPPLIES', _count: { id: 1 }, _sum: { amount: 45.50 } },
        { category: 'MEALS', _count: { id: 1 }, _sum: { amount: 35.00 } },
      ]);
      (prisma.expenseClaim.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 2 },
        _sum: { amount: 80.50 },
      });

      const request = new NextRequest('http://localhost:3000/api/manager/expenses/pending');
      const response = await getExpensesPending(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.expenses).toHaveLength(2);
      expect(data.summary.totalExpenses).toBe(2);
      expect(data.summary.totalAmount).toBe(80.50);
      expect(Object.keys(data.summary.byCategory)).toContain('OFFICE_SUPPLIES');
      expect(Object.keys(data.summary.byCategory)).toContain('MEALS');
    });

    it('should return empty when no direct reports have pending expenses', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(testEmployees.snehaEmployee);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([]); // No direct reports

      const request = new NextRequest('http://localhost:3000/api/manager/expenses/pending');
      const response = await getExpensesPending(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.expenses).toHaveLength(0);
      expect(data.summary.totalExpenses).toBe(0);
    });

    it('should filter by date range', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(testEmployees.snehaEmployee);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([
        { userId: testUsers.divyaMenon.id },
      ]);
      (prisma.expenseClaim.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.expenseClaim.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.expenseClaim.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 0 },
        _sum: { amount: 0 },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/manager/expenses/pending?startDate=2024-01-01&endDate=2024-01-15'
      );
      const response = await getExpensesPending(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Expense Approvals for Ravi Krishnan (MANAGER)', () => {
    beforeEach(() => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'ravi-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.raviKrishnan.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.raviKrishnan);
    });

    it('should return empty when Ravi has no direct reports', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(testEmployees.raviEmployee);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/manager/expenses/pending');
      const response = await getExpensesPending(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.expenses).toHaveLength(0);
      expect(data.summary.totalExpenses).toBe(0);
    });
  });
});

describe('Cross-User Approval Scenarios', () => {
  describe('Divya submits, Sneha approves flow', () => {
    it('should show Divya timesheets in Sneha pending queue', async () => {
      // Setup Sneha as manager
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'sneha-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.snehaIyer.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.snehaIyer);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(testEmployees.snehaEmployee);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([
        { userId: testUsers.divyaMenon.id },
      ]);

      const divyaTimesheets = [
        {
          id: 'ts-1',
          userId: testUsers.divyaMenon.id,
          workDate: new Date('2024-01-20'),
          hoursWorked: 8,
          status: 'SUBMITTED',
          description: 'Development work',
          isBillable: true,
          user: {
            id: testUsers.divyaMenon.id,
            firstName: 'Divya',
            lastName: 'Menon',
            email: 'divya.menon@idwteam.com',
            employeeId: 'EMP-003',
            department: { name: 'Engineering' },
          },
          project: { id: 'p1', name: 'Project A', projectCode: 'PA-001' },
          task: null,
        },
      ];

      (prisma.timesheetEntry.count as jest.Mock).mockResolvedValue(1);
      (prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue(divyaTimesheets);

      const request = new NextRequest('http://localhost:3000/api/manager/timesheets/pending');
      const response = await getTimesheetsPending(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entries[0].user.firstName).toBe('Divya');
      expect(data.teamSummary[0].name).toBe('Divya Menon');
    });

    it('should show Divya expenses in Sneha pending queue', async () => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'sneha-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.snehaIyer.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.snehaIyer);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue(testEmployees.snehaEmployee);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue([
        { userId: testUsers.divyaMenon.id },
      ]);

      const divyaExpenses = [
        {
          id: 'exp-1',
          userId: testUsers.divyaMenon.id,
          claimNumber: 'EXP-DIVYA-001',
          title: 'Training Course',
          category: 'TRAINING',
          amount: 199.00,
          status: 'SUBMITTED',
          expenseDate: new Date('2024-01-20'),
          user: {
            id: testUsers.divyaMenon.id,
            firstName: 'Divya',
            lastName: 'Menon',
            email: 'divya.menon@idwteam.com',
            employeeId: 'EMP-003',
            department: { name: 'Engineering' },
          },
        },
      ];

      (prisma.expenseClaim.findMany as jest.Mock).mockResolvedValue(divyaExpenses);
      (prisma.expenseClaim.groupBy as jest.Mock).mockResolvedValue([
        { category: 'TRAINING', _count: { id: 1 }, _sum: { amount: 199.00 } },
      ]);
      (prisma.expenseClaim.aggregate as jest.Mock).mockResolvedValue({
        _count: { id: 1 },
        _sum: { amount: 199.00 },
      });

      const request = new NextRequest('http://localhost:3000/api/manager/expenses/pending');
      const response = await getExpensesPending(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.expenses[0].user.firstName).toBe('Divya');
      expect(data.summary.byEmployee['EMP-003'].name).toBe('Divya Menon');
    });
  });
});
