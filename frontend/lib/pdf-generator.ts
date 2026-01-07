import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  client: {
    companyName: string;
    contactName: string;
    contactEmail: string;
    addressLine1?: string;
    city?: string;
    country?: string;
  };
  company: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  lineItems: Array<{
    description: string;
    hours?: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

export function generateInvoicePDF(invoice: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header - Company Info
  doc.setFontSize(24);
  doc.setTextColor(99, 102, 241); // Indigo
  doc.text(invoice.company.name || 'Zenora', 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate
  if (invoice.company.address) doc.text(invoice.company.address, 14, 30);
  if (invoice.company.email) doc.text(invoice.company.email, 14, 36);
  if (invoice.company.phone) doc.text(invoice.company.phone, 14, 42);

  // Invoice Title & Number
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text('INVOICE', pageWidth - 14, 22, { align: 'right' });

  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(`#${invoice.invoiceNumber}`, pageWidth - 14, 30, { align: 'right' });

  // Dates
  doc.setFontSize(10);
  doc.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, pageWidth - 14, 36, {
    align: 'right',
  });
  doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, pageWidth - 14, 42, {
    align: 'right',
  });

  // Bill To Section
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('BILL TO:', 14, 58);

  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text(invoice.client.companyName, 14, 66);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(invoice.client.contactName, 14, 72);
  doc.text(invoice.client.contactEmail, 14, 78);
  if (invoice.client.addressLine1) {
    doc.text(invoice.client.addressLine1, 14, 84);
  }
  if (invoice.client.city && invoice.client.country) {
    doc.text(`${invoice.client.city}, ${invoice.client.country}`, 14, 90);
  }

  // Line Items Table
  const tableData = invoice.lineItems.map((item) => [
    item.description,
    item.hours ? `${item.hours}h` : '-',
    `$${item.rate.toFixed(2)}`,
    `$${item.amount.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 105,
    head: [['Description', 'Hours', 'Rate', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [99, 102, 241], // Indigo-500
      textColor: [255, 255, 255],
      fontSize: 11,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);

  doc.text('Subtotal:', pageWidth - 60, finalY);
  doc.text(`$${invoice.subtotal.toFixed(2)}`, pageWidth - 14, finalY, { align: 'right' });

  doc.text('Tax:', pageWidth - 60, finalY + 6);
  doc.text(`$${invoice.tax.toFixed(2)}`, pageWidth - 14, finalY + 6, { align: 'right' });

  // Total
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.setFont(undefined, 'bold');
  doc.text('TOTAL:', pageWidth - 60, finalY + 14);
  doc.text(`$${invoice.total.toFixed(2)}`, pageWidth - 14, finalY + 14, { align: 'right' });

  // Notes
  if (invoice.notes) {
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Notes:', 14, finalY + 30);
    doc.setFontSize(8);
    const splitNotes = doc.splitTextToSize(invoice.notes, pageWidth - 28);
    doc.text(splitNotes, 14, finalY + 36);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });

  return doc;
}
