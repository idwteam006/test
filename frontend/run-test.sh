#!/bin/bash
cd /Volumes/E/zenora/frontend
export $(cat .env | grep -v '^#' | xargs)
/usr/local/bin/node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const start = Date.now();
  try {
    console.log('Testing Railway Database...\n');
    
    const empCount = await prisma.employee.count();
    const time1 = Date.now() - start;
    console.log('Employee count:', empCount, '(' + time1 + 'ms)');
    
    const tenantCount = await prisma.tenant.count();
    const time2 = Date.now() - start;
    console.log('Tenant count:', tenantCount, '(' + (time2 - time1) + 'ms)');
    
    console.log('\nTotal time:', (Date.now() - start) + 'ms');
    console.log('Status: ✅ Connected');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
})();
"
