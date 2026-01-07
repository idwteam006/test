import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { Prisma } from '@prisma/client';
import {
  DESCRIPTION_MIN_LENGTH,
  DUPLICATE_CHECK_WINDOW_MS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/lib/expense-constants';

// Type for expense where clause
type ExpenseWhereInput = Prisma.ExpenseClaimWhereInput;

/**
 * GET /api/employee/expenses
 * Fetch expense claims for authenticated employee
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: { id: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    // Pagination parameters with validation
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10)));
    const skip = (page - 1) * limit;

    // Build where clause with proper typing
    const where: ExpenseWhereInput = {
      userId: user.id,
      tenantId: user.tenantId,
    };

    if (startDate && endDate) {
      // Parse dates as UTC to avoid timezone issues
      where.expenseDate = {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    }

    if (status) {
      where.status = status as Prisma.EnumExpenseStatusFilter<'ExpenseClaim'>;
    }

    if (category) {
      where.category = category as Prisma.EnumExpenseCategoryFilter<'ExpenseClaim'>;
    }

    // Run queries in parallel for better performance
    const [totalCount, expenses, statusCounts, totalAmountResult] = await Promise.all([
      // Get total count for pagination
      prisma.expenseClaim.count({ where }),
      // Fetch expenses with pagination
      prisma.expenseClaim.findMany({
        where,
        orderBy: {
          expenseDate: 'desc',
        },
        skip,
        take: limit,
      }),
      // Get status counts from full dataset (not paginated)
      prisma.expenseClaim.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      // Get total amount from full dataset (excluding REJECTED and DRAFT)
      prisma.expenseClaim.aggregate({
        where: {
          ...where,
          status: {
            notIn: ['REJECTED', 'DRAFT'],
          },
        },
        _sum: { amount: true },
      }),
    ]);

    // Build totals from aggregated results (calculated from full dataset, not paginated)
    const statusCountMap: Record<string, number> = {};
    statusCounts.forEach((sc) => {
      statusCountMap[sc.status] = sc._count.id;
    });

    const totals = {
      total: totalCount,
      pending: statusCountMap['SUBMITTED'] || 0,
      approved: (statusCountMap['APPROVED'] || 0) + (statusCountMap['PAID'] || 0),
      rejected: statusCountMap['REJECTED'] || 0,
      totalAmount: totalAmountResult._sum.amount || 0,
    };

    return NextResponse.json({
      success: true,
      expenses,
      totals,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Fetch expenses error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/employee/expenses
 * Create a new expense claim
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: { id: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      category,
      amount,
      currency,
      expenseDate,
      description,
      receiptUrls,
      notes,
      tags,
    } = body;

    // Validation
    if (!title || !category || !amount || !expenseDate || !description) {
      return NextResponse.json(
        { error: 'title, category, amount, expenseDate, and description are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate description minimum length using centralized constant
    if (description.length < DESCRIPTION_MIN_LENGTH) {
      return NextResponse.json(
        { error: `Description must be at least ${DESCRIPTION_MIN_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Parse expense date as UTC to avoid timezone issues
    const expenseDateUTC = new Date(`${expenseDate}T00:00:00.000Z`);

    // Get tenant settings to check if future expenses are allowed
    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: { allowFutureExpenses: true },
    });

    // Validate expense date is not in the future (unless allowed by settings)
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (expenseDateUTC > today) {
      // Check if future expenses are allowed
      if (!tenantSettings?.allowFutureExpenses) {
        return NextResponse.json(
          { error: 'Expense date cannot be in the future' },
          { status: 400 }
        );
      }
    }

    // Check for potential duplicate expenses using centralized constant
    const duplicateCheck = await prisma.expenseClaim.findFirst({
      where: {
        userId: user.id,
        tenantId: user.tenantId,
        amount: parseFloat(amount),
        category,
        expenseDate: expenseDateUTC,
        createdAt: {
          gte: new Date(Date.now() - DUPLICATE_CHECK_WINDOW_MS),
        },
      },
    });

    if (duplicateCheck) {
      return NextResponse.json(
        {
          error: 'A similar expense already exists',
          duplicate: true,
          existingExpense: {
            id: duplicateCheck.id,
            claimNumber: duplicateCheck.claimNumber,
            title: duplicateCheck.title,
          }
        },
        { status: 409 } // Conflict
      );
    }

    // Generate unique claim number
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const claimNumber = `EXP-${timestamp}-${random}`;

    // Create expense claim
    const expense = await prisma.expenseClaim.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        claimNumber,
        title,
        category,
        amount: parseFloat(amount),
        currency: currency || 'USD',
        expenseDate: expenseDateUTC,
        description,
        receiptUrls: receiptUrls || [],
        notes: notes || null,
        tags: tags || [],
        status: 'DRAFT',
      },
    });

    return NextResponse.json({
      success: true,
      expense,
    });
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json(
      { error: 'Failed to create expense', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
