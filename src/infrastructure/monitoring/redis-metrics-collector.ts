import Redis from 'ioredis';
import { DiscordService } from '../messaging/discord-service';

export interface TradingMetrics {
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
  successfulTrades: number;
  totalPnl: number;
  dailyPnl: number;
  averageHoldingPeriod: number;
  volatility: number;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  pnl?: number;
  pnlPercentage?: number;
  entryTime: Date;
  exitTime?: Date;
  holdingPeriod?: number; // in hours
  aiConfidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'open' | 'closed' | 'cancelled';
  stopLoss?: number;
  takeProfit?: number;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  apiLatency: number;
  errorRate: number;
  queueSize: number;
  activeConnections: number;
}

export class RedisMetricsCollector {
  private redis: Redis;
  private discord: DiscordService;
  
  // Metric keys
  private readonly KEYS = {
    TRADES: 'metrics:trades',
    PERFORMANCE: 'metrics:performance',
    SYSTEM: 'metrics:system',
    ALERTS: 'metrics:alerts',
    DAILY_SUMMARY: 'metrics:daily:summary'
  };

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
    this.discord = new DiscordService();
  }

  // Track individual trade
  async trackTrade(trade: TradeRecord): Promise<void> {
    const pipeline = this.redis.pipeline();
    const timestamp = Date.now();
    const tradeKey = `trade:${trade.id}`;
    
    // Store trade details
    pipeline.hset(tradeKey, {
      id: trade.id,
      symbol: trade.symbol,
      side: trade.side,
      quantity: trade.quantity.toString(),
      entryPrice: trade.entryPrice.toString(),
      exitPrice: trade.exitPrice?.toString() || '',
      pnl: trade.pnl?.toString() || '',
      pnlPercentage: trade.pnlPercentage?.toString() || '',
      entryTime: trade.entryTime.toISOString(),
      exitTime: trade.exitTime?.toISOString() || '',
      holdingPeriod: trade.holdingPeriod?.toString() || '',
      aiConfidence: trade.aiConfidence.toString(),
      riskLevel: trade.riskLevel,
      status: trade.status,
      stopLoss: trade.stopLoss?.toString() || '',
      takeProfit: trade.takeProfit?.toString() || ''
    });
    
    // Set expiration for trades (30 days)
    pipeline.expire(tradeKey, 2592000);
    
    // Add to trades list
    pipeline.lpush(this.KEYS.TRADES, tradeKey);
    
    // Keep only last 1000 trades
    pipeline.ltrim(this.KEYS.TRADES, 0, 999);
    
    // Update performance metrics
    if (trade.status === 'closed' && trade.pnl !== undefined) {
      await this.updatePerformanceMetrics(trade);
    }
    
    await pipeline.exec();
    
    // Send Discord alert for significant trades
    if (Math.abs(trade.pnlPercentage || 0) > 0.05) { // > 5% P&L
      await this.discord.sendTradeAlert(trade);
    }
  }

  // Update performance metrics
  private async updatePerformanceMetrics(trade: TradeRecord): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    // Increment counters
    pipeline.hincrby(this.KEYS.PERFORMANCE, 'totalTrades', 1);
    
    if ((trade.pnl || 0) > 0) {
      pipeline.hincrby(this.KEYS.PERFORMANCE, 'successfulTrades', 1);
    }
    
    // Update P&L
    pipeline.hincrbyfloat(this.KEYS.PERFORMANCE, 'totalPnl', trade.pnl || 0);
    pipeline.hincrbyfloat(this.KEYS.PERFORMANCE, 'dailyPnl', trade.pnl || 0);
    
    // Update win rate
    const performance = await this.getPerformanceMetrics();
    const winRate = performance.totalTrades > 0 
      ? performance.successfulTrades / performance.totalTrades 
      : 0;
    
    pipeline.hset(this.KEYS.PERFORMANCE, 'winRate', winRate.toString());
    
    // Update average holding period
    if (trade.holdingPeriod) {
      const currentAvg = parseFloat(await this.redis.hget(this.KEYS.PERFORMANCE, 'averageHoldingPeriod') || '0');
      const newAvg = (currentAvg + trade.holdingPeriod) / 2;
      pipeline.hset(this.KEYS.PERFORMANCE, 'averageHoldingPeriod', newAvg.toString());
    }
    
    await pipeline.exec();
  }

  // Track system metrics
  async trackSystemMetrics(metrics: SystemMetrics): Promise<void> {
    const timestamp = Math.floor(Date.now() / 60000); // Minute precision
    const key = `${this.KEYS.SYSTEM}:${timestamp}`;
    
    await this.redis.hset(key, {
      cpuUsage: metrics.cpuUsage.toString(),
      memoryUsage: metrics.memoryUsage.toString(),
      apiLatency: metrics.apiLatency.toString(),
      errorRate: metrics.errorRate.toString(),
      queueSize: metrics.queueSize.toString(),
      activeConnections: metrics.activeConnections.toString(),
      timestamp: timestamp.toString()
    });
    
    // Keep system metrics for 24 hours
    await this.redis.expire(key, 86400);
    
    // Check for system alerts
    await this.checkSystemAlerts(metrics);
  }

  // Get performance metrics
  async getPerformanceMetrics(): Promise<TradingMetrics> {
    const data = await this.redis.hgetall(this.KEYS.PERFORMANCE);
    
    return {
      winRate: parseFloat(data.winRate || '0'),
      sharpeRatio: parseFloat(data.sharpeRatio || '0'),
      maxDrawdown: parseFloat(data.maxDrawdown || '0'),
      totalTrades: parseInt(data.totalTrades || '0'),
      successfulTrades: parseInt(data.successfulTrades || '0'),
      totalPnl: parseFloat(data.totalPnl || '0'),
      dailyPnl: parseFloat(data.dailyPnl || '0'),
      averageHoldingPeriod: parseFloat(data.averageHoldingPeriod || '0'),
      volatility: parseFloat(data.volatility || '0')
    };
  }

  // Get recent trades
  async getRecentTrades(limit: number = 50): Promise<TradeRecord[]> {
    const tradeKeys = await this.redis.lrange(this.KEYS.TRADES, 0, limit - 1);
    
    const pipeline = this.redis.pipeline();
    tradeKeys.forEach(key => pipeline.hgetall(key));
    
    const results = await pipeline.exec();
    return (results || []).map(([err, data]) => this.parseTradeRecord(data)).filter(Boolean);
  }

  // Generate daily report
  async generateDailyReport(): Promise<string> {
    const performance = await this.getPerformanceMetrics();
    const trades = await this.getRecentTrades(20);
    
    const dailyPnl = performance.dailyPnl;
    const winRate = performance.winRate * 100;
    
    // Reset daily P&L
    await this.redis.hset(this.KEYS.PERFORMANCE, 'dailyPnl', '0');
    
    // Store daily summary
    const summaryKey = `${this.KEYS.DAILY_SUMMARY}:${new Date().toISOString().split('T')[0]}`;
    await this.redis.hset(summaryKey, {
      date: new Date().toISOString(),
      dailyPnl: dailyPnl.toString(),
      winRate: winRate.toString(),
      totalTrades: performance.totalTrades.toString()
    });
    
    // Create report message
    const report = `
📊 DAILY TRADING REPORT
=======================
📅 Date: ${new Date().toDateString()}
💰 Daily P&L: $${dailyPnl.toFixed(2)}
📈 Win Rate: ${winRate.toFixed(1)}%
🎯 Total Trades: ${performance.totalTrades}
🏆 Successful Trades: ${performance.successfulTrades}
📉 Max Drawdown: ${(performance.maxDrawdown * 100).toFixed(1)}%
⏱️ Avg Holding Period: ${performance.averageHoldingPeriod.toFixed(1)}h
=======================
    `;
    
    // Send to Discord
    await this.discord.sendPerformanceUpdate(report);
    
    return report;
  }

  // Get system health
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: SystemMetrics;
    lastUpdated: Date;
  }> {
    const timestamp = Math.floor(Date.now() / 60000);
    const key = `${this.KEYS.SYSTEM}:${timestamp}`;
    
    const data = await this.redis.hgetall(key);
    
    if (!data.timestamp) {
      return {
        status: 'unhealthy',
        metrics: {
          cpuUsage: 0,
          memoryUsage: 0,
          apiLatency: 0,
          errorRate: 0,
          queueSize: 0,
          activeConnections: 0
        },
        lastUpdated: new Date()
      };
    }
    
    const metrics: SystemMetrics = {
      cpuUsage: parseFloat(data.cpuUsage || '0'),
      memoryUsage: parseFloat(data.memoryUsage || '0'),
      apiLatency: parseFloat(data.apiLatency || '0'),
      errorRate: parseFloat(data.errorRate || '0'),
      queueSize: parseInt(data.queueSize || '0'),
      activeConnections: parseInt(data.activeConnections || '0')
    };
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (metrics.cpuUsage > 80 || metrics.memoryUsage > 80) {
      status = 'degraded';
    }
    if (metrics.apiLatency > 1000 || metrics.errorRate > 0.1) {
      status = 'unhealthy';
    }
    
    return {
      status,
      metrics,
      lastUpdated: new Date(parseInt(data.timestamp) * 60000)
    };
  }

  // Alert system
  private async checkSystemAlerts(metrics: SystemMetrics): Promise<void> {
    const alerts: string[] = [];
    
    if (metrics.cpuUsage > 80) {
      alerts.push(`🚨 High CPU usage: ${metrics.cpuUsage.toFixed(1)}%`);
    }
    
    if (metrics.memoryUsage > 80) {
      alerts.push(`🚨 High memory usage: ${metrics.memoryUsage.toFixed(1)}%`);
    }
    
    if (metrics.apiLatency > 1000) {
      alerts.push(`🚨 High API latency: ${metrics.apiLatency.toFixed(0)}ms`);
    }
    
    if (metrics.errorRate > 0.1) {
      alerts.push(`🚨 High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
    }
    
    // Send alerts
    for (const alert of alerts) {
      await this.redis.lpush(this.KEYS.ALERTS, `${Date.now()}:${alert}`);
      await this.discord.sendAlert(alert);
    }
    
    // Keep only last 100 alerts
    await this.redis.ltrim(this.KEYS.ALERTS, 0, 99);
  }

  // Get recent alerts
  async getRecentAlerts(limit: number = 20): Promise<Array<{timestamp: Date; message: string}>> {
    const alerts = await this.redis.lrange(this.KEYS.ALERTS, 0, limit - 1);
    
    return alerts.map(alert => {
      const [timestamp, ...messageParts] = alert.split(':');
      return {
        timestamp: new Date(parseInt(timestamp)),
        message: messageParts.join(':')
      };
    });
  }

  // Calculate Sharpe ratio (simplified)
  private calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
    );
    
    if (stdDev === 0) return 0;
    
    return (avgReturn - riskFreeRate) / stdDev;
  }

  // Parse trade record from Redis data
  private parseTradeRecord(data: any): TradeRecord {
    return {
      id: data.id,
      symbol: data.symbol,
      side: data.side as 'buy' | 'sell',
      quantity: parseInt(data.quantity),
      entryPrice: parseFloat(data.entryPrice),
      exitPrice: data.exitPrice ? parseFloat(data.exitPrice) : undefined,
      pnl: data.pnl ? parseFloat(data.pnl) : undefined,
      pnlPercentage: data.pnlPercentage ? parseFloat(data.pnlPercentage) : undefined,
      entryTime: new Date(data.entryTime),
      exitTime: data.exitTime ? new Date(data.exitTime) : undefined,
      holdingPeriod: data.holdingPeriod ? parseFloat(data.holdingPeriod) : undefined,
      aiConfidence: parseFloat(data.aiConfidence),
      riskLevel: data.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH',
      status: data.status as 'open' | 'closed' | 'cancelled',
      stopLoss: data.stopLoss ? parseFloat(data.stopLoss) : undefined,
      takeProfit: data.takeProfit ? parseFloat(data.takeProfit) : undefined
    };
  }

  // Clean up old data
  async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    // Clean old system metrics (older than 7 days)
    const systemKeys = await this.redis.keys(`${this.KEYS.SYSTEM}:*`);
    for (const key of systemKeys) {
      const timestamp = parseInt(key.split(':').pop() || '0');
      if (timestamp * 60000 < cutoff) {
        await this.redis.del(key);
      }
    }
    
    // Clean old daily summaries (older than 90 days)
    const summaryKeys = await this.redis.keys(`${this.KEYS.DAILY_SUMMARY}:*`);
    for (const key of summaryKeys) {
      const dateStr = key.split(':').pop();
      if (dateStr) {
        const date = new Date(dateStr);
        if (date.getTime() < cutoff) {
          await this.redis.del(key);
        }
      }
    }
  }

  // Reset metrics (for testing)
  async resetMetrics(): Promise<void> {
    await this.redis.del(this.KEYS.PERFORMANCE);
    await this.redis.del(this.KEYS.TRADES);
    await this.redis.del(this.KEYS.ALERTS);
    console.log('📊 Metrics reset completed');
  }
}