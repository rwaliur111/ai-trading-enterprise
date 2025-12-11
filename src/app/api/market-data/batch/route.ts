import { NextRequest, NextResponse } from 'next/server';
import { RedisCache } from '@/infrastructure/cache/redis-cache';
import { MarketDataWorker } from '@/application/workers/market-data-worker';

const cache = new RedisCache();
const worker = new MarketDataWorker();

export async function POST(request: NextRequest) {
  try {
    const { symbols, refresh = false } = await request.json();
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Symbols array required' },
        { status: 400 }
      );
    }
    
    // Limit batch size for performance
    const limitedSymbols = symbols.slice(0, 100);
    
    if (!refresh) {
      // Try to get from cache first
      const cacheKeys = limitedSymbols.map(s => `market:${s}`);
      const cachedData = await cache.getBatch(cacheKeys);
      
      const cachedSymbols = Object.keys(cachedData);
      const missingSymbols = limitedSymbols.filter(s => !cachedSymbols.includes(s));
      
      if (missingSymbols.length === 0) {
        // All data in cache
        return NextResponse.json({
          data: cachedData,
          source: 'cache',
          cached: true,
          timestamp: new Date().toISOString()
        });
      }
      
      // Queue missing symbols for update
      await worker.addJob(missingSymbols, 'high');
    } else {
      // Force refresh
      await worker.addJob(limitedSymbols, 'high');
    }
    
    // Get whatever data we have (might be stale)
    const cacheKeys = limitedSymbols.map(s => `market:${s}`);
    const cachedData = await cache.getBatch(cacheKeys);
    
    return NextResponse.json({
      data: cachedData,
      source: 'cache',
      cached: true,
      refreshing: refresh,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Batch market data error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
