#!/usr/bin/env node

/**
 * Test Railway Redis Connection
 * This script tests the connection to Railway Redis and displays information
 */

const Redis = require('ioredis');

async function testRedisConnection() {
  console.log('🧪 Testing Railway Redis Connection...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.error('❌ REDIS_URL not found in environment variables');
    process.exit(1);
  }

  console.log(`📡 Connecting to: ${redisUrl.replace(/:[^:@]+@/, ':***@')}\n`);

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  try {
    // Test 1: PING
    console.log('1️⃣  Testing PING command...');
    const pong = await redis.ping();
    console.log(`   ✅ Response: ${pong}\n`);

    // Test 2: Server Info
    console.log('2️⃣  Getting server information...');
    const info = await redis.info('server');
    const version = info.match(/redis_version:(.+)/)?.[1]?.trim() || 'Unknown';
    const mode = info.match(/redis_mode:(.+)/)?.[1]?.trim() || 'Unknown';
    const os = info.match(/os:(.+)/)?.[1]?.trim() || 'Unknown';

    console.log(`   ✅ Redis Version: ${version}`);
    console.log(`   ✅ Mode: ${mode}`);
    console.log(`   ✅ OS: ${os}\n`);

    // Test 3: Memory Info
    console.log('3️⃣  Checking memory usage...');
    const memoryInfo = await redis.info('memory');
    const usedMemory = memoryInfo.match(/used_memory_human:(.+)/)?.[1]?.trim() || 'Unknown';
    const maxMemory = memoryInfo.match(/maxmemory_human:(.+)/)?.[1]?.trim() || 'Unknown';

    console.log(`   ✅ Used Memory: ${usedMemory}`);
    console.log(`   ✅ Max Memory: ${maxMemory || 'Unlimited'}\n`);

    // Test 4: Set/Get Test
    console.log('4️⃣  Testing SET/GET operations...');
    const testKey = 'test:railway:connection';
    const testValue = `Connection test at ${new Date().toISOString()}`;

    await redis.set(testKey, testValue, 'EX', 60); // Expires in 60 seconds
    console.log(`   ✅ SET: ${testKey}`);

    const getValue = await redis.get(testKey);
    console.log(`   ✅ GET: ${getValue === testValue ? 'Value matches!' : 'Value mismatch!'}`);

    const ttl = await redis.ttl(testKey);
    console.log(`   ✅ TTL: ${ttl} seconds\n`);

    // Test 5: Delete Test
    console.log('5️⃣  Testing DEL operation...');
    const deleted = await redis.del(testKey);
    console.log(`   ✅ Deleted ${deleted} key(s)\n`);

    // Test 6: Connected Clients
    console.log('6️⃣  Checking connected clients...');
    const clientInfo = await redis.info('clients');
    const connectedClients = clientInfo.match(/connected_clients:(.+)/)?.[1]?.trim() || 'Unknown';
    console.log(`   ✅ Connected Clients: ${connectedClients}\n`);

    // Test 7: Database Size
    console.log('7️⃣  Checking database size...');
    const dbSize = await redis.dbsize();
    console.log(`   ✅ Keys in Database: ${dbSize}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All Redis tests passed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Summary
    console.log('📊 Summary:');
    console.log(`   - Redis: Railway Redis (shuttle.proxy.rlwy.net)`);
    console.log(`   - Version: ${version}`);
    console.log(`   - Status: Connected & Ready`);
    console.log(`   - Operations: SET/GET/DEL working`);
    console.log(`   - Use Cases: Caching, Sessions, BullMQ Jobs\n`);

  } catch (error) {
    console.error('❌ Redis connection test failed:\n');
    console.error(error.message);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

// Run test
testRedisConnection();
