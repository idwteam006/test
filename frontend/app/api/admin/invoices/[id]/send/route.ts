import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { sendInvoiceEmail } from '@/lib/resend-email';
import { generateInvoicePDF } from '@/lib/invoice-pdf-generator-jspdf';
import { uploadInvoicePDFToS3 } from '@/lib/s3-invoice-upload';

// POST /api/admin/invoices/[id]/send - Send invoice to client via email
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromSession(request);

    if (!user || (user.role !== 'ADMIN' && user.role !== 'ACCOUNTANT')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if this is a resend request
    const body = await request.json().catch(() => ({}));
    const isResend = body.resend === true;

    // Fetch invoice with all related data
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        lineItems: true,
        tenant: {
          include: {
            settings: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.tenantId !== user.tenantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Allow resending for PAID invoices only if explicitly requested
    if (invoice.status === 'PAID' && !isResend) {
      return NextResponse.json({ success: false, error: 'Cannot send a paid invoice' }, { status: 400 });
    }

    // Check if development mode is enabled
    const isDevelopmentMode = invoice.tenant.settings?.isDevelopmentMode || false;

    // Check if SMTP is configured (either SMTP_USER or legacy RESEND_API_KEY)
    const hasEmailConfig = !!(process.env.SMTP_USER || process.env.RESEND_API_KEY);

    console.log('[Send Invoice] Configuration:', {
      isDevelopmentMode,
      hasEmailConfig,
      tenantId: invoice.tenantId,
    });

    // Send email only if not in development mode and email is configured
    let emailSent = false;
    let emailError = null;

    if (!isDevelopmentMode && hasEmailConfig) {
      console.log('[Send Invoice] Attempting to send email to:', invoice.client.contactEmail);
      try {
        // Format dates
        const invoiceDate = new Date(invoice.issueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        // Generate PDF attachment
        const tenantSettings = invoice.tenant.settings;
        const billingAddress = tenantSettings?.billingAddress as any;

        const pdfBuffer = await generateInvoicePDF({
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
          serviceStartDate: invoice.issueDate,
          serviceEndDate: invoice.dueDate,

          // Line Items
          lineItems: invoice.lineItems.map(item => ({
            date: undefined,
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
        });

        // Send email with PDF attachment using Resend
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zenora.ai';
        emailSent = await sendInvoiceEmail({
          to: invoice.client.contactEmail,
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.client.companyName,
          companyName: tenantSettings?.companyName || invoice.tenant.name,
          invoiceDate,
          dueDate,
          total: invoice.total,
          currency: tenantSettings?.currency || 'USD',
          invoiceUrl: `${appUrl}/invoices/${invoice.id}`,
          pdfBuffer,
        });

        if (emailSent) {
          console.log(`✅ Invoice ${invoice.invoiceNumber} emailed to ${invoice.client.contactEmail}`);
        } else {
          emailError = 'Failed to send email';
        }

        // Upload PDF to S3
        try {
          const s3Url = await uploadInvoicePDFToS3(pdfBuffer, invoice.invoiceNumber, invoice.tenantId);
          console.log(`✅ Invoice PDF uploaded to S3: ${s3Url}`);

          // Update invoice with S3 URL
          await prisma.invoice.update({
            where: { id },
            data: { pdfUrl: s3Url },
          });
        } catch (s3Error: any) {
          console.error('❌ Error uploading PDF to S3:', s3Error);
          // Continue even if S3 upload fails
        }
      } catch (error: any) {
        console.error('❌ Error sending invoice email:', error);
        emailError = error.message;
        // Continue to update invoice status even if email fails
      }
    }

    // Update invoice status to SENT only if not a resend
    let updatedInvoice;
    if (!isResend && invoice.status === 'DRAFT') {
      updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          status: 'SENT',
        },
        include: {
          client: true,
          lineItems: true,
        },
      });
    } else {
      // Just fetch the invoice again with includes for consistent response
      updatedInvoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          client: true,
          lineItems: true,
        },
      });
    }

    // Determine response message
    let message;
    if (isResend) {
      if (isDevelopmentMode) {
        message = '⚠️ Development Mode is ON - Email not sent. Go to Settings → Organization to disable Development Mode.';
      } else if (!hasEmailConfig) {
        message = '⚠️ Email not configured - Email not sent';
      } else if (emailSent) {
        message = `✅ Invoice resent successfully to ${invoice.client.contactEmail}`;
      } else {
        message = `⚠️ Email failed: ${emailError}`;
      }
    } else {
      if (isDevelopmentMode) {
        message = '⚠️ Invoice marked as sent but Development Mode is ON - Email not sent. Go to Settings → Organization to disable Development Mode.';
      } else if (!hasEmailConfig) {
        message = '⚠️ Invoice marked as sent but email not configured - Email not sent';
      } else if (emailSent) {
        message = `✅ Invoice sent successfully to ${invoice.client.contactEmail}`;
      } else {
        message = `⚠️ Invoice marked as sent but email failed: ${emailError}`;
      }
    }

    console.log('[Send Invoice] Result:', { emailSent, isDevelopmentMode, message });

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      emailSent,
      message,
    });
  } catch (error) {
    console.error('Error sending invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to send invoice' }, { status: 500 });
  }
}
