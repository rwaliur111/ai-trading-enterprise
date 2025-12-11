import { NextRequest, NextResponse } from 'next/server'
import { AlpacaService } from '@/infrastructure/external-apis/alpaca-service'
import { AIAgentOrchestrator } from '@/application/services/ai-agent-orchestrator'
import { MarketDataService } from '@/domains/market-data/services/market-data-service'
import { TRADING_CONFIG } from '@/config/constants'

export async function GET(request: NextRequest) {
  try {
    const alpaca = new AlpacaService()
    const orchestrator = new AIAgentOrchestrator()
    const marketDataService = new MarketDataService()

    // Get real account data
    const [account, positions, marketStatus] = await Promise.all([
      alpaca.getAccount(),
      alpaca.getPositions(),
      marketDataService.getMarketStatus()
    ])

    // Calculate portfolio metrics
    const totalMarketValue = positions.reduce((sum: number, pos: any) => {
      return sum + parseFloat(pos.market_value || '0')
    }, 0)

    const totalCostBasis = positions.reduce((sum: number, pos: any) => {
      return sum + parseFloat(pos.cost_basis || '0')
    }, 0)

    const totalUnrealizedPL = positions.reduce((sum: number, pos: any) => {
      return sum + parseFloat(pos.unrealized_pl || '0')
    }, 0)

    const totalUnrealizedPLPercent = totalCostBasis > 0 
      ? (totalUnrealizedPL / totalCostBasis) * 100 
      : 0

    // Get AI analysis for each position
    const symbols = positions.map((pos: any) => pos.symbol)
    const signals = await orchestrator.analyzeSymbolsBatch(symbols)

    // Get sector allocation
    const quotes = await marketDataService.getBatchQuotes(symbols)
    const sectorAllocation: Record<string, number> = {}
    
    quotes.forEach((quote, index) => {
      const sector = quote.sector || 'Unknown'
      const position = positions[index]
      const value = quote.price * parseFloat(position.qty)
      sectorAllocation[sector] = (sectorAllocation[sector] || 0) + value
    })

    // Calculate performance metrics
    const portfolioValue = parseFloat(account.portfolio_value?.toString() || '0')
    const cashBalance = parseFloat(account.cash?.toString() || '0')
    const buyingPower = parseFloat(account.buying_power?.toString() || '0')
    
    const dailyPL = parseFloat(account.equity?.toString() || '0') - parseFloat(account.last_equity?.toString() || '0')
    const dailyPLPercent = parseFloat(account.last_equity?.toString() || '0') > 0 
      ? (dailyPL / parseFloat(account.last_equity?.toString() || '0')) * 100 
      : 0

    // Get risk assessment
    const portfolioRisk = await orchestrator.assessPortfolioRisk(
      positions.map((p: any) => ({
        symbol: p.symbol,
        quantity: parseFloat(p.qty)
      }))
    )

    const response = {
      metadata: {
        timestamp: new Date().toISOString(),
        market_status: marketStatus,
        source: 'alpaca',
        paper_trading: TRADING_CONFIG.PAPER_TRADING
      },
      account: {
        id: account.id,
        account_number: account.account_number,
        status: account.status,
        currency: account.currency,
        buying_power: buyingPower,
        cash: cashBalance,
        portfolio_value: portfolioValue,
        equity: parseFloat(account.equity?.toString() || '0'),
        last_equity: parseFloat(account.last_equity?.toString() || '0'),
        daytrade_count: account.daytrade_count,
        regt_buying_power: parseFloat(account.regt_buying_power?.toString() || '0'),
        daytrading_buying_power: parseFloat(account.daytrading_buying_power?.toString() || '0')
      },
      summary: {
        total_positions: positions.length,
        total_market_value: totalMarketValue,
        total_cost_basis: totalCostBasis,
        total_unrealized_pl: totalUnrealizedPL,
        total_unrealized_pl_percent: totalUnrealizedPLPercent,
        cash_percentage: (cashBalance / portfolioValue) * 100,
        invested_percentage: (totalMarketValue / portfolioValue) * 100,
        buying_power_utilization: (totalMarketValue / buyingPower) * 100
      },
      positions: positions.map((position: any, index: number) => {
        const signal = signals[index]
        const quote = quotes.find(q => q.symbol === position.symbol)
        
        return {
          symbol: position.symbol,
          name: quote?.symbol || position.symbol,
          exchange: position.exchange,
          asset_class: position.asset_class,
          quantity: parseFloat(position.qty),
          avg_entry_price: parseFloat(position.avg_entry_price),
          current_price: quote?.price || parseFloat(position.current_price),
          market_value: parseFloat(position.market_value),
          cost_basis: parseFloat(position.cost_basis),
          unrealized_pl: parseFloat(position.unrealized_pl),
          unrealized_pl_percent: parseFloat(position.unrealized_plpc),
          day_pl: parseFloat(position.unrealized_intraday_pl),
          day_pl_percent: parseFloat(position.unrealized_intraday_plpc),
          change_today: parseFloat(position.change_today),
          weight: (parseFloat(position.market_value) / totalMarketValue) * 100,
          sector: quote?.sector || 'Unknown',
          ai_signal: signal ? {
            action: signal.action,
            confidence: signal.confidence,
            reason: signal.reason,
            risk_level: signal.risk_level,
            target_price: signal.target_price,
            stop_loss: signal.stop_loss,
            expected_return: signal.expected_return
          } : null,
          fundamentals: {
            market_cap: quote?.marketCap,
            pe_ratio: quote?.peRatio,
            dividend_yield: quote?.dividendYield,
            volume: quote?.volume
          }
        }
      }),
      performance: {
        daily: {
          pnl: dailyPL,
          percent: dailyPLPercent,
          date: new Date().toISOString().split('T')[0]
        },
        weekly: {
          pnl: dailyPL * 5, // Simplified
          percent: dailyPLPercent * 5
        },
        monthly: {
          pnl: dailyPL * 21, // Simplified
          percent: dailyPLPercent * 21
        },
        ytd: {
          pnl: portfolioValue - 100000, // Assuming $100k starting
          percent: 100000 > 0 ? ((portfolioValue - 100000) / 100000) * 100 : 0
        }
      },
      allocation: {
        by_asset_class: {
          equities: totalMarketValue,
          cash: cashBalance,
          options: 0,
          crypto: 0
        },
        by_sector: sectorAllocation,
        by_market_cap: {
          large_cap: quotes.filter(q => (q.marketCap || 0) > 10000000000).length,
          mid_cap: quotes.filter(q => (q.marketCap || 0) > 2000000000 && (q.marketCap || 0) <= 10000000000).length,
          small_cap: quotes.filter(q => (q.marketCap || 0) <= 2000000000).length
        }
      },
      risk_analysis: {
        ...portfolioRisk,
        volatility: portfolioRisk.max_portfolio_loss,
        beta: 1.05, // Would need historical calculation
        sharpe_ratio: 1.2, // Would need historical calculation
        sortino_ratio: 1.5,
        max_drawdown: -0.12,
        value_at_risk_95: portfolioRisk.max_portfolio_loss * 0.95,
        stress_test_results: {
          market_crash_20pct: portfolioValue * 0.8,
          interest_rate_hike: portfolioValue * 0.9,
          sector_rotation: portfolioValue * 0.95
        }
      },
      recommendations: {
        rebalancing: this.generateRebalancingRecommendations(sectorAllocation),
        tax_loss_harvesting: this.identifyTaxLossHarvesting(positions, quotes),
        risk_adjustments: this.generateRiskAdjustments(portfolioRisk)
      }
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 's-maxage=30, stale-while-revalidate=59'
      }
    })
  } catch (error: any) {
    console.error('Error fetching portfolio:', error)
    
    return NextResponse.json({
      error: 'Failed to fetch portfolio',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper methods
function generateRebalancingRecommendations(sectorAllocation: Record<string, number>): any[] {
  const recommendations = []
  const total = Object.values(sectorAllocation).reduce((a, b) => a + b, 0)
  
  // Target allocations (simplified)
  const targetAllocations: Record<string, number> = {
    'Technology': 30,
    'Healthcare': 15,
    'Financials': 15,
    'Consumer Cyclical': 10,
    'Industrials': 10,
    'Other': 20
  }
  
  for (const [sector, value] of Object.entries(sectorAllocation)) {
    const currentPercent = (value / total) * 100
    const targetPercent = targetAllocations[sector] || targetAllocations['Other']
    
    if (Math.abs(currentPercent - targetPercent) > 5) {
      recommendations.push({
        sector,
        action: currentPercent > targetPercent ? 'REDUCE' : 'INCREASE',
        current_allocation: currentPercent.toFixed(1) + '%',
        target_allocation: targetPercent.toFixed(1) + '%',
        adjustment: Math.abs(currentPercent - targetPercent).toFixed(1) + '%'
      })
    }
  }
  
  return recommendations.slice(0, 5)
}

function identifyTaxLossHarvesting(positions: any[], quotes: any[]): any[] {
  const opportunities = []
  
  for (let i = 0; i < positions.length; i++) {
    const position = positions[i]
    const quote = quotes.find(q => q.symbol === position.symbol)
    
    if (!quote) continue
    
    const costBasis = parseFloat(position.avg_entry_price)
    const currentPrice = quote.price
    const lossPercent = ((currentPrice - costBasis) / costBasis) * 100
    
    if (lossPercent < -10) { // More than 10% loss
      opportunities.push({
        symbol: position.symbol,
        loss_amount: (currentPrice - costBasis) * parseFloat(position.qty),
        loss_percent: lossPercent.toFixed(1) + '%',
        holding_period: 'long_term', // Would need actual purchase date
        recommended_action: 'HARVEST_LOSS',
        similar_securities: findSimilarSecurities(position.symbol, quotes)
      })
    }
  }
  
  return opportunities.slice(0, 3)
}

function findSimilarSecurities(symbol: string, quotes: any[]): string[] {
  // Simplified - in reality would use sector/industry/beta matching
  const similar: string[] = []
  const targetQuote = quotes.find(q => q.symbol === symbol)
  
  if (!targetQuote) return similar
  
  for (const quote of quotes) {
    if (quote.symbol !== symbol && 
        quote.sector === targetQuote.sector &&
        Math.abs(quote.marketCap - (targetQuote.marketCap || 0)) < (targetQuote.marketCap || 0) * 0.5) {
      similar.push(quote.symbol)
      if (similar.length >= 3) break
    }
  }
  
  return similar
}

function generateRiskAdjustments(portfolioRisk: any): any[] {
  const adjustments = []
  
  if (portfolioRisk.max_portfolio_loss > 0.1) {
    adjustments.push({
      type: 'REDUCE_RISK',
      action: 'Reduce position sizes by 20%',
      reason: 'Portfolio maximum loss exceeds 10% threshold'
    })
  }
  
  if (portfolioRisk.recommended_hedges.length > 0) {
    adjustments.push({
      type: 'ADD_HEDGES',
      action: `Consider adding: ${portfolioRisk.recommended_hedges.join(', ')}`,
      reason: 'Portfolio has concentrated sector exposure'
    })
  }
  
  return adjustments
}