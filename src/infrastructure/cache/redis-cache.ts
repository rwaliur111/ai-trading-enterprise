export class RedisCache {
  async getBatch(keys: string[]): Promise<Record<string, any>> {
    return {};
  }
  async setBatch(items: any[]): Promise<void> {}
}
