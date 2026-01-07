import PDFDocument from 'pdfkit';

interface InvoiceLineItem {
  date?: Date;
  description: string;
  hours: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  // Company Info
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  companyZip: string;
  companyCountry?: string;
  companyEmail: string;
  companyPhone: string;
  companyLogo?: string;

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
        autoFirstPage: true,
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const margin = 50;
      const contentWidth = pageWidth - margin * 2;

      let y = 50;

      // INVOICE Title (blue, top left)
      doc
        .fontSize(24)
        .fillColor('#0066CC')
        .font('Helvetica-Bold')
        .text('INVOICE', margin, y);

      y += 40;

      // Company Info (left side)
      doc
        .fontSize(11)
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .text(invoiceData.companyName, margin, y);

      y += 15;
      doc
        .fontSize(9)
        .font('Helvetica')
        .text(invoiceData.companyAddress, margin, y)
        .text(`${invoiceData.companyCity}, ${invoiceData.companyState} ${invoiceData.companyZip}`, margin, y + 12)
        .text(invoiceData.companyEmail, margin, y + 24)
        .text(invoiceData.companyPhone, margin, y + 36);

      // Logo placeholder (right side) - if you have a logo URL, you can add it here
      // For now, just reserve the space
      const logoX = pageWidth - margin - 200;
      const logoY = 50;

      y += 80;

      // Bill to section (light background box)
      const billToBoxHeight = 80;
      doc
        .rect(margin, y, contentWidth, billToBoxHeight)
        .fillAndStroke('#F5F7FA', '#E2E8F0');

      doc
        .fontSize(9)
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .text('Bill to', margin + 15, y + 15);

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(invoiceData.clientName, margin + 15, y + 30);

      doc
        .fontSize(9)
        .font('Helvetica')
        .text(invoiceData.clientCompany, margin + 15, y + 44);

      if (invoiceData.clientAddress) {
        doc.text(invoiceData.clientAddress, margin + 15, y + 56);
      }

      if (invoiceData.clientCity) {
        doc.text(
          `${invoiceData.clientCity}, ${invoiceData.clientState} ${invoiceData.clientZip}${invoiceData.clientCountry ? ' ' + invoiceData.clientCountry : ''}`,
          margin + 15,
          y + 68
        );
      }

      y += billToBoxHeight + 20;

      // Invoice details section
      doc
        .fontSize(10)
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .text('Invoice details', margin, y);

      const detailsY = y + 15;
      doc
        .fontSize(9)
        .font('Helvetica')
        .text(`Invoice no.: ${invoiceData.invoiceNumber}`, margin, detailsY)
        .text(`Terms: ${invoiceData.terms}`, margin, detailsY + 14)
        .text(`Invoice date: ${formatDate(invoiceData.invoiceDate)}`, margin, detailsY + 28)
        .text(`Due date: ${formatDate(invoiceData.dueDate)}`, margin, detailsY + 42);

      // Service dates (right side)
      if (invoiceData.serviceStartDate && invoiceData.serviceEndDate) {
        const rightX = margin + contentWidth / 2;
        doc
          .text(`Service Start Date: ${formatDate(invoiceData.serviceStartDate)}`, rightX, detailsY)
          .text(`Service End Date: ${formatDate(invoiceData.serviceEndDate)}`, rightX, detailsY + 14);
      }

      y += 95;

      // Table header
      const tableTop = y;
      doc
        .fontSize(9)
        .fillColor('#4A5568')
        .font('Helvetica-Bold');

      const col1 = margin;
      const col2 = margin + 30;
      const col3 = margin + 100;
      const col4 = margin + 250;
      const col5 = pageWidth - margin - 180;
      const col6 = pageWidth - margin - 120;
      const col7 = pageWidth - margin - 60;

      doc
        .text('#', col1, tableTop)
        .text('Date', col2, tableTop)
        .text('Product or service', col3, tableTop)
        .text('Description', col4, tableTop)
        .text('Qty', col5, tableTop, { width: 40, align: 'right' })
        .text('Rate', col6, tableTop, { width: 50, align: 'right' })
        .text('Amount', col7, tableTop, { width: 80, align: 'right' });

      y = tableTop + 18;

      // Header line
      doc
        .strokeColor('#CBD5E0')
        .lineWidth(0.5)
        .moveTo(margin, y)
        .lineTo(pageWidth - margin, y)
        .stroke();

      y += 10;

      // Line items
      doc.fontSize(9).font('Helvetica').fillColor('#000000');

      invoiceData.lineItems.forEach((item, index) => {
        doc
          .text(`${index + 1}.`, col1, y)
          .text(item.date ? formatDate(item.date) : '', col2, y)
          .text('IT Consulting Service', col3, y)
          .text(item.description, col4, y, { width: 150 })
          .text(item.hours.toString(), col5, y, { width: 40, align: 'right' })
          .text(formatCurrency(item.rate, invoiceData.currency), col6, y, { width: 50, align: 'right' })
          .text(formatCurrency(item.amount, invoiceData.currency), col7, y, { width: 80, align: 'right' });

        y += 30;
      });

      y += 20;

      // Contact message
      doc
        .fontSize(9)
        .font('Helvetica-Oblique')
        .fillColor('#4A5568')
        .text(`Contact ${invoiceData.companyName} to pay.`, margin, y);

      y += 40;

      // Totals (right-aligned)
      const totalsX = pageWidth - margin - 200;
      const totalsLabelX = totalsX;
      const totalsValueX = totalsX + 120;

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Total', totalsLabelX, y, { width: 100 })
        .text(formatCurrency(invoiceData.total, invoiceData.currency), totalsValueX, y, { width: 80, align: 'right' });

      y += 25;

      if (invoiceData.amountPaid && invoiceData.amountPaid > 0) {
        doc
          .fontSize(11)
          .font('Helvetica')
          .text('Payment', totalsLabelX, y, { width: 100 })
          .text(formatCurrency(-invoiceData.amountPaid, invoiceData.currency), totalsValueX, y, { width: 80, align: 'right' });

        y += 25;
      }

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Balance due', totalsLabelX, y, { width: 100 })
        .text(formatCurrency(invoiceData.balanceDue, invoiceData.currency), totalsValueX, y, { width: 80, align: 'right' });

      y += 35;

      // Paid status
      if (invoiceData.status === 'PAID' || invoiceData.balanceDue === 0) {
        doc
          .fontSize(16)
          .fillColor('#22C55E')
          .font('Helvetica-Bold')
          .text('Paid in Full', totalsLabelX, y, { width: 200, align: 'right' });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
