import { NextRequest, NextResponse } from 'next/server'
import { MarketDataService } from '@/domains/market-data/services/market-data-service'
import { SYMBOLS } from '@/config/constants'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const symbols = searchParams.get('symbols')
    const timeframe = searchParams.get('timeframe') || 'day'
    const limit = parseInt(searchParams.get('limit') || '100')
    const includeNews = searchParams.get('includeNews') === 'true'
    const includeHistorical = searchParams.get('includeHistorical') === 'true'
    const scan = searchParams.get('scan')

    const marketDataService = new MarketDataService()

    // Single symbol request
    if (symbol) {
      const [quote, historicalData, news] = await Promise.all([
        marketDataService.getRealTimeQuote(symbol),
        includeHistorical ? marketDataService.getHistoricalData(symbol, timeframe as any, limit) : Promise.resolve(null),
        includeNews ? marketDataService.getMarketNews(5).then(news => 
          news.filter(n => n.symbols.includes(symbol))
        ) : Promise.resolve([])
      ])

      const response: any = {
        symbol,
        quote,
        timestamp: new Date().toISOString(),
        source: 'alpaca/polygon'
      }

      if (historicalData) {
        response.historical = {
          data: historicalData,
          timeframe,
          count: historicalData.length,
          period: `${limit} ${timeframe}`
        }
      }

      if (news.length > 0) {
        response.news = news
      }

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 's-maxage=10, stale-while-revalidate=29'
        }
      })
    }

    // Multiple symbols request
    if (symbols) {
      const symbolList = symbols.split(',').map(s => s.trim()).filter(s => s.length > 0)
      
      if (symbolList.length === 0) {
        return NextResponse.json(
          { error: 'No valid symbols provided' },
          { status: 400 }
        )
      }

      // Limit to 100 symbols for performance
      const limitedSymbols = symbolList.slice(0, 100)
      const quotes = await marketDataService.getBatchQuotes(limitedSymbols)

      // Calculate aggregate metrics
      const totalVolume = quotes.reduce((sum, q) => sum + q.volume, 0)
      const avgChangePercent = quotes.reduce((sum, q) => sum + q.changePercent, 0) / quotes.length
      const advancers = quotes.filter(q => q.changePercent > 0).length
      const decliners = quotes.filter(q => q.changePercent < 0).length
      const unchanged = quotes.filter(q => q.changePercent === 0).length

      // Calculate sector performance
      const sectors: Record<string, { count: number; avgChange: number; totalVolume: number }> = {}
      quotes.forEach(quote => {
        const sector = quote.sector || 'Unknown'
        if (!sectors[sector]) {
          sectors[sector] = { count: 0, avgChange: 0, totalVolume: 0 }
        }
        sectors[sector].count++
        sectors[sector].avgChange += quote.changePercent
        sectors[sector].totalVolume += quote.volume
      })

      // Calculate averages
      Object.keys(sectors).forEach(sector => {
        sectors[sector].avgChange /= sectors[sector].count
      })

      const response = {
        quotes,
        metadata: {
          count: quotes.length,
          symbols_requested: symbolList.length,
          symbols_returned: quotes.length,
          timestamp: new Date().toISOString()
        },
        aggregate: {
          total_volume: totalVolume,
          average_change_percent: avgChangePercent,
          advancers,
          decliners,
          unchanged,
          advance_decline_ratio: advancers / Math.max(decliners, 1),
          market_breadth: (advancers - decliners) / quotes.length
        },
        sector_performance: sectors,
        top_gainers: quotes
          .filter(q => q.changePercent > 0)
          .sort((a, b) => b.changePercent - a.changePercent)
          .slice(0, 10),
        top_losers: quotes
          .filter(q => q.changePercent < 0)
          .sort((a, b) => a.changePercent - b.changePercent)
          .slice(0, 10),
        most_active: quotes
          .sort((a, b) => b.volume - a.volume)
          .slice(0, 10)
      }

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 's-maxage=30, stale-while-revalidate=59'
        }
      })
    }

    // Market scan request
    if (scan) {
      const criteria: any = {}
      
      if (scan === 'momentum') {
        criteria.minChangePercent = 1
        criteria.minVolume = 1000000
      } else if (scan === 'value') {
        criteria.maxPrice = 50
        criteria.minVolume = 500000
      } else if (scan === 'growth') {
        criteria.minVolume = 2000000
      }

      const opportunities = await marketDataService.scanForOpportunities(criteria)
      
      return NextResponse.json({
        scan_type: scan,
        opportunities,
        count: opportunities.length,
        timestamp: new Date().toISOString()
      })
    }

    // Default: Market overview
    const [marketOverview, sectorPerformance, topNews, watchlistQuotes] = await Promise.all([
      marketDataService.getMarketOverview(),
      marketDataService.getSectorPerformance(),
      marketDataService.getMarketNews(10),
      marketDataService.getBatchQuotes(SYMBOLS.WATCHLIST.slice(0, 20))
    ])

    const response = {
      market_overview: marketOverview,
      sector_performance: sectorPerformance,
      watchlist: {
        symbols: SYMBOLS.WATCHLIST.slice(0, 20),
        quotes: watchlistQuotes,
        performance: watchlistQuotes.reduce((sum, q) => sum + q.changePercent, 0) / watchlistQuotes.length
      },
      indices: {
        sp500: await marketDataService.getRealTimeQuote('SPY'),
        nasdaq: await marketDataService.getRealTimeQuote('QQQ'),
        dow_jones: await marketDataService.getRealTimeQuote('DIA'),
        russell_2000: await marketDataService.getRealTimeQuote('IWM')
      },
      news: topNews,
      market_metrics: {
        fear_greed_index: marketOverview.fearGreedIndex,
        put_call_ratio: 0.85, // Would fetch from options data
        vix: 18.5, // Would fetch from VIX
        treasury_yield_10yr: 4.25
      },
      timestamp: new Date().toISOString(),
      source: 'multi-source'
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=119'
      }
    })

  } catch (error: any) {
    console.error('Error in market data API:', error)
    
    return NextResponse.json({
      error: 'Failed to fetch market data',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Additional endpoints for specific market data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, symbols, criteria } = body

    const marketDataService = new MarketDataService()

    switch (action) {
      case 'subscribe':
        // WebSocket subscription logic would go here
        return NextResponse.json({
          success: true,
          message: 'Subscription request received',
          symbols,
          timestamp: new Date().toISOString()
        })

      case 'scan':
        const opportunities = await marketDataService.scanForOpportunities(criteria)
        return NextResponse.json({
          success: true,
          opportunities,
          count: opportunities.length,
          timestamp: new Date().toISOString()
        })

      case 'historical_batch':
        if (!symbols || !Array.isArray(symbols)) {
          return NextResponse.json(
            { error: 'Symbols array required' },
            { status: 400 }
          )
        }

        const historicalData = await Promise.all(
          symbols.slice(0, 10).map(symbol =>
            marketDataService.getHistoricalData(symbol, 'day', 30)
              .then(data => ({ symbol, data }))
              .catch(error => ({ symbol, error: error.message }))
          )
        )

        return NextResponse.json({
          success: true,
          historical_data: historicalData,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('Error in market data POST:', error)
    
    return NextResponse.json({
      error: 'Failed to process request',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}