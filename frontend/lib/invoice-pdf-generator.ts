import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

interface InvoiceLineItem {
  date?: Date;
  description: string;
  hours: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  // Company Info (From Tenant)
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  companyZip: string;
  companyCountry?: string;
  companyEmail: string;
  companyPhone: string;
  companyLogo?: string; // URL or base64

  // Client Info
  clientName: string;
  clientCompany: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientZip: string;
  clientCountry?: string;

  // Invoice Details
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  terms: string;
  serviceStartDate?: Date;
  serviceEndDate?: Date;

  // Line Items
  lineItems: InvoiceLineItem[];

  // Totals
  subtotal: number;
  tax: number;
  total: number;
  amountPaid?: number;
  balanceDue: number;

  // Status
  status: string;
  currency: string;
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbols: { [key: string]: string } = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    JPY: '¥',
    AUD: 'A$',
    CAD: 'C$',
    SGD: 'S$',
  };

  const symbol = symbols[currency] || currency;
  const formatted = Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
}

export function generateInvoicePDF(invoiceData: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Colors
      const primaryColor = '#0066CC';
      const lightGray = '#F5F7FA';
      const darkGray = '#4A5568';
      const borderColor = '#E2E8F0';

      // Page dimensions
      const pageWidth = doc.page.width;
      const margin = 50;
      const contentWidth = pageWidth - margin * 2;

      // ===== HEADER SECTION =====
      let yPosition = 50;

      // "INVOICE" title on the left
      doc
        .fontSize(28)
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .text('INVOICE', margin, yPosition);

      // Company info on the left
      yPosition += 10;
      doc
        .fontSize(10)
        .fillColor(darkGray)
        .font('Helvetica-Bold')
        .text(invoiceData.companyName, margin, yPosition);

      yPosition += 15;
      doc
        .fontSize(9)
        .font('Helvetica')
        .text(invoiceData.companyAddress, margin, yPosition)
        .text(`${invoiceData.companyCity}, ${invoiceData.companyState} ${invoiceData.companyZip}${invoiceData.companyCountry ? ' ' + invoiceData.companyCountry : ''}`, margin, yPosition + 12)
        .text(invoiceData.companyEmail, margin, yPosition + 24)
        .text(invoiceData.companyPhone, margin, yPosition + 36);

      // Company logo on the right (placeholder if no logo)
      const logoX = pageWidth - margin - 150;
      const logoY = 50;
      if (invoiceData.companyLogo) {
        // Logo would be inserted here if available
        // For now, we'll add a placeholder
      }

      yPosition += 80;

      // ===== BILL TO SECTION =====
      doc
        .rect(margin, yPosition, contentWidth, 80)
        .fillAndStroke(lightGray, borderColor);

      doc
        .fontSize(9)
        .fillColor(darkGray)
        .font('Helvetica-Bold')
        .text('Bill to', margin + 15, yPosition + 15);

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(invoiceData.clientName, margin + 15, yPosition + 30);

      doc
        .fontSize(9)
        .font('Helvetica')
        .text(invoiceData.clientCompany, margin + 15, yPosition + 44)
        .text(invoiceData.clientAddress, margin + 15, yPosition + 56)
        .text(`${invoiceData.clientCity}, ${invoiceData.clientState} ${invoiceData.clientZip}${invoiceData.clientCountry ? ' ' + invoiceData.clientCountry : ''}`, margin + 15, yPosition + 68);

      yPosition += 100;

      // ===== INVOICE DETAILS SECTION =====
      const detailsStartY = yPosition;

      // Left column
      doc
        .fontSize(10)
        .fillColor(darkGray)
        .font('Helvetica-Bold')
        .text('Invoice details', margin, yPosition);

      yPosition += 15;
      doc
        .fontSize(9)
        .font('Helvetica')
        .text(`Invoice no.: ${invoiceData.invoiceNumber}`, margin, yPosition)
        .text(`Terms: ${invoiceData.terms}`, margin, yPosition + 12)
        .text(`Invoice date: ${formatDate(invoiceData.invoiceDate)}`, margin, yPosition + 24)
        .text(`Due date: ${formatDate(invoiceData.dueDate)}`, margin, yPosition + 36);

      // Right column (if service dates exist)
      if (invoiceData.serviceStartDate && invoiceData.serviceEndDate) {
        const rightColX = margin + contentWidth / 2;
        doc
          .text(`Service Start Date: ${formatDate(invoiceData.serviceStartDate)}`, rightColX, detailsStartY + 15)
          .text(`Service End Date: ${formatDate(invoiceData.serviceEndDate)}`, rightColX, detailsStartY + 27);
      }

      yPosition += 60;

      // ===== LINE ITEMS TABLE =====
      const tableTop = yPosition;
      const tableHeaders = ['#', 'Date', 'Product or service', 'Description', 'Qty', 'Rate', 'Amount'];
      const columnWidths = [30, 70, 120, 150, 40, 60, 75];
      const columnX = [margin];

      for (let i = 1; i < columnWidths.length; i++) {
        columnX.push(columnX[i - 1] + columnWidths[i - 1]);
      }

      // Table header
      doc
        .fontSize(9)
        .fillColor(darkGray)
        .font('Helvetica-Bold');

      tableHeaders.forEach((header, i) => {
        doc.text(header, columnX[i], tableTop, {
          width: columnWidths[i],
          align: i >= 4 ? 'right' : 'left',
        });
      });

      // Header underline
      yPosition = tableTop + 15;
      doc
        .strokeColor(borderColor)
        .lineWidth(1)
        .moveTo(margin, yPosition)
        .lineTo(pageWidth - margin, yPosition)
        .stroke();

      yPosition += 10;

      // Table rows
      doc.fontSize(9).font('Helvetica').fillColor(darkGray);

      invoiceData.lineItems.forEach((item, index) => {
        const rowY = yPosition;

        // Check if we need a new page
        if (rowY > doc.page.height - 200) {
          doc.addPage();
          yPosition = 50;
        }

        doc
          .text(`${index + 1}.`, columnX[0], rowY, { width: columnWidths[0] })
          .text(item.date ? formatDate(item.date) : '', columnX[1], rowY, { width: columnWidths[1] })
          .text('IT Consulting Service', columnX[2], rowY, { width: columnWidths[2] })
          .text(item.description, columnX[3], rowY, { width: columnWidths[3] })
          .text(item.hours.toString(), columnX[4], rowY, { width: columnWidths[4], align: 'right' })
          .text(formatCurrency(item.rate, invoiceData.currency), columnX[5], rowY, { width: columnWidths[5], align: 'right' })
          .text(formatCurrency(item.amount, invoiceData.currency), columnX[6], rowY, { width: columnWidths[6], align: 'right' });

        yPosition += 30;
      });

      yPosition += 20;

      // Contact message
      doc
        .fontSize(9)
        .font('Helvetica-Oblique')
        .text(`Contact ${invoiceData.companyName} to pay.`, margin, yPosition);

      yPosition += 40;

      // ===== TOTALS SECTION =====
      const totalsX = pageWidth - margin - 200;

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Total', totalsX, yPosition, { width: 120, align: 'left' })
        .text(formatCurrency(invoiceData.total, invoiceData.currency), totalsX + 120, yPosition, { width: 80, align: 'right' });

      yPosition += 20;

      if (invoiceData.amountPaid && invoiceData.amountPaid > 0) {
        doc
          .fontSize(10)
          .font('Helvetica')
          .text('Payment', totalsX, yPosition, { width: 120, align: 'left' })
          .text(formatCurrency(-invoiceData.amountPaid, invoiceData.currency), totalsX + 120, yPosition, { width: 80, align: 'right' });

        yPosition += 20;
      }

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Balance due', totalsX, yPosition, { width: 120, align: 'left' })
        .text(formatCurrency(invoiceData.balanceDue, invoiceData.currency), totalsX + 120, yPosition, { width: 80, align: 'right' });

      yPosition += 30;

      // Paid status
      if (invoiceData.status === 'PAID') {
        doc
          .fontSize(14)
          .fillColor('#10B981')
          .font('Helvetica-Bold')
          .text('Paid in Full', totalsX, yPosition, { width: 200, align: 'right' });
      }

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateInvoicePDFStream(invoiceData: InvoiceData): Promise<Readable> {
  const buffer = await generateInvoicePDF(invoiceData);
  return Readable.from(buffer);
}
