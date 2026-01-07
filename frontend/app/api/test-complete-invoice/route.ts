import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { generateInvoiceEmail } from '@/lib/email-templates/invoice-email';
import { generateInvoicePDF } from '@/lib/invoice-pdf-generator-v2';
import { uploadInvoicePDFToS3 } from '@/lib/s3-invoice-upload';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const to = searchParams.get('to') || 'nbhupathi@gmail.com';

    // Step 1: Get or create a test tenant
    let tenant = await prisma.tenant.findFirst({
      include: { settings: true },
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Demo Tenant',
          slug: `demo-tenant-${Date.now()}`,
        },
        include: { settings: true },
      });
    }

    // Step 2: Get or create a test client
    let client = await prisma.client.findFirst({
      where: {
        tenantId: tenant.id,
        companyName: 'Sample Client Inc.',
      },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          tenantId: tenant.id,
          clientId: `CLIENT-${Date.now()}`,
          companyName: 'Sample Client Inc.',
          contactName: 'John Smith',
          contactEmail: to,
          contactPhone: '+1 (555) 123-4567',
          addressLine1: '123 Business Avenue',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
          currency: 'USD',
          paymentTerms: 'NET_30',
        },
      });
    }

    // Step 3: Create invoice
    const invoiceNumber = `INV-DEMO-${Date.now()}`;
    const issueDate = new Date('2024-01-15');
    const dueDate = new Date('2024-02-14');

    const invoice = await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        clientId: client.id,
        invoiceNumber,
        issueDate,
        dueDate,
        subtotal: 9400,
        tax: 940,
        total: 10340,
        status: 'SENT',
        paymentTerms: 'NET_30',
        lineItems: {
          create: [
            {
              tenantId: tenant.id,
              description: 'Web Development Services - Full stack development',
              hours: 40,
              rate: 150,
              amount: 6000,
            },
            {
              tenantId: tenant.id,
              description: 'UI/UX Design - User interface and experience design',
              hours: 20,
              rate: 120,
              amount: 2400,
            },
            {
              tenantId: tenant.id,
              description: 'Project Management - Agile coordination',
              hours: 10,
              rate: 100,
              amount: 1000,
            },
          ],
        },
      },
      include: {
        lineItems: true,
        client: true,
        tenant: { include: { settings: true } },
      },
    });

    // Step 4: Generate PDF
    const pdfBuffer = await generateInvoicePDF({
      // Company Info
      companyName: 'IDWTEAM LLC',
      companyAddress: '1740 Grassland Pkwy Suite 303',
      companyCity: 'Alpharetta',
      companyState: 'GA',
      companyZip: '30004',
      companyCountry: 'USA',
      companyEmail: 'vijay.n@idwteam.com',
      companyPhone: '+1 (678) 481-2276',
      companyLogo: undefined,

      // Client Info
      clientName: client.contactName,
      clientCompany: client.companyName,
      clientAddress: client.addressLine1 || '',
      clientCity: client.city || '',
      clientState: client.state || '',
      clientZip: client.postalCode || '',
      clientCountry: client.country || '',

      // Invoice Details
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      terms: 'Net 30',
      serviceStartDate: new Date('2024-01-01'),
      serviceEndDate: new Date('2024-01-31'),

      // Line Items
      lineItems: invoice.lineItems.map(item => ({
        date: new Date('2024-01-15'),
        description: item.description,
        hours: item.hours || 1,
        rate: item.rate,
        amount: item.amount,
      })),

      // Totals
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      amountPaid: 0,
      balanceDue: invoice.total,

      // Status
      status: 'SENT',
      currency: 'USD',
    });

    // Step 5: Upload to S3
    let s3Url = '';
    try {
      s3Url = await uploadInvoicePDFToS3(pdfBuffer, invoice.invoiceNumber, tenant.id);

      // Update invoice with PDF URL
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { pdfUrl: s3Url },
      });

      console.log(`✅ Invoice PDF uploaded to S3: ${s3Url}`);
    } catch (s3Error: any) {
      console.error('❌ Error uploading to S3:', s3Error);
      return NextResponse.json({
        success: false,
        error: 'Failed to upload PDF to S3',
        details: s3Error.message,
      }, { status: 500 });
    }

    // Step 6: Send email with link
    if (process.env.SMTP_HOST) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        });

        const emailHtml = generateInvoiceEmail({
          clientName: client.companyName,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.issueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          dueDate: invoice.dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          total: invoice.total,
          currency: 'USD',
          items: invoice.lineItems.map(item => ({
            description: item.description,
            quantity: item.hours || 1,
            unitPrice: item.rate,
            total: item.amount,
          })),
          subtotal: invoice.subtotal,
          taxAmount: invoice.tax,
          companyName: 'IDWTEAM LLC',
          paymentInstructions: `Payment can be made via bank transfer. Your invoice PDF is available at: ${s3Url}`,
          invoiceUrl: s3Url,
        });

        await transporter.sendMail({
          from: `"${process.env.EMAIL_FROM_NAME || 'Zenora Demo'}" <${process.env.SMTP_FROM}>`,
          to: to,
          subject: `Invoice ${invoice.invoiceNumber} from IDWTEAM LLC`,
          html: emailHtml,
          attachments: [
            {
              filename: `Invoice-${invoice.invoiceNumber}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
        });

        console.log(`✅ Email sent to ${to}`);
      } catch (emailError: any) {
        console.error('❌ Error sending email:', emailError);
        return NextResponse.json({
          success: true,
          message: 'Invoice created and uploaded to S3, but email failed',
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            s3Url,
          },
          emailError: emailError.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sample invoice created, uploaded to S3, and emailed to ${to}`,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        s3Url,
      },
    });
  } catch (error: any) {
    console.error('Error creating sample invoice:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create sample invoice',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
