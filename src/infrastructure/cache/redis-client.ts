import Redis from 'ioredis'

export class RedisClient {
  private static instance: Redis
  private static isConnected = false

  private constructor() {}

  static getInstance(): Redis {
    if (!RedisClient.instance) {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
      
      RedisClient.instance = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000)
          return delay
        },
        maxRetriesPerRequest: 3
      })

      RedisClient.instance.on('connect', () => {
        console.log('Redis connected successfully')
        RedisClient.isConnected = true
      })

      RedisClient.instance.on('error', (error) => {
        console.error('Redis connection error:', error)
        RedisClient.isConnected = false
      })
    }

    return RedisClient.instance
  }

  static async isReady(): Promise<boolean> {
    if (!RedisClient.isConnected) {
      try {
        await RedisClient.getInstance().ping()
        RedisClient.isConnected = true
      } catch (error) {
        RedisClient.isConnected = false
      }
    }
    return RedisClient.isConnected
  }

  static async get(key: string): Promise<string | null> {
    if (!await this.isReady()) return null
    
    try {
      return await RedisClient.getInstance().get(key)
    } catch (error) {
      console.error('Redis get error:', error)
      return null
    }
  }

  static async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!await this.isReady()) return
    
    try {
      if (ttl) {
        await RedisClient.getInstance().setex(key, ttl, value)
      } else {
        await RedisClient.getInstance().set(key, value)
      }
    } catch (error) {
      console.error('Redis set error:', error)
    }
  }

  static async del(key: string): Promise<void> {
    if (!await this.isReady()) return
    
    try {
      await RedisClient.getInstance().del(key)
    } catch (error) {
      console.error('Redis delete error:', error)
    }
  }

  static async disconnect(): Promise<void> {
    if (RedisClient.instance) {
      await RedisClient.instance.quit()
      RedisClient.isConnected = false
    }
  }
}
