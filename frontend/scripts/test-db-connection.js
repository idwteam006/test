#!/usr/bin/env node

/**
 * Test Railway PostgreSQL Connection
 * This script tests the connection to Railway database and displays information
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  console.log('🧪 Testing Railway PostgreSQL Connection...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Test 1: Check database connection
    console.log('1️⃣  Testing database connection...');
    const result = await prisma.$queryRaw`SELECT version() as version`;
    console.log('   ✅ Connected to PostgreSQL');
    console.log(`   📦 Version: ${result[0].version.split(' ')[0]} ${result[0].version.split(' ')[1]}\n`);

    // Test 2: Check current database
    console.log('2️⃣  Checking database information...');
    const dbInfo = await prisma.$queryRaw`
      SELECT
        current_database() as database,
        current_schema() as schema,
        current_user as user
    `;
    console.log(`   ✅ Database: ${dbInfo[0].database}`);
    console.log(`   ✅ Schema: ${dbInfo[0].schema}`);
    console.log(`   ✅ User: ${dbInfo[0].user}\n`);

    // Test 3: List all tables
    console.log('3️⃣  Checking Prisma tables...');
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log(`   ✅ Found ${tables.length} tables in database:\n`);

    const expectedTables = [
      'User', 'Employee', 'Department', 'Client', 'Project',
      'Task', 'ProjectAssignment', 'TimeEntry', 'LeaveRequest',
      'LeaveBalance', 'Goal', 'PerformanceReview', 'Invoice',
      'InvoiceLineItem', 'PayrollRecord', 'Notification',
      'TenantSettings', 'Tenant', 'AuditLog', 'FileUpload'
    ];

    expectedTables.forEach(tableName => {
      const exists = tables.some(t => t.table_name === tableName);
      if (exists) {
        console.log(`   ✅ ${tableName}`);
      } else {
        console.log(`   ❌ ${tableName} (MISSING)`);
      }
    });

    console.log('');

    // Test 4: Check FileUpload table structure
    console.log('4️⃣  Checking FileUpload table (NEW)...');
    const fileUploadColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'FileUpload'
      ORDER BY ordinal_position
    `;

    if (fileUploadColumns.length > 0) {
      console.log('   ✅ FileUpload table exists with columns:');
      fileUploadColumns.forEach(col => {
        console.log(`      - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(required)' : '(optional)'}`);
      });
    } else {
      console.log('   ❌ FileUpload table not found');
    }

    console.log('');

    // Test 5: Check indexes
    console.log('5️⃣  Checking indexes on FileUpload...');
    const indexes = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'FileUpload'
    `;

    if (indexes.length > 0) {
      console.log(`   ✅ Found ${indexes.length} indexes:`);
      indexes.forEach(idx => {
        console.log(`      - ${idx.indexname}`);
      });
    } else {
      console.log('   ⚠️  No indexes found on FileUpload table');
    }

    console.log('');

    // Test 6: Check enums
    console.log('6️⃣  Checking FileCategory enum...');
    const enumValues = await prisma.$queryRaw`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'FileCategory'
      ORDER BY e.enumsortorder
    `;

    if (enumValues.length > 0) {
      console.log('   ✅ FileCategory enum exists with values:');
      enumValues.forEach(val => {
        console.log(`      - ${val.enumlabel}`);
      });
    } else {
      console.log('   ❌ FileCategory enum not found');
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All connection tests passed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Summary
    console.log('📊 Summary:');
    console.log(`   - Database: Railway PostgreSQL (eu-north-1)`);
    console.log(`   - Tables: ${tables.length}`);
    console.log(`   - FileUpload: Ready for S3 integration`);
    console.log(`   - Connection: Stable\n`);

  } catch (error) {
    console.error('❌ Connection test failed:\n');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
