// src/infrastructure/security/rate-limiter.ts
export class TradingRateLimiter {
  private limits = new Map<string, RateLimit>();
  
  async checkLimit(apiKey: string, endpoint: string): Promise<boolean> {
    const key = `${apiKey}:${endpoint}`;
    const window = Math.floor(Date.now() / this.windowMs);
    const current = await this.redisClient.get(key);
    
    if (!current || parseInt(current) < this.maxRequests) {
      await this.redisClient.incr(key);
      await this.redisClient.expire(key, this.windowMs / 1000);
      return true;
    }
    
    return false;
  }
}