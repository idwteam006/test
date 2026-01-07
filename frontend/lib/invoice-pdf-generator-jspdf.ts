import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  return new Date(date).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
}

async function loadImageFromUrl(url: string): Promise<{ data: string; width: number; height: number }> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // Determine image type from URL or content-type
    const contentType = response.headers.get('content-type') || 'image/png';
    const dataUrl = `data:${contentType};base64,${base64}`;

    // Get image dimensions
    // For server-side, we'll use a simple approach with image-size or similar
    // For now, return default dimensions and let jsPDF handle it
    return {
      data: dataUrl,
      width: 0,
      height: 0,
    };
  } catch (error) {
    console.error('[Invoice PDF] Error loading image:', error);
    throw error;
  }
}

export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<Buffer> {
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  let y = 20;

  // Header - INVOICE Title (Left)
  doc.setFontSize(24);
  doc.setTextColor(0, 102, 204); // Blue color
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', margin, y);

  // Company Logo (Top Right) - Fixed height, auto width
  if (invoiceData.companyLogo) {
    try {
      const logoImage = await loadImageFromUrl(invoiceData.companyLogo);
      const fixedHeight = 20; // Fixed 20mm height
      const logoY = 12;

      // Get image properties to calculate aspect ratio
      const imgProps = doc.getImageProperties(logoImage.data);
      const aspectRatio = imgProps.width / imgProps.height;
      const calculatedWidth = fixedHeight * aspectRatio;

      // Position from right edge
      const logoX = pageWidth - margin - calculatedWidth;

      // Add image with fixed height and auto width based on aspect ratio
      doc.addImage(logoImage.data, 'PNG', logoX, logoY, calculatedWidth, fixedHeight, undefined, 'FAST');
      console.log(`[Invoice PDF] Added company logo (${calculatedWidth.toFixed(1)}mm x ${fixedHeight}mm)`);
    } catch (error) {
      console.warn('[Invoice PDF] Failed to load company logo:', error);
      // Continue without logo - not critical
    }
  }

  y += 15;

  // Company Info (Left side)
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(invoiceData.companyName, margin, y);

  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  if (invoiceData.companyAddress) {
    doc.text(invoiceData.companyAddress, margin, y);
    y += 4;
  }

  const cityStateZip = `${invoiceData.companyCity || ''}${invoiceData.companyState ? ', ' + invoiceData.companyState : ''}${invoiceData.companyZip ? ' ' + invoiceData.companyZip : ''}`.trim();
  if (cityStateZip) {
    doc.text(cityStateZip, margin, y);
    y += 4;
  }

  if (invoiceData.companyCountry) {
    doc.text(invoiceData.companyCountry, margin, y);
    y += 4;
  }

  if (invoiceData.companyEmail) {
    doc.text(invoiceData.companyEmail, margin, y);
    y += 4;
  }

  if (invoiceData.companyPhone) {
    doc.text(invoiceData.companyPhone, margin, y);
    y += 4;
  }

  // Invoice details (Right side) - Positioned below logo
  const rightX = pageWidth - margin - 65;
  let rightY = 45; // Start below the logo area

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Number:', rightX, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceData.invoiceNumber || 'N/A', rightX + 32, rightY);

  rightY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Date:', rightX, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(invoiceData.invoiceDate), rightX + 32, rightY);

  rightY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Due Date:', rightX, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(invoiceData.dueDate), rightX + 32, rightY);

  rightY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Terms:', rightX, rightY);
  doc.setFont('helvetica', 'normal');
  // Map payment terms to readable format
  const termsMap: { [key: string]: string } = {
    'NET_15': 'Net 15',
    'NET_30': 'Net 30',
    'NET_45': 'Net 45',
    'NET_60': 'Net 60',
    'DUE_ON_RECEIPT': 'Due on Receipt',
  };
  const displayTerms = termsMap[invoiceData.terms] || invoiceData.terms || 'Net 30';
  doc.text(displayTerms, rightX + 32, rightY);

  y += 25;

  // Bill To section with background
  doc.setFillColor(245, 247, 250);
  doc.rect(margin, y, pageWidth - 2 * margin, 25, 'F');

  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill to', margin + 5, y);

  y += 5;
  doc.setFontSize(10);
  doc.text(invoiceData.clientName, margin + 5, y);

  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceData.clientCompany, margin + 5, y);

  y += 4;
  if (invoiceData.clientAddress) {
    doc.text(invoiceData.clientAddress, margin + 5, y);
    y += 4;
  }
  if (invoiceData.clientCity && invoiceData.clientState) {
    doc.text(`${invoiceData.clientCity}, ${invoiceData.clientState} ${invoiceData.clientZip}`, margin + 5, y);
  }

  y += 15;

  // Line Items Table
  const tableData = invoiceData.lineItems.map(item => [
    item.description,
    item.hours.toString(),
    formatCurrency(item.rate, invoiceData.currency),
    formatCurrency(item.amount, invoiceData.currency),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Qty/Hours', 'Rate', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [0, 102, 204],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
    didParseCell: function(data: any) {
      // Align headers to match body columns
      if (data.section === 'head') {
        if (data.column.index === 0) {
          data.cell.styles.halign = 'left';
        } else if (data.column.index === 1) {
          data.cell.styles.halign = 'center';
        } else if (data.column.index === 2 || data.column.index === 3) {
          data.cell.styles.halign = 'right';
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  // Get final Y position after table
  const finalY = (doc as any).lastAutoTable.finalY || y + 50;
  y = finalY + 10;

  // Totals section (right aligned)
  const totalsX = pageWidth - margin - 60;
  doc.setFontSize(9);

  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX, y);
  doc.text(formatCurrency(invoiceData.subtotal, invoiceData.currency), totalsX + 40, y, { align: 'right' });

  y += 5;
  doc.text('Tax:', totalsX, y);
  doc.text(formatCurrency(invoiceData.tax, invoiceData.currency), totalsX + 40, y, { align: 'right' });

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Total:', totalsX, y);
  doc.text(formatCurrency(invoiceData.total, invoiceData.currency), totalsX + 40, y, { align: 'right' });

  if (invoiceData.amountPaid && invoiceData.amountPaid > 0) {
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Amount Paid:', totalsX, y);
    doc.text(formatCurrency(invoiceData.amountPaid, invoiceData.currency), totalsX + 40, y, { align: 'right' });

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Balance Due:', totalsX, y);
    doc.text(formatCurrency(invoiceData.balanceDue, invoiceData.currency), totalsX + 40, y, { align: 'right' });
  }

  // Status badge
  if (invoiceData.status === 'PAID') {
    y += 10;
    doc.setFillColor(34, 197, 94); // Green
    doc.setTextColor(255, 255, 255);
    doc.roundedRect(totalsX, y - 4, 40, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PAID', totalsX + 20, y + 2, { align: 'center' });
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Questions? Contact us at ${invoiceData.companyEmail}`, pageWidth / 2, footerY + 5, { align: 'center' });

  // Convert to buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}
