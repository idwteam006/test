import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { sendInvoicePaymentConfirmation } from '@/lib/resend-email';
import { format } from 'date-fns';

// POST /api/admin/invoices/[id]/pay - Mark invoice as paid
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromSession(request);

    if (!user || (user.role !== 'ADMIN' && user.role !== 'ACCOUNTANT')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.tenantId !== user.tenantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const paidAt = new Date();
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt,
      },
      include: {
        client: true,
        lineItems: true,
      },
    });

    // Get tenant settings for company name
    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: { companyName: true },
    });

    // Send payment confirmation email to client
    if (updatedInvoice.client?.contactEmail) {
      sendInvoicePaymentConfirmation({
        to: updatedInvoice.client.contactEmail,
        invoiceNumber: updatedInvoice.invoiceNumber,
        clientName: updatedInvoice.client.companyName || updatedInvoice.client.contactName || 'Valued Customer',
        companyName: tenantSettings?.companyName || 'Zenora',
        paidDate: format(paidAt, 'MMM d, yyyy'),
        total: Number(updatedInvoice.total),
        currency: updatedInvoice.client.currency || 'USD',
      }).catch((err) => {
        console.error('Failed to send payment confirmation email:', err);
      });
    }

    return NextResponse.json({ success: true, invoice: updatedInvoice });
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    return NextResponse.json({ success: false, error: 'Failed to mark invoice as paid' }, { status: 500 });
  }
}
