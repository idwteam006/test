import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { notifyAccountantInvoiceGenerated } from '@/lib/email-notifications';
import { format } from 'date-fns';

// GET /api/admin/invoices - List all invoices
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user || (user.role !== 'ADMIN' && user.role !== 'ACCOUNTANT')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: user.tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    // Run count and findMany in parallel for better performance
    const [invoices, totalCount] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
              contactEmail: true,
            },
          },
          lineItems: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: skip,
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      invoices,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + invoices.length < totalCount,
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

// POST /api/admin/invoices - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user || (user.role !== 'ADMIN' && user.role !== 'ACCOUNTANT')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, issueDate, dueDate, lineItems, notes, paymentTerms, taxEnabled, taxRate } = body;

    console.log('[POST /api/admin/invoices] Request body:', JSON.stringify(body, null, 2));

    if (!clientId || !issueDate || !dueDate || !lineItems || lineItems.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Normalize line items - accept both old format (quantity/unitPrice) and new format (hours/rate/amount)
    const normalizedLineItems = lineItems.map((item: any) => {
      // If old format, convert to new format
      if (item.quantity !== undefined && item.unitPrice !== undefined && !item.rate) {
        return {
          description: item.description,
          hours: item.quantity,
          rate: item.unitPrice,
          amount: item.quantity * item.unitPrice,
        };
      }
      // Return as-is if already in new format
      return item;
    });

    // Validate normalized line items have required fields
    const invalidItems = normalizedLineItems.filter((item: any) =>
      !item.description || item.rate === undefined || item.amount === undefined
    );

    if (invalidItems.length > 0) {
      console.error('[POST /api/admin/invoices] Invalid line items after normalization:', invalidItems);
      return NextResponse.json({
        success: false,
        error: 'Line items missing required fields (description, rate, amount)'
      }, { status: 400 });
    }

    // Calculate totals
    const subtotal = normalizedLineItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);

    // Apply tax only if taxEnabled is true
    const calculatedTaxRate = taxEnabled ? (taxRate || 0) / 100 : 0;
    const tax = subtotal * calculatedTaxRate;
    const total = subtotal + tax;

    // Generate invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    let invoiceNumber = 'INV-00001';
    if (lastInvoice) {
      try {
        const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[1]);
        if (!isNaN(lastNumber)) {
          invoiceNumber = `INV-${(lastNumber + 1).toString().padStart(5, '0')}`;
        } else {
          console.warn('[POST /api/admin/invoices] Invalid last invoice number format:', lastInvoice.invoiceNumber);
        }
      } catch (error) {
        console.error('[POST /api/admin/invoices] Error parsing last invoice number:', error);
      }
    }

    console.log('[POST /api/admin/invoices] Generated invoice number:', invoiceNumber);

    // Create invoice with line items
    const invoice = await prisma.invoice.create({
      data: {
        tenantId: user.tenantId,
        clientId,
        invoiceNumber,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        subtotal,
        tax,
        total,
        status: 'DRAFT',
        paymentTerms: paymentTerms || 'NET_30',
        lineItems: {
          create: normalizedLineItems.map((item: any) => ({
            tenantId: user.tenantId,
            description: item.description,
            hours: item.hours || null,
            rate: item.rate,
            amount: item.amount,
          })),
        },
      },
      include: {
        client: true,
        lineItems: true,
      },
    });

    console.log('[POST /api/admin/invoices] Invoice created successfully:', invoice.id);

    // Send response immediately - don't block on email notifications
    const response = NextResponse.json({ success: true, invoice });

    // Fire-and-forget: Send email notifications in the background
    // This runs after the response is returned to the client
    (async () => {
      try {
        const accountants = await prisma.user.findMany({
          where: {
            tenantId: user.tenantId,
            role: 'ACCOUNTANT',
            status: 'ACTIVE',
          },
          select: { email: true },
        });

        if (accountants.length === 0) return;

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zenora.ai';
        const viewUrl = `${appUrl}/admin/invoices/${invoice.id}`;

        // Send all notifications in parallel
        await Promise.allSettled(
          accountants.map((accountant) =>
            notifyAccountantInvoiceGenerated({
              accountantEmail: accountant.email,
              invoiceNumber: invoice.invoiceNumber,
              clientName: invoice.client?.companyName || invoice.client?.contactName || 'Unknown Client',
              amount: Number(invoice.total),
              currency: invoice.client?.currency || 'USD',
              dueDate: format(new Date(dueDate), 'MMM d, yyyy'),
              viewUrl,
            })
          )
        );
      } catch (err) {
        console.error('Failed to send invoice notifications:', err);
      }
    })();

    return response;
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to create invoice' }, { status: 500 });
  }
}
