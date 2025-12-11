import { TradeSignal, Position, Order } from '../entities/trade';
import { Portfolio } from '../entities/portfolio';
import { supabase } from '@/infrastructure/database/supabase-client';

export class TradingRepository {
  async saveSignal(signal: TradeSignal): Promise<void> {
    const { error } = await supabase
      .from('trading_signals')
      .insert({
        symbol: signal.symbol,
        action: signal.action,
        type: signal.type,
        price: signal.price,
        quantity: signal.quantity,
        confidence: signal.confidence,
        reasoning: signal.reasoning,
        source: signal.source
      });

    if (error) {
      throw new Error(`Failed to save signal: ${error.message}`);
    }
  }

  async getRecentSignals(symbol?: string, limit: number = 50): Promise<TradeSignal[]> {
    let query = supabase
      .from('trading_signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (symbol) {
      query = query.eq('symbol', symbol);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch signals: ${error.message}`);
    }

    return (data || []).map(row => ({
      id: row.id,
      symbol: row.symbol,
      action: row.action as 'BUY' | 'SELL' | 'HOLD',
      type: row.type as 'MARKET' | 'LIMIT' | 'STOP',
      price: parseFloat(row.price),
      quantity: row.quantity,
      confidence: parseFloat(row.confidence),
      timestamp: new Date(row.created_at),
      source: row.source,
      reasoning: row.reasoning
    }));
  }

  async getPositions(): Promise<Position[]> {
    const { data, error } = await supabase
      .from('positions')
      .select('*');

    if (error) {
      throw new Error(`Failed to fetch positions: ${error.message}`);
    }

    return (data || []).map(row => ({
      id: row.id,
      symbol: row.symbol,
      quantity: row.quantity,
      averagePrice: parseFloat(row.average_price),
      currentPrice: parseFloat(row.current_price),
      unrealizedPL: parseFloat(row.unrealized_pl),
      realizedPL: parseFloat(row.realized_pl),
      openedAt: new Date(row.opened_at),
      lastUpdated: new Date(row.last_updated)
    }));
  }

  async savePosition(position: Position): Promise<void> {
    const { error } = await supabase
      .from('positions')
      .upsert({
        id: position.id,
        symbol: position.symbol,
        quantity: position.quantity,
        average_price: position.averagePrice,
        current_price: position.currentPrice,
        unrealized_pl: position.unrealizedPL,
        realized_pl: position.realizedPL,
        last_updated: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to save position: ${error.message}`);
    }
  }
}
