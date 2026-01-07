import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { startOfMonth, endOfMonth } from 'date-fns';
import { getCachedData, CacheTTL } from '@/lib/cache';

// Cache key helper for revenue reports
const getRevenueReportCacheKey = (tenantId: string, params: string) =>
  `revenue:report:${tenantId}:${params}`;

// GET /api/admin/reports/revenue - Revenue report
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user || (user.role !== 'ADMIN' && user.role !== 'ACCOUNTANT')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const clientId = searchParams.get('clientId');

    // Create cache key based on query params
    const cacheKey = getRevenueReportCacheKey(
      user.tenantId,
      `${startDate || 'all'}-${endDate || 'all'}-${clientId || 'all'}`
    );

    // Use caching for revenue reports (3 min TTL)
    const reportData = await getCachedData(
      cacheKey,
      async () => fetchRevenueReportData(user.tenantId, startDate, endDate, clientId),
      CacheTTL.REPORTS // 3 minutes
    );

    return NextResponse.json({
      success: true,
      ...reportData,
    });
  } catch (error) {
    console.error('Error fetching revenue report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch revenue report' },
      { status: 500 }
    );
  }
}

/**
 * Fetch revenue report data (called by cache layer)
 */
async function fetchRevenueReportData(
  tenantId: string,
  startDate: string | null,
  endDate: string | null,
  clientId: string | null
) {
    const where: any = {
      tenantId,
    };

    if (startDate && endDate) {
      where.issueDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (clientId) {
      where.clientId = clientId;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: {
          select: {
            companyName: true,
            contactName: true,
          },
        },
        lineItems: true,
      },
      orderBy: {
        issueDate: 'desc',
      },
    });

    // Calculate revenue summary
    const summary = {
      totalInvoices: invoices.length,
      totalRevenue: invoices.reduce((sum, inv) => sum + inv.total, 0),
      paidRevenue: invoices.filter((inv) => inv.status === 'PAID').reduce((sum, inv) => sum + inv.total, 0),
      outstandingRevenue: invoices.filter((inv) => inv.status === 'SENT').reduce((sum, inv) => sum + inv.total, 0),
      draftRevenue: invoices.filter((inv) => inv.status === 'DRAFT').reduce((sum, inv) => sum + inv.total, 0),
      byStatus: {
        draft: invoices.filter((inv) => inv.status === 'DRAFT').length,
        sent: invoices.filter((inv) => inv.status === 'SENT').length,
        paid: invoices.filter((inv) => inv.status === 'PAID').length,
        overdue: invoices.filter((inv) => inv.status === 'OVERDUE').length,
      },
      byClient: {} as Record<string, { name: string; invoices: number; revenue: number; paid: number }>,
    };

    // Group by client
    invoices.forEach((invoice) => {
      const clientKey = invoice.client.companyName;
      if (!summary.byClient[clientKey]) {
        summary.byClient[clientKey] = {
          name: clientKey,
          invoices: 0,
          revenue: 0,
          paid: 0,
        };
      }
      summary.byClient[clientKey].invoices++;
      summary.byClient[clientKey].revenue += invoice.total;
      if (invoice.status === 'PAID') {
        summary.byClient[clientKey].paid += invoice.total;
      }
    });

    return {
      invoices,
      summary,
    };
}
