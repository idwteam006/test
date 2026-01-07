import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n📋 Fetching all clients from database...\n');

  const clients = await prisma.client.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (clients.length === 0) {
    console.log('❌ No clients found in database');
    return;
  }

  console.log(`✅ Found ${clients.length} client(s)\n`);

  clients.forEach((client, index) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`CLIENT ${index + 1}: ${client.companyName}`);
    console.log(`${'='.repeat(80)}\n`);

    // Basic Info
    console.log('📌 BASIC INFORMATION:');
    console.log(`  ID: ${client.id}`);
    console.log(`  Client ID: ${client.clientId}`);
    console.log(`  Client Type: ${client.clientType}`);
    console.log(`  Company Name: ${client.companyName}`);
    console.log(`  Industry: ${client.industry || 'NULL'}`);
    console.log(`  Company Size: ${client.companySize || 'NULL'}`);
    console.log(`  Website: ${client.website || 'NULL'}`);
    console.log(`  Tax ID: ${client.taxId}`);
    console.log(`  Status: ${client.status}`);
    console.log(`  Priority: ${client.priority}`);

    // Primary Contact
    console.log('\n👤 PRIMARY CONTACT:');
    console.log(`  Name: ${client.contactName}`);
    console.log(`  Designation: ${client.contactDesignation || 'NULL'}`);
    console.log(`  Email: ${client.contactEmail}`);
    console.log(`  Phone: ${client.contactPhone}`);
    console.log(`  Portal Access: ${client.portalAccess}`);

    // Secondary Contact
    console.log('\n👥 SECONDARY CONTACT:');
    console.log(`  Name: ${client.secondaryContactName || 'NULL'}`);
    console.log(`  Designation: ${client.secondaryContactDesignation || 'NULL'}`);
    console.log(`  Email: ${client.secondaryContactEmail || 'NULL'}`);
    console.log(`  Phone: ${client.secondaryContactPhone || 'NULL'}`);
    console.log(`  Portal Access: ${client.secondaryPortalAccess}`);

    // Address
    console.log('\n📍 ADDRESS:');
    console.log(`  Address Line 1: ${client.addressLine1 || 'NULL'}`);
    console.log(`  Address Line 2: ${client.addressLine2 || 'NULL'}`);
    console.log(`  City: ${client.city || 'NULL'}`);
    console.log(`  State: ${client.state || 'NULL'}`);
    console.log(`  Postal Code: ${client.postalCode || 'NULL'}`);
    console.log(`  Country: ${client.country || 'NULL'}`);

    // Billing
    console.log('\n💳 BILLING:');
    console.log(`  Billing Email: ${client.billingEmail || 'NULL'}`);
    console.log(`  Billing Address: ${client.billingAddress ? JSON.stringify(client.billingAddress) : 'NULL'}`);
    console.log(`  Payment Terms: ${client.paymentTerms}`);
    console.log(`  Currency: ${client.currency}`);

    // Account Management
    console.log('\n👨‍💼 ACCOUNT MANAGEMENT:');
    console.log(`  Account Manager ID: ${client.accountManagerId || 'NULL'}`);
    console.log(`  Priority: ${client.priority}`);

    // Contract
    console.log('\n📄 CONTRACT:');
    console.log(`  Start Date: ${client.contractStartDate || 'NULL'}`);
    console.log(`  End Date: ${client.contractEndDate || 'NULL'}`);
    console.log(`  Contract Value: ${client.contractValue || 'NULL'}`);

    // Metadata
    console.log('\n📝 METADATA:');
    console.log(`  Tags: ${client.tags.length > 0 ? JSON.stringify(client.tags) : '[]'}`);
    console.log(`  Internal Notes: ${client.internalNotes || 'NULL'}`);
    console.log(`  Created By: ${client.createdBy || 'NULL'}`);
    console.log(`  Created At: ${client.createdAt.toISOString()}`);
    console.log(`  Updated At: ${client.updatedAt.toISOString()}`);
    console.log(`  Tenant ID: ${client.tenantId}`);
  });

  console.log(`\n${'='.repeat(80)}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
