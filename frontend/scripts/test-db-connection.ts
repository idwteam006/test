import { prisma } from '../lib/prisma';

async function testConnection() {
  const startTime = Date.now();

  try {
    console.log('🔍 Testing Railway Database Connection...\n');
    console.log('Database: Railway PostgreSQL');
    console.log('Host: interchange.proxy.rlwy.net:34268\n');

    // Test 1: Simple query
    console.log('Test 1: Simple query...');
    const queryStart = Date.now();
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    const queryTime = Date.now() - queryStart;
    console.log(`  ✅ Success (${queryTime}ms)\n`);

    // Test 2: Count tables
    console.log('Test 2: Counting tables...');
    const tablesStart = Date.now();
    const tables = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    const tablesTime = Date.now() - tablesStart;
    console.log(`  ✅ Found ${Number(tables[0].count)} tables (${tablesTime}ms)\n`);

    // Test 3: Count employees
    console.log('Test 3: Counting employees...');
    const empStart = Date.now();
    const empCount = await prisma.employee.count();
    const empTime = Date.now() - empStart;
    console.log(`  ✅ Total employees: ${empCount} (${empTime}ms)\n`);

    // Test 4: Count tenants
    console.log('Test 4: Counting tenants...');
    const tenantStart = Date.now();
    const tenantCount = await prisma.tenant.count();
    const tenantTime = Date.now() - tenantStart;
    console.log(`  ✅ Total tenants: ${tenantCount} (${tenantTime}ms)\n`);

    // Test 5: Test transaction with timeout
    console.log('Test 5: Transaction with timeout...');
    const txStart = Date.now();
    await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_sleep(0.1)`;
        return true;
      },
      {
        timeout: 15000,
      }
    );
    const txTime = Date.now() - txStart;
    console.log(`  ✅ Transaction completed (${txTime}ms)\n`);

    const totalTime = Date.now() - startTime;
    console.log(`✅ All tests passed! Total time: ${totalTime}ms\n`);

    // Connection info
    console.log('📊 Performance Summary:');
    console.log(`  - Simple query: ${queryTime}ms`);
    console.log(`  - Table count: ${tablesTime}ms`);
    console.log(`  - Employee count: ${empTime}ms`);
    console.log(`  - Tenant count: ${tenantTime}ms`);
    console.log(`  - Transaction test: ${txTime}ms`);
    console.log(`  - Total: ${totalTime}ms\n`);

    if (totalTime > 3000) {
      console.log('⚠️  Connection is slow (>3s). This may cause transaction timeouts.');
      console.log('💡 Recommendation: Consider upgrading Railway plan or optimizing queries');
    } else if (totalTime > 1500) {
      console.log('⚠️  Connection is moderate (>1.5s). Monitor for timeout issues.');
    } else {
      console.log('✅ Connection speed is excellent!');
    }

    // Check database version
    console.log('\n📋 Database Info:');
    const version = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;
    console.log(`  Version: ${version[0].version.split(',')[0]}`);

  } catch (error) {
    console.error('\n❌ Connection test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
