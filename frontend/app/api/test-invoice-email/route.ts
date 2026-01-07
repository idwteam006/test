import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { generateInvoiceEmail } from '@/lib/email-templates/invoice-email';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const to = searchParams.get('to') || 'nbhupathi@gmail.com';

    if (!process.env.SMTP_HOST) {
      return NextResponse.json(
        { success: false, error: 'SMTP not configured. Please set SMTP environment variables.' },
        { status: 500 }
      );
    }

    // Create sample invoice data
    const sampleInvoice = {
      invoiceNumber: 'INV-2024-001',
      invoiceDate: 'January 15, 2024',
      dueDate: 'February 14, 2024',
      clientName: 'Sample Client Inc.',
      companyName: 'Zenora Demo Company',
      currency: 'USD',
      items: [
        {
          description: 'Web Development Services - Full stack development including frontend and backend',
          quantity: 40,
          unitPrice: 150,
          total: 6000,
        },
        {
          description: 'UI/UX Design - User interface and experience design',
          quantity: 20,
          unitPrice: 120,
          total: 2400,
        },
        {
          description: 'Project Management - Agile project management and coordination',
          quantity: 10,
          unitPrice: 100,
          total: 1000,
        },
      ],
      subtotal: 9400,
      taxAmount: 940,
      total: 10340,
    };

    // Generate email HTML
    const emailHtml = generateInvoiceEmail({
      clientName: sampleInvoice.clientName,
      invoiceNumber: sampleInvoice.invoiceNumber,
      invoiceDate: sampleInvoice.invoiceDate,
      dueDate: sampleInvoice.dueDate,
      total: sampleInvoice.total,
      currency: sampleInvoice.currency,
      items: sampleInvoice.items,
      subtotal: sampleInvoice.subtotal,
      taxAmount: sampleInvoice.taxAmount,
      companyName: sampleInvoice.companyName,
      paymentInstructions: 'Payment can be made via bank transfer or check. Please include invoice number in payment reference.',
      invoiceUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://zenora.ai'}/invoices/sample`,
    });

    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Send email without PDF attachment
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Zenora Demo'}" <${process.env.SMTP_FROM}>`,
      to: to,
      subject: `Sample Invoice ${sampleInvoice.invoiceNumber} from Zenora Demo`,
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      message: `Sample invoice email sent successfully to ${to}`,
      invoice: sampleInvoice,
    });
  } catch (error: any) {
    console.error('Error sending sample invoice:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send sample invoice',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
