export interface CacheOptions {
  ttl?: number;
}

export class CacheManager {
  private cache = new Map<string, { data: any; expiry: number }>();

  set(key: string, value: any, options: CacheOptions = {}): void {
    const expiry = options.ttl ? Date.now() + options.ttl * 1000 : Infinity;
    this.cache.set(key, { data: value, expiry });
  }

  get<T = any>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (item.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return item.data as T;
  }

  delete(key: string): void { this.cache.delete(key); }
  clear(): void { this.cache.clear(); }
  
  has(key: string): boolean {
    const item = this.cache.get(key);
    return item ? item.expiry >= Date.now() : false;
  }
}
