// Load environment variables
import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInvoice() {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: 'INV-00005' },
      include: {
        lineItems: true,
        client: true,
      }
    });

    if (!invoice) {
      console.log('Invoice INV-00005 not found');
      return;
    }

    console.log('Invoice Details:');
    console.log('================');
    console.log(`Invoice Number: ${invoice.invoiceNumber}`);
    console.log(`Client: ${invoice.client.name}`);
    console.log(`Status: ${invoice.status}`);
    console.log(`Currency: ${invoice.currency}`);
    console.log(`\nStored Amounts:`);
    console.log(`  Subtotal: ${invoice.subtotal}`);
    console.log(`  Tax Amount: ${invoice.taxAmount}`);
    console.log(`  Total Amount: ${invoice.totalAmount}`);

    console.log(`\nLine Items:`);
    let calculatedSubtotal = 0;
    invoice.lineItems.forEach((item, index) => {
      const itemTotal = item.quantity * item.unitPrice;
      calculatedSubtotal += itemTotal;
      console.log(`  ${index + 1}. ${item.description}`);
      console.log(`     Quantity: ${item.quantity} x $${item.unitPrice} = $${itemTotal}`);
    });

    const calculatedTax = calculatedSubtotal * (invoice.taxRate / 100);
    const calculatedTotal = calculatedSubtotal + calculatedTax;

    console.log(`\nCalculated Amounts:`);
    console.log(`  Subtotal: $${calculatedSubtotal.toFixed(2)}`);
    console.log(`  Tax (${invoice.taxRate}%): $${calculatedTax.toFixed(2)}`);
    console.log(`  Total: $${calculatedTotal.toFixed(2)}`);

    console.log(`\nDiscrepancy:`);
    console.log(`  Stored Total: $${invoice.totalAmount}`);
    console.log(`  Expected Total: $${calculatedTotal.toFixed(2)}`);
    console.log(`  Difference: $${(invoice.totalAmount - calculatedTotal).toFixed(2)}`);

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvoice();
