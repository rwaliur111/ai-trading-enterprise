import { WebSocketServer } from 'ws';
import { RedisCache } from '@/infrastructure/cache/redis-cache';
import { MarketDataOrchestrator } from '@/application/services/market-data-orchestrator';

export class TradingWebSocketServer {
  private wss: WebSocketServer;
  private cache: RedisCache;
  private orchestrator: MarketDataOrchestrator;
  private connections: Map<string, any> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // symbol -> connectionIds

  constructor(port: number = 8080) {
    this.wss = new WebSocketServer({ port });
    this.cache = new RedisCache();
    this.orchestrator = new MarketDataOrchestrator();
    
    this.setupWebSocket();
    this.startMarketDataStream();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const connectionId = this.generateId();
      this.connections.set(connectionId, ws);
      
      console.log(`New WebSocket connection: ${connectionId}`);
      
      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message);
          await this.handleMessage(connectionId, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });
      
      ws.on('close', () => {
        this.handleDisconnection(connectionId);
      });
      
      // Send initial connection info
      ws.send(JSON.stringify({
        type: 'connected',
        connectionId,
        timestamp: new Date().toISOString()
      }));
    });
  }

  private async handleMessage(connectionId: string, data: any) {
    switch (data.type) {
      case 'subscribe':
        await this.handleSubscribe(connectionId, data.symbols);
        break;
      case 'unsubscribe':
        await this.handleUnsubscribe(connectionId, data.symbols);
        break;
      case 'trade':
        await this.handleTrade(connectionId, data);
        break;
      case 'ping':
        this.sendToConnection(connectionId, { type: 'pong' });
        break;
    }
  }

  private async handleSubscribe(connectionId: string, symbols: string[]) {
    if (!Array.isArray(symbols)) return;
    
    symbols.forEach(symbol => {
      if (!this.subscriptions.has(symbol)) {
        this.subscriptions.set(symbol, new Set());
      }
      this.subscriptions.get(symbol)!.add(connectionId);
    });
    
    // Send current data for subscribed symbols
    const cacheKeys = symbols.map(s => `market:${s}`);
    const cachedData = await this.cache.getBatch(cacheKeys);
    
    this.sendToConnection(connectionId, {
      type: 'subscription_ack',
      symbols,
      data: cachedData
    });
  }

  private handleUnsubscribe(connectionId: string, symbols: string[]) {
    symbols.forEach(symbol => {
      const subscribers = this.subscriptions.get(symbol);
      if (subscribers) {
        subscribers.delete(connectionId);
        if (subscribers.size === 0) {
          this.subscriptions.delete(symbol);
        }
      }
    });
  }

  private async handleTrade(connectionId: string, data: any) {
    // Process trade request
    // This would connect to your trading API
    console.log(`Trade request from ${connectionId}:`, data);
    
    // Broadcast to all connections subscribed to this symbol
    this.broadcastToSymbol(data.symbol, {
      type: 'trade_executed',
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  private startMarketDataStream() {
    // Stream updates for actively traded symbols
    const activeSymbols = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'SPY', 'QQQ'];
    
    setInterval(async () => {
      const data = await this.orchestrator.getRealTimeData(activeSymbols);
      
      // Broadcast updates to subscribed connections
      Object.entries(data).forEach(([symbol, symbolData]) => {
        this.broadcastToSymbol(symbol, {
          type: 'market_update',
          symbol,
          data: symbolData,
          timestamp: new Date().toISOString()
        });
      });
    }, 10000); // Every 10 seconds
  }

  private broadcastToSymbol(symbol: string, message: any) {
    const subscribers = this.subscriptions.get(symbol);
    if (subscribers) {
      subscribers.forEach(connectionId => {
        this.sendToConnection(connectionId, message);
      });
    }
  }

  private sendToConnection(connectionId: string, message: any) {
    const ws = this.connections.get(connectionId);
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private handleDisconnection(connectionId: string) {
    // Remove from all subscriptions
    this.subscriptions.forEach((subscribers, symbol) => {
      subscribers.delete(connectionId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(symbol);
      }
    });
    
    this.connections.delete(connectionId);
    console.log(`Connection closed: ${connectionId}`);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
