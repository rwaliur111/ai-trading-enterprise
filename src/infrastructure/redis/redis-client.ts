import Redis from 'ioredis';

export class RedisClient {
  private static instance: Redis;
  private static isConnected: boolean = false;

  private constructor() {}

  static getInstance(): Redis {
    if (!RedisClient.instance) {
      if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
        throw new Error('Redis configuration is missing');
      }

      RedisClient.instance = new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        username: process.env.REDIS_USERNAME || 'default',
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      RedisClient.instance.on('connect', () => {
        console.log('Redis connected successfully');
        RedisClient.isConnected = true;
      });

      RedisClient.instance.on('error', (err) => {
        console.error('Redis connection error:', err);
        RedisClient.isConnected = false;
      });
    }

    return RedisClient.instance;
  }

  static async isReady(): Promise<boolean> {
    try {
      if (!RedisClient.instance) {
        return false;
      }
      await RedisClient.instance.ping();
      return true;
    } catch {
      return false;
    }
  }

  static async disconnect(): Promise<void> {
    if (RedisClient.instance) {
      await RedisClient.instance.quit();
      RedisClient.isConnected = false;
    }
  }
}