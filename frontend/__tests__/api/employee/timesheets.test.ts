/**
 * Unit Tests for Employee Timesheets API
 * Testing for users: Sneha Iyer (MANAGER), Ravi Krishnan (MANAGER), Divya Menon (EMPLOYEE)
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/employee/timesheets/route';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    timesheetEntry: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    task: {
      findUnique: jest.fn(),
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

// Test user data for Sneha Iyer (MANAGER), Ravi Krishnan (MANAGER), Divya Menon (EMPLOYEE)
const testUsers = {
  snehaIyer: {
    id: 'user-sneha-001',
    email: 'sneha.iyer@idwteam.com',
    firstName: 'Sneha',
    lastName: 'Iyer',
    role: 'MANAGER',
    tenantId: 'tenant-idwteam-001',
  },
  raviKrishnan: {
    id: 'user-ravi-002',
    email: 'ravi.krishnan@idwteam.com',
    firstName: 'Ravi',
    lastName: 'Krishnan',
    role: 'MANAGER',
    tenantId: 'tenant-idwteam-001',
  },
  divyaMenon: {
    id: 'user-divya-003',
    email: 'divya.menon@idwteam.com',
    firstName: 'Divya',
    lastName: 'Menon',
    role: 'EMPLOYEE',
    tenantId: 'tenant-idwteam-001',
  },
};

describe('Employee Timesheets API - GET /api/employee/timesheets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Tests', () => {
    it('should return 401 when no session cookie is provided', async () => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/employee/timesheets?startDate=2024-01-01&endDate=2024-01-31'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Not authenticated');
    });

    it('should return 401 for invalid session', async () => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'invalid-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/employee/timesheets?startDate=2024-01-01&endDate=2024-01-31'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid session');
    });
  });

  describe('Timesheet Fetch Tests for Sneha Iyer (MANAGER)', () => {
    beforeEach(() => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'sneha-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.snehaIyer.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.snehaIyer);
    });

    it('should fetch timesheets for Sneha Iyer successfully', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          userId: testUsers.snehaIyer.id,
          workDate: new Date('2024-01-15'),
          hoursWorked: 8,
          isBillable: true,
          billingAmount: 800,
          description: 'Project review meeting',
          project: { id: 'proj-1', name: 'Client Portal', projectCode: 'CP-001' },
          task: { id: 'task-1', name: 'Code Review' },
        },
        {
          id: 'entry-2',
          userId: testUsers.snehaIyer.id,
          workDate: new Date('2024-01-16'),
          hoursWorked: 6,
          isBillable: false,
          billingAmount: 0,
          description: 'Team standup and planning',
          project: null,
          task: null,
        },
      ];

      (prisma.timesheetEntry.count as jest.Mock).mockResolvedValue(2);
      (prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue(mockEntries);

      const request = new NextRequest(
        'http://localhost:3000/api/employee/timesheets?startDate=2024-01-01&endDate=2024-01-31'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.entries).toHaveLength(2);
      expect(data.totals.totalHours).toBe(14);
      expect(data.totals.billableHours).toBe(8);
      expect(data.totals.nonBillableHours).toBe(6);
      expect(data.pagination.totalCount).toBe(2);
    });

    it('should return 400 when startDate or endDate is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/employee/timesheets?startDate=2024-01-01'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('startDate and endDate are required');
    });
  });

  describe('Timesheet Fetch Tests for Ravi Krishnan (MANAGER)', () => {
    beforeEach(() => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'ravi-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.raviKrishnan.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.raviKrishnan);
    });

    it('should fetch timesheets for Ravi Krishnan successfully', async () => {
      const mockEntries = [
        {
          id: 'entry-ravi-1',
          userId: testUsers.raviKrishnan.id,
          workDate: new Date('2024-01-15'),
          hoursWorked: 9,
          isBillable: true,
          billingAmount: 1350,
          description: 'Development sprint planning',
          project: { id: 'proj-2', name: 'Mobile App', projectCode: 'MA-001' },
          task: { id: 'task-2', name: 'Sprint Planning' },
        },
      ];

      (prisma.timesheetEntry.count as jest.Mock).mockResolvedValue(1);
      (prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue(mockEntries);

      const request = new NextRequest(
        'http://localhost:3000/api/employee/timesheets?startDate=2024-01-01&endDate=2024-01-31'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.entries).toHaveLength(1);
      expect(data.entries[0].hoursWorked).toBe(9);
    });

    it('should handle empty timesheet result for Ravi', async () => {
      (prisma.timesheetEntry.count as jest.Mock).mockResolvedValue(0);
      (prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/employee/timesheets?startDate=2024-02-01&endDate=2024-02-28'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.entries).toHaveLength(0);
      expect(data.totals.totalHours).toBe(0);
    });
  });

  describe('Timesheet Fetch Tests for Divya Menon (EMPLOYEE)', () => {
    beforeEach(() => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'divya-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.divyaMenon.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.divyaMenon);
    });

    it('should fetch timesheets for Divya Menon (EMPLOYEE) successfully', async () => {
      const mockEntries = [
        {
          id: 'entry-divya-1',
          userId: testUsers.divyaMenon.id,
          workDate: new Date('2024-01-15'),
          hoursWorked: 8,
          isBillable: true,
          billingAmount: 400,
          description: 'Frontend development',
          project: { id: 'proj-1', name: 'Client Portal', projectCode: 'CP-001' },
          task: { id: 'task-3', name: 'UI Implementation' },
        },
        {
          id: 'entry-divya-2',
          userId: testUsers.divyaMenon.id,
          workDate: new Date('2024-01-16'),
          hoursWorked: 7.5,
          isBillable: true,
          billingAmount: 375,
          description: 'Bug fixes and testing',
          project: { id: 'proj-1', name: 'Client Portal', projectCode: 'CP-001' },
          task: { id: 'task-4', name: 'Bug Fixes' },
        },
      ];

      (prisma.timesheetEntry.count as jest.Mock).mockResolvedValue(2);
      (prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue(mockEntries);

      const request = new NextRequest(
        'http://localhost:3000/api/employee/timesheets?startDate=2024-01-01&endDate=2024-01-31'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.entries).toHaveLength(2);
      expect(data.totals.totalHours).toBe(15.5);
      expect(data.totals.billableHours).toBe(15.5);
      expect(data.totals.totalAmount).toBe(775);
    });
  });

  describe('Pagination Tests', () => {
    beforeEach(() => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'test-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.snehaIyer.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.snehaIyer);
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/employee/timesheets?startDate=2024-01-01&endDate=2024-01-31&page=0&limit=200'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid pagination parameters');
    });

    it('should handle pagination correctly', async () => {
      (prisma.timesheetEntry.count as jest.Mock).mockResolvedValue(100);
      (prisma.timesheetEntry.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/employee/timesheets?startDate=2024-01-01&endDate=2024-01-31&page=2&limit=10'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.totalPages).toBe(10);
    });
  });
});

describe('Employee Timesheets API - POST /api/employee/timesheets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Timesheet Tests for Divya Menon (EMPLOYEE)', () => {
    beforeEach(() => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'divya-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.divyaMenon.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.divyaMenon);
    });

    it('should create a new timesheet entry for Divya', async () => {
      const newEntry = {
        workDate: '2024-01-17',
        hoursWorked: 8,
        description: 'API integration work',
        isBillable: true,
        billingRate: 50,
      };

      const createdEntry = {
        id: 'new-entry-1',
        ...newEntry,
        userId: testUsers.divyaMenon.id,
        tenantId: testUsers.divyaMenon.tenantId,
        status: 'DRAFT',
        billingAmount: 400,
        project: null,
        task: null,
      };

      (prisma.timesheetEntry.create as jest.Mock).mockResolvedValue(createdEntry);

      const request = new NextRequest('http://localhost:3000/api/employee/timesheets', {
        method: 'POST',
        body: JSON.stringify(newEntry),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.entry.hoursWorked).toBe(8);
      expect(data.entry.status).toBe('DRAFT');
    });

    it('should return 400 when required fields are missing', async () => {
      const incompleteEntry = {
        workDate: '2024-01-17',
        // Missing hoursWorked and description
      };

      const request = new NextRequest('http://localhost:3000/api/employee/timesheets', {
        method: 'POST',
        body: JSON.stringify(incompleteEntry),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should return 400 for invalid hoursWorked value', async () => {
      const invalidEntry = {
        workDate: '2024-01-17',
        hoursWorked: 25, // Invalid: more than 24 hours
        description: 'Test entry',
      };

      const request = new NextRequest('http://localhost:3000/api/employee/timesheets', {
        method: 'POST',
        body: JSON.stringify(invalidEntry),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('hoursWorked must be between 0 and 24');
    });
  });

  describe('Create Timesheet Tests for Managers', () => {
    it('should create timesheet for Sneha Iyer (MANAGER)', async () => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'sneha-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.snehaIyer.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.snehaIyer);

      const newEntry = {
        workDate: '2024-01-18',
        hoursWorked: 6,
        description: 'Team management and 1:1 meetings',
        isBillable: false,
      };

      const createdEntry = {
        id: 'manager-entry-1',
        ...newEntry,
        userId: testUsers.snehaIyer.id,
        tenantId: testUsers.snehaIyer.tenantId,
        status: 'DRAFT',
        project: null,
        task: null,
      };

      (prisma.timesheetEntry.create as jest.Mock).mockResolvedValue(createdEntry);

      const request = new NextRequest('http://localhost:3000/api/employee/timesheets', {
        method: 'POST',
        body: JSON.stringify(newEntry),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.entry.description).toBe('Team management and 1:1 meetings');
    });
  });
});
