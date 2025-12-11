// src/infrastructure/monitoring/redis-metrics-collector.ts
export class RedisMetricsCollector {
  async trackTradingPerformance(metrics: TradingMetrics): Promise<void> {
    await this.redisClient.hset(
      `metrics:${Date.now()}`,
      'win_rate', metrics.winRate,
      'sharpe_ratio', metrics.sharpeRatio,
      'max_drawdown', metrics.maxDrawdown
    );
    
    // Send to Discord webhook
    await this.discordService.sendPerformanceUpdate(metrics);
  }
}