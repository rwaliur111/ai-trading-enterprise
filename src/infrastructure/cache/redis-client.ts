import Redis from 'ioredis';

export class RedisClient {
  private static instance: Redis;

  static getInstance(): Redis {
    if (!RedisClient.instance) {
      if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
        console.warn('Redis configuration missing, using mock client');
        // Return a mock Redis client for development
        return this.getMockClient();
      }

      RedisClient.instance = new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        username: process.env.REDIS_USERNAME || 'default',
        retryStrategy: (times) => Math.min(times * 50, 2000),
        maxRetriesPerRequest: 3,
      });

      RedisClient.instance.on('connect', () => {
        console.log('Redis connected successfully');
      });

      RedisClient.instance.on('error', (err) => {
        console.error('Redis connection error:', err);
      });
    }

    return RedisClient.instance;
  }

  private static getMockClient(): any {
    const mockData = new Map();
    return {
      get: async (key: string) => mockData.get(key),
      set: async (key: string, value: string) => mockData.set(key, value),
      setex: async (key: string, seconds: number, value: string) => {
        mockData.set(key, value);
        return 'OK';
      },
      quit: async () => {},
    } as any;
  }

  static async isReady(): Promise<boolean> {
    try {
      const client = RedisClient.getInstance();
      await client.ping();
      return true;
    } catch {
      return false;
    }
  }
}