require('dotenv').config({ path: '.env.local' });
const Redis = require('ioredis');

async function testRedis() {
  console.log('Testing Redis connection...');
  
  const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USERNAME,
  });

  try {
    await redis.set('test', 'Hello Redis');
    const value = await redis.get('test');
    console.log(`✅ Redis connected! Test value: ${value}`);
    
    // Test if it's Redis Cloud
    const info = await redis.info();
    if (info.includes('redis_version')) {
      console.log('✅ Redis Cloud connection successful');
    }
    
    await redis.del('test');
    redis.disconnect();
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
  }
}

testRedis();