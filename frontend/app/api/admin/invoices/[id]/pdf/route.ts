import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { generateInvoicePDF } from '@/lib/invoice-pdf-generator-jspdf';

/**
 * GET /api/admin/invoices/[id]/pdf
 *
 * Generate and download invoice as PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Fetch invoice with all related data
    const invoice = await prisma.invoice.findUnique({
      where: {
        id,
        tenantId: user.tenantId,
      },
      include: {
        client: true,
        lineItems: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        tenant: {
          include: {
            settings: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Get tenant settings for company info
    const tenantSettings = invoice.tenant.settings;
    const billingAddress = tenantSettings?.billingAddress as any;

    // Prepare invoice data for PDF generation
    const invoiceData = {
      // Company Info
      companyName: tenantSettings?.companyName || invoice.tenant.name,
      companyAddress: billingAddress?.street || '',
      companyCity: billingAddress?.city || '',
      companyState: billingAddress?.state || '',
      companyZip: billingAddress?.zip || '',
      companyCountry: billingAddress?.country || '',
      companyEmail: tenantSettings?.billingEmail || '',
      companyPhone: tenantSettings?.companyPhone || '',
      companyLogo: tenantSettings?.logoUrl,

      // Client Info
      clientName: invoice.client.contactName,
      clientCompany: invoice.client.companyName,
      clientAddress: invoice.client.addressLine1 || '',
      clientCity: invoice.client.city || '',
      clientState: invoice.client.state || '',
      clientZip: invoice.client.postalCode || '',
      clientCountry: invoice.client.country || '',

      // Invoice Details
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      terms: invoice.paymentTerms || 'NET_30',
      serviceStartDate: invoice.issueDate, // Use invoice date as fallback
      serviceEndDate: invoice.dueDate,

      // Line Items
      lineItems: invoice.lineItems.map(item => ({
        date: undefined, // InvoiceLineItem doesn't have date field
        description: item.description,
        hours: item.hours || 1,
        rate: item.rate,
        amount: item.amount,
      })),

      // Totals
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      amountPaid: invoice.paidAt ? invoice.total : 0,
      balanceDue: invoice.paidAt ? 0 : invoice.total,

      // Status
      status: invoice.status,
      currency: tenantSettings?.currency || 'USD',
    };

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoiceData);

    // Return PDF as download
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Generate invoice PDF error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
