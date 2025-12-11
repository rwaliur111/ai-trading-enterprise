import { createClient } from '@supabase/supabase-js'

// Types for our database
export interface Portfolio {
  id: string
  user_id: string
  name: string
  strategy: string | null
  risk_tolerance: 'LOW' | 'MEDIUM' | 'HIGH' | null
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface Position {
  id: string
  portfolio_id: string
  symbol: string
  quantity: number
  avg_entry_price: number
  current_price: number | null
  market_value: number
  cost_basis: number
  unrealized_pl: number
  unrealized_pl_percent: number
  created_at: string
  updated_at: string
}

export interface Trade {
  id: string
  portfolio_id: string
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  commission: number
  total_amount: number
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED'
  order_id: string | null
  alpaca_order_id: string | null
  signal_id: string | null
  strategy: string | null
  risk_percentage: number | null
  notes: string | null
  created_at: string
  filled_at: string | null
  cancelled_at: string | null
}

export interface AISignal {
  id: string
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  reason: string | null
  price: number | null
  target_price: number | null
  stop_loss: number | null
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | null
  indicators: any | null
  metadata: any | null
  generated_at: string
  expires_at: string | null
  executed: boolean
  executed_at: string | null
  execution_notes: string | null
}

export class SupabaseClient {
  private static instance: SupabaseClient
  private supabase: any

  private constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Use service role key for server-side operations
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  static getInstance(): SupabaseClient {
    if (!SupabaseClient.instance) {
      SupabaseClient.instance = new SupabaseClient()
    }
    return SupabaseClient.instance
  }

  // Portfolio operations
  async createPortfolio(userId: string, name: string, strategy?: string): Promise<Portfolio> {
    const { data, error } = await this.supabase
      .from('portfolios')
      .insert([{ user_id: userId, name, strategy }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getPortfolios(userId: string): Promise<Portfolio[]> {
    const { data, error } = await this.supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  // Position operations
  async addPosition(
    portfolioId: string, 
    symbol: string, 
    quantity: number, 
    avgEntryPrice: number,
    currentPrice?: number
  ): Promise<Position> {
    const { data, error } = await this.supabase
      .from('positions')
      .insert([{
        portfolio_id: portfolioId,
        symbol,
        quantity,
        avg_entry_price: avgEntryPrice,
        current_price: currentPrice || avgEntryPrice
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updatePositionPrice(symbol: string, currentPrice: number): Promise<void> {
    const { error } = await this.supabase
      .from('positions')
      .update({ current_price: currentPrice, updated_at: new Date().toISOString() })
      .eq('symbol', symbol)

    if (error) throw error
  }

  async getPortfolioPositions(portfolioId: string): Promise<Position[]> {
    const { data, error } = await this.supabase
      .from('positions')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  // Trade operations
  async saveTrade(trade: Omit<Trade, 'id' | 'created_at' | 'total_amount'>): Promise<Trade> {
    const { data, error } = await this.supabase
      .from('trades')
      .insert([trade])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getTradingHistory(
    portfolioId: string, 
    limit: number = 100,
    startDate?: Date,
    endDate?: Date
  ): Promise<Trade[]> {
    let query = this.supabase
      .from('trades')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString())
    }

    const { data, error } = await query

    if (error) throw error
    return data
  }

  // AI Signal operations
  async saveSignal(signal: Omit<AISignal, 'id' | 'generated_at'>): Promise<AISignal> {
    const { data, error } = await this.supabase
      .from('ai_signals')
      .insert([signal])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getRecentSignals(symbol?: string, limit: number = 50): Promise<AISignal[]> {
    let query = this.supabase
      .from('ai_signals')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(limit)

    if (symbol) {
      query = query.eq('symbol', symbol)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  }

  async markSignalExecuted(signalId: string, executionNotes?: string): Promise<void> {
    const { error } = await this.supabase
      .from('ai_signals')
      .update({
        executed: true,
        executed_at: new Date().toISOString(),
        execution_notes: executionNotes
      })
      .eq('id', signalId)

    if (error) throw error
  }

  // Market data cache operations
  async cacheMarketData(
    symbol: string, 
    dataType: 'QUOTE' | 'HISTORICAL' | 'NEWS' | 'OVERVIEW',
    data: any,
    ttlSeconds: number = 300
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000)

    const { error } = await this.supabase
      .from('market_data_cache')
      .upsert({
        symbol,
        data_type: dataType,
        data,
        updated_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'symbol,data_type'
      })

    if (error) throw error
  }

  async getCachedMarketData(
    symbol: string, 
    dataType: 'QUOTE' | 'HISTORICAL' | 'NEWS' | 'OVERVIEW'
  ): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('market_data_cache')
      .select('*')
      .eq('symbol', symbol)
      .eq('data_type', dataType)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) return null
    return data.data
  }

  // Performance metrics
  async savePortfolioSnapshot(
    portfolioId: string,
    totalValue: number,
    cashBalance: number,
    investedValue: number,
    dailyPL?: number,
    dailyPLPercent?: number,
    positionsCount?: number
  ): Promise<void> {
    const { error } = await this.supabase
      .from('portfolio_history')
      .insert([{
        portfolio_id: portfolioId,
        total_value: totalValue,
        cash_balance: cashBalance,
        invested_value: investedValue,
        daily_pl: dailyPL,
        daily_pl_percent: dailyPLPercent,
        positions_count: positionsCount
      }])

    if (error) throw error
  }

  async getPortfolioHistory(
    portfolioId: string,
    days: number = 30
  ): Promise<any[]> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const { data, error } = await this.supabase
      .from('portfolio_history')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .gte('recorded_at', cutoffDate.toISOString())
      .order('recorded_at', { ascending: true })

    if (error) throw error
    return data
  }

  // User settings
  async getUserSettings(userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      // Create default settings if not exists
      return this.createDefaultSettings(userId)
    }
    return data
  }

  async updateUserSettings(userId: string, settings: Partial<any>): Promise<void> {
    const { error } = await this.supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString()
      })

    if (error) throw error
  }

  private async createDefaultSettings(userId: string): Promise<any> {
    const defaultSettings = {
      user_id: userId,
      alpaca_paper: true,
      trading_preferences: {
        risk_tolerance: 'MEDIUM',
        max_position_size: 10000,
        stop_loss_percent: 2,
        take_profit_percent: 5
      },
      notifications_enabled: true
    }

    const { data, error } = await this.supabase
      .from('user_settings')
      .insert([defaultSettings])
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Batch operations
  async batchUpdatePositions(updates: Array<{symbol: string; currentPrice: number}>): Promise<void> {
    // Use a transaction for batch updates
    const updatesPromises = updates.map(update =>
      this.supabase
        .from('positions')
        .update({ 
          current_price: update.currentPrice,
          updated_at: new Date().toISOString()
        })
        .eq('symbol', update.symbol)
    )

    await Promise.all(updatesPromises)
  }

  // Cleanup expired cache
  async cleanupExpiredCache(): Promise<void> {
    const { error } = await this.supabase
      .from('market_data_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (error) throw error
  }
}

// Client-side Supabase instance (for browser)
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  })
}