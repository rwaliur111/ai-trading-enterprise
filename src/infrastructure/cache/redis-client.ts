// Create src/infrastructure/cache/redis-client.ts
@'
import Redis from 'ioredis'

class RedisClient {
  private static instance: Redis
  private static isConnected = false

  static getInstance(): Redis {
    if (!RedisClient.instance) {
      const redisUrl = process.env.REDIS_URL
      
      if (!redisUrl) {
        throw new Error('REDIS_URL environment variable is not set')
      }

      RedisClient.instance = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000)
          return delay
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
      })

      RedisClient.instance.on('connect', () => {
        console.log('Redis connected successfully')
        RedisClient.isConnected = true
      })

      RedisClient.instance.on('error', (error) => {
        console.error('Redis connection error:', error)
        RedisClient.isConnected = false
      })

      RedisClient.instance.on('close', () => {
        console.log('Redis connection closed')
        RedisClient.isConnected = false
      })
    }

    return RedisClient.instance
  }

  static async isReady(): Promise<boolean> {
    try {
      await RedisClient.getInstance().ping()
      return true
    } catch {
      return false
    }
  }

  static async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const redis = RedisClient.getInstance()
    const serialized = JSON.stringify(value)
    
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, serialized)
    } else {
      await redis.set(key, serialized)
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    try {
      const redis = RedisClient.getInstance()
      const value = await redis.get(key)
      
      if (!value) return null
      
      return JSON.parse(value) as T
    } catch (error) {
      console.error('Redis get error:', error)
      return null
    }
  }

  static async del(key: string): Promise<void> {
    const redis = RedisClient.getInstance()
    await redis.del(key)
  }

  static async flushAll(): Promise<void> {
    const redis = RedisClient.getInstance()
    await redis.flushall()
  }
}

export default RedisClient
'@ | Set-Content -Path ".\src\infrastructure\cache\redis-client.ts" -Encoding UTF8