import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/cron/check-overdue-invoices
 *
 * Cron job to automatically mark invoices as overdue
 * This endpoint should be called periodically (e.g., daily) by a cron service like Vercel Cron
 *
 * Security:
 * - Protected by cron secret header (CRON_SECRET env variable)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();

    // Find all invoices that are:
    // 1. Status is SENT (not DRAFT, not PAID, not already OVERDUE)
    // 2. Due date is in the past
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: 'SENT',
        dueDate: {
          lt: now,
        },
      },
      include: {
        client: {
          select: {
            companyName: true,
            contactEmail: true,
          },
        },
      },
    });

    console.log(`Found ${overdueInvoices.length} overdue invoices`);

    // Update status to OVERDUE
    const updatePromises = overdueInvoices.map(invoice =>
      prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'OVERDUE' },
      })
    );

    await Promise.all(updatePromises);

    // TODO: Send reminder emails to clients with overdue invoices
    // This would use the generateInvoiceReminderEmail from invoice-email.ts

    return NextResponse.json({
      success: true,
      message: `Marked ${overdueInvoices.length} invoices as overdue`,
      count: overdueInvoices.length,
      invoices: overdueInvoices.map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.client.companyName,
        dueDate: inv.dueDate,
        total: inv.total,
        daysOverdue: Math.floor((now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
      })),
    });
  } catch (error) {
    console.error('Check overdue invoices error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check overdue invoices' },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
