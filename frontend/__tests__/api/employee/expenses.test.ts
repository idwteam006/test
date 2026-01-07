/**
 * Unit Tests for Employee Expenses API
 * Testing for users: Sneha Iyer (MANAGER), Ravi Krishnan (MANAGER), Divya Menon (EMPLOYEE)
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/employee/expenses/route';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    expenseClaim: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
  },
}));

// Mock Redis sessions
jest.mock('@/lib/redis', () => ({
  sessions: {
    get: jest.fn(),
  },
}));

// Mock expense constants
jest.mock('@/lib/expense-constants', () => ({
  RECEIPT_REQUIRED_THRESHOLD: 50,
  DESCRIPTION_MIN_LENGTH: 10,
  DUPLICATE_CHECK_WINDOW_MS: 3600000, // 1 hour
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
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

describe('Employee Expenses API - GET /api/employee/expenses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Tests', () => {
    it('should return 401 when no session cookie is provided', async () => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      const request = new NextRequest('http://localhost:3000/api/employee/expenses');
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

      const request = new NextRequest('http://localhost:3000/api/employee/expenses');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid session');
    });
  });

  describe('Expense Fetch Tests for Sneha Iyer (MANAGER)', () => {
    beforeEach(() => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'sneha-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.snehaIyer.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.snehaIyer);
    });

    it('should fetch expenses for Sneha Iyer successfully', async () => {
      const mockExpenses = [
        {
          id: 'exp-sneha-1',
          userId: testUsers.snehaIyer.id,
          claimNumber: 'EXP-001',
          title: 'Client Dinner',
          category: 'MEALS',
          amount: 150.00,
          currency: 'USD',
          expenseDate: new Date('2024-01-15'),
          description: 'Business dinner with client stakeholders',
          status: 'SUBMITTED',
        },
        {
          id: 'exp-sneha-2',
          userId: testUsers.snehaIyer.id,
          claimNumber: 'EXP-002',
          title: 'Conference Travel',
          category: 'TRAVEL',
          amount: 500.00,
          currency: 'USD',
          expenseDate: new Date('2024-01-10'),
          description: 'Flight tickets for tech conference',
          status: 'APPROVED',
        },
      ];

      (prisma.expenseClaim.count as jest.Mock).mockResolvedValue(2);
      (prisma.expenseClaim.findMany as jest.Mock).mockResolvedValue(mockExpenses);
      (prisma.expenseClaim.groupBy as jest.Mock).mockResolvedValue([
        { status: 'SUBMITTED', _count: { id: 1 } },
        { status: 'APPROVED', _count: { id: 1 } },
      ]);
      (prisma.expenseClaim.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: 650.00 },
      });

      const request = new NextRequest('http://localhost:3000/api/employee/expenses');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.expenses).toHaveLength(2);
      expect(data.totals.total).toBe(2);
      expect(data.totals.totalAmount).toBe(650.00);
    });

    it('should filter expenses by date range', async () => {
      (prisma.expenseClaim.count as jest.Mock).mockResolvedValue(1);
      (prisma.expenseClaim.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.expenseClaim.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.expenseClaim.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });

      const request = new NextRequest(
        'http://localhost:3000/api/employee/expenses?startDate=2024-01-01&endDate=2024-01-15'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Expense Fetch Tests for Ravi Krishnan (MANAGER)', () => {
    beforeEach(() => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'ravi-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.raviKrishnan.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.raviKrishnan);
    });

    it('should fetch expenses for Ravi Krishnan successfully', async () => {
      const mockExpenses = [
        {
          id: 'exp-ravi-1',
          userId: testUsers.raviKrishnan.id,
          claimNumber: 'EXP-003',
          title: 'Software Subscription',
          category: 'SOFTWARE',
          amount: 99.00,
          currency: 'USD',
          expenseDate: new Date('2024-01-12'),
          description: 'Annual IDE license subscription',
          status: 'DRAFT',
        },
      ];

      (prisma.expenseClaim.count as jest.Mock).mockResolvedValue(1);
      (prisma.expenseClaim.findMany as jest.Mock).mockResolvedValue(mockExpenses);
      (prisma.expenseClaim.groupBy as jest.Mock).mockResolvedValue([
        { status: 'DRAFT', _count: { id: 1 } },
      ]);
      (prisma.expenseClaim.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: 0 },
      });

      const request = new NextRequest('http://localhost:3000/api/employee/expenses');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.expenses).toHaveLength(1);
      expect(data.expenses[0].category).toBe('SOFTWARE');
    });

    it('should filter expenses by status', async () => {
      (prisma.expenseClaim.count as jest.Mock).mockResolvedValue(0);
      (prisma.expenseClaim.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.expenseClaim.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.expenseClaim.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });

      const request = new NextRequest(
        'http://localhost:3000/api/employee/expenses?status=APPROVED'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Expense Fetch Tests for Divya Menon (EMPLOYEE)', () => {
    beforeEach(() => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'divya-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.divyaMenon.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.divyaMenon);
    });

    it('should fetch expenses for Divya Menon (EMPLOYEE) successfully', async () => {
      const mockExpenses = [
        {
          id: 'exp-divya-1',
          userId: testUsers.divyaMenon.id,
          claimNumber: 'EXP-004',
          title: 'Office Supplies',
          category: 'OFFICE_SUPPLIES',
          amount: 45.50,
          currency: 'USD',
          expenseDate: new Date('2024-01-14'),
          description: 'Notebook and stationery for work',
          status: 'SUBMITTED',
        },
        {
          id: 'exp-divya-2',
          userId: testUsers.divyaMenon.id,
          claimNumber: 'EXP-005',
          title: 'Team Lunch',
          category: 'MEALS',
          amount: 35.00,
          currency: 'USD',
          expenseDate: new Date('2024-01-16'),
          description: 'Team lunch meeting expense',
          status: 'APPROVED',
        },
      ];

      (prisma.expenseClaim.count as jest.Mock).mockResolvedValue(2);
      (prisma.expenseClaim.findMany as jest.Mock).mockResolvedValue(mockExpenses);
      (prisma.expenseClaim.groupBy as jest.Mock).mockResolvedValue([
        { status: 'SUBMITTED', _count: { id: 1 } },
        { status: 'APPROVED', _count: { id: 1 } },
      ]);
      (prisma.expenseClaim.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: 80.50 },
      });

      const request = new NextRequest('http://localhost:3000/api/employee/expenses');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.expenses).toHaveLength(2);
      expect(data.totals.totalAmount).toBe(80.50);
    });
  });
});

describe('Employee Expenses API - POST /api/employee/expenses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Expense Tests for Divya Menon (EMPLOYEE)', () => {
    beforeEach(() => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'divya-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.divyaMenon.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.divyaMenon);
    });

    it('should create a new expense claim for Divya', async () => {
      const newExpense = {
        title: 'Training Materials',
        category: 'TRAINING',
        amount: 45.00, // Under $50 threshold, no receipt required
        currency: 'USD',
        expenseDate: '2024-01-17',
        description: 'Online course subscription for skill development',
      };

      const createdExpense = {
        id: 'new-exp-1',
        claimNumber: 'EXP-12345678-ABCD',
        ...newExpense,
        userId: testUsers.divyaMenon.id,
        tenantId: testUsers.divyaMenon.tenantId,
        status: 'DRAFT',
        receiptUrls: [],
      };

      (prisma.expenseClaim.findFirst as jest.Mock).mockResolvedValue(null); // No duplicate
      (prisma.expenseClaim.create as jest.Mock).mockResolvedValue(createdExpense);

      const request = new NextRequest('http://localhost:3000/api/employee/expenses', {
        method: 'POST',
        body: JSON.stringify(newExpense),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.expense.title).toBe('Training Materials');
      expect(data.expense.status).toBe('DRAFT');
    });

    it('should return 400 when required fields are missing', async () => {
      const incompleteExpense = {
        title: 'Test Expense',
        // Missing category, amount, expenseDate, description
      };

      const request = new NextRequest('http://localhost:3000/api/employee/expenses', {
        method: 'POST',
        body: JSON.stringify(incompleteExpense),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should return 400 for amount less than or equal to 0', async () => {
      const invalidExpense = {
        title: 'Invalid Expense',
        category: 'OTHER',
        amount: -10, // Negative amount
        expenseDate: '2024-01-17',
        description: 'This is an invalid expense with negative amount',
      };

      const request = new NextRequest('http://localhost:3000/api/employee/expenses', {
        method: 'POST',
        body: JSON.stringify(invalidExpense),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Amount must be greater than 0');
    });

    it('should return 400 for short description', async () => {
      const shortDescExpense = {
        title: 'Test',
        category: 'OTHER',
        amount: 50,
        expenseDate: '2024-01-17',
        description: 'Short', // Less than 10 characters
      };

      const request = new NextRequest('http://localhost:3000/api/employee/expenses', {
        method: 'POST',
        body: JSON.stringify(shortDescExpense),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Description must be at least');
    });

    it('should return 400 for expense over $50 without receipt', async () => {
      const expenseNoReceipt = {
        title: 'Expensive Item',
        category: 'EQUIPMENT',
        amount: 100,
        expenseDate: '2024-01-17',
        description: 'Expensive equipment purchase without receipt',
        receiptUrls: [], // Empty receipts
      };

      const request = new NextRequest('http://localhost:3000/api/employee/expenses', {
        method: 'POST',
        body: JSON.stringify(expenseNoReceipt),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Receipts are required');
    });

    it('should return 400 for future expense date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days in future

      const futureExpense = {
        title: 'Future Expense',
        category: 'OTHER',
        amount: 30,
        expenseDate: futureDate.toISOString().split('T')[0],
        description: 'This expense has a future date',
      };

      const request = new NextRequest('http://localhost:3000/api/employee/expenses', {
        method: 'POST',
        body: JSON.stringify(futureExpense),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('cannot be in the future');
    });

    it('should return 409 for duplicate expense', async () => {
      const duplicateExpense = {
        title: 'Duplicate Expense',
        category: 'MEALS',
        amount: 50,
        expenseDate: '2024-01-17',
        description: 'This is a duplicate expense entry',
      };

      const existingExpense = {
        id: 'existing-exp-1',
        claimNumber: 'EXP-EXISTING',
        title: 'Duplicate Expense',
      };

      (prisma.expenseClaim.findFirst as jest.Mock).mockResolvedValue(existingExpense);

      const request = new NextRequest('http://localhost:3000/api/employee/expenses', {
        method: 'POST',
        body: JSON.stringify(duplicateExpense),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('similar expense already exists');
      expect(data.duplicate).toBe(true);
    });
  });

  describe('Create Expense Tests for Managers', () => {
    it('should create expense for Sneha Iyer (MANAGER)', async () => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'sneha-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.snehaIyer.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.snehaIyer);

      const newExpense = {
        title: 'Client Entertainment',
        category: 'MEALS',
        amount: 200,
        expenseDate: '2024-01-18',
        description: 'Client dinner for project kickoff meeting',
        receiptUrls: ['https://example.com/receipt1.pdf'],
      };

      const createdExpense = {
        id: 'manager-exp-1',
        claimNumber: 'EXP-MGR-001',
        ...newExpense,
        userId: testUsers.snehaIyer.id,
        tenantId: testUsers.snehaIyer.tenantId,
        status: 'DRAFT',
      };

      (prisma.expenseClaim.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.expenseClaim.create as jest.Mock).mockResolvedValue(createdExpense);

      const request = new NextRequest('http://localhost:3000/api/employee/expenses', {
        method: 'POST',
        body: JSON.stringify(newExpense),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.expense.amount).toBe(200);
    });

    it('should create expense for Ravi Krishnan (MANAGER)', async () => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'ravi-session' }),
      });
      (sessions.get as jest.Mock).mockResolvedValue({ userId: testUsers.raviKrishnan.id });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUsers.raviKrishnan);

      const newExpense = {
        title: 'Team Building Activity',
        category: 'OTHER',
        amount: 350,
        expenseDate: '2024-01-19',
        description: 'Team outing for quarterly team building',
        receiptUrls: ['https://example.com/receipt2.pdf'],
      };

      const createdExpense = {
        id: 'manager-exp-2',
        claimNumber: 'EXP-MGR-002',
        ...newExpense,
        userId: testUsers.raviKrishnan.id,
        tenantId: testUsers.raviKrishnan.tenantId,
        status: 'DRAFT',
      };

      (prisma.expenseClaim.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.expenseClaim.create as jest.Mock).mockResolvedValue(createdExpense);

      const request = new NextRequest('http://localhost:3000/api/employee/expenses', {
        method: 'POST',
        body: JSON.stringify(newExpense),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.expense.category).toBe('OTHER');
    });
  });
});
