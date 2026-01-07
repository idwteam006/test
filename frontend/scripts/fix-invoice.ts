import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixInvoice() {
  try {
    // Get the invoice with all details
    const invoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: 'INV-00005' },
      include: {
        lineItems: true,
        client: true,
      }
    });

    if (!invoice) {
      console.log('Invoice not found');
      return;
    }

    console.log('Raw Invoice Data:', JSON.stringify(invoice, null, 2));

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixInvoice();
