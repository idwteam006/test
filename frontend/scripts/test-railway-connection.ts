#!/usr/bin/env tsx

/**
 * Railway Connection Test Script
 * Tests PostgreSQL and Redis connections
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

async function testConnections() {
  console.log('🧪 Testing Railway Connections...\n');

  // Test PostgreSQL
  console.log('1️⃣ Testing PostgreSQL...');
  try {
    const prisma = new PrismaClient();
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('✅ PostgreSQL Connected!');
    console.log('   Version:', result[0]?.version?.split(' ')[0] || 'Unknown');
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ PostgreSQL Connection Failed:', error.message);
  }

  console.log('');

  // Test Redis
  console.log('2️⃣ Testing Redis...');
  try {
    const redis = new Redis(process.env.REDIS_URL!);
    const pong = await redis.ping();
    const info = await redis.info('server');
    const version = info.match(/redis_version:(.+)/)?.[1] || 'Unknown';

    console.log('✅ Redis Connected!');
    console.log('   Response:', pong);
    console.log('   Version:', version.trim());

    // Test set/get
    await redis.set('test:railway', 'connected');
    const value = await redis.get('test:railway');
    console.log('   Test Key:', value);
    await redis.del('test:railway');

    await redis.quit();
  } catch (error) {
    console.error('❌ Redis Connection Failed:', error.message);
  }

  console.log('\n✨ Connection tests complete!\n');
}

testConnections().catch(console.error);
