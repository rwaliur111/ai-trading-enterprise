// Create src/application/services/ai-agent-orchestrator.ts
@'
import OpenAI from 'openai'
import { MarketDataService, MarketQuote } from '../../domains/market-data/services/market-data-service'
import { AlpacaService } from '../../infrastructure/external-apis/alpaca-service'

export interface TradingSignal {
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  priceTarget: number
  reasoning: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  timeframe: 'SHORT' | 'MEDIUM' | 'LONG'
  expectedReturn: number
}

export class AIAgentOrchestrator {
  private openai: OpenAI
  private marketDataService: MarketDataService
  private alpacaService: AlpacaService

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    })
    this.marketDataService = new MarketDataService()
    this.alpacaService = new AlpacaService()
  }

  async analyzeMarket(symbol: string): Promise<TradingSignal> {
    try {
      // Get real market data
      const marketData = await this.marketDataService.getRealTimeQuote(symbol)
      
      // Get news sentiment
      const newsSentiment = await this.getNewsSentiment(symbol)
      
      // Get technical indicators
      const technicalAnalysis = await this.getTechnicalAnalysis(symbol)
      
      // Get portfolio context
      const portfolioContext = await this.getPortfolioContext()
      
      // Generate AI analysis
      const prompt = this.buildAnalysisPrompt(symbol, marketData, newsSentiment, technicalAnalysis, portfolioContext)
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert quantitative trading analyst. Analyze market data and provide trading signals with confidence scores and detailed reasoning."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })

      const analysis = completion.choices[0].message.content
      return this.parseAIAnalysis(analysis || '', symbol, marketData)
    } catch (error) {
      console.error('Error in AI analysis:', error)
      throw error
    }
  }

  private async getNewsSentiment(symbol: string): Promise<any> {
    try {
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${symbol}&apiKey=${process.env.NEWSAPI_KEY}&language=en&pageSize=5`
      )
      const data = await response.json()
      
      // Simple sentiment analysis
      const positiveWords = ['up', 'gain', 'bullish', 'positive', 'strong', 'growth']
      const negativeWords = ['down', 'loss', 'bearish', 'negative', 'weak', 'decline']
      
      let sentimentScore = 0
      data.articles?.forEach((article: any) => {
        const text = (article.title + ' ' + article.description).toLowerCase()
        positiveWords.forEach(word => {
          if (text.includes(word)) sentimentScore += 1
        })
        negativeWords.forEach(word => {
          if (text.includes(word)) sentimentScore -= 1
        })
      })
      
      return {
        articles: data.articles || [],
        sentimentScore,
        averageSentiment: sentimentScore / (data.articles?.length || 1)
      }
    } catch (error) {
      console.error('Error fetching news:', error)
      return { articles: [], sentimentScore: 0, averageSentiment: 0 }
    }
  }

  private async getTechnicalAnalysis(symbol: string): Promise<any> {
    try {
      // Use Alpha Vantage for technical indicators
      const url = `https://www.alphavantage.co/query?function=SMA&symbol=${symbol}&interval=daily&time_period=10&series_type=close&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
      const response = await fetch(url)
      const data = await response.json()
      
      // Parse technical indicators
      const sma = data['Technical Analysis: SMA'] || {}
      const latestDate = Object.keys(sma)[0]
      const smaValue = sma[latestDate]?.['SMA'] || 0
      
      // Get RSI
      const rsiUrl = `https://www.alphavantage.co/query?function=RSI&symbol=${symbol}&interval=daily&time_period=10&series_type=close&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
      const rsiResponse = await fetch(rsiUrl)
      const rsiData = await rsiResponse.json()
      const rsi = rsiData['Technical Analysis: RSI'] || {}
      const rsiLatest = rsi[latestDate]?.['RSI'] || 50
      
      return {
        sma: parseFloat(smaValue),
        rsi: parseFloat(rsiLatest),
        trend: parseFloat(smaValue) > 0 ? 'BULLISH' : 'BEARISH',
        overbought: parseFloat(rsiLatest) > 70,
        oversold: parseFloat(rsiLatest) < 30
      }
    } catch (error) {
      console.error('Error fetching technical analysis:', error)
      return { sma: 0, rsi: 50, trend: 'NEUTRAL', overbought: false, oversold: false }
    }
  }

  private async getPortfolioContext(): Promise<any> {
    try {
      const account = await this.alpacaService.getAccount()
      const positions = await this.alpacaService.getPositions()
      
      return {
        totalValue: parseFloat(account.portfolio_value),
        cash: parseFloat(account.cash),
        buyingPower: parseFloat(account.buying_power),
        positions: positions.map((p: any) => ({
          symbol: p.symbol,
          quantity: parseFloat(p.qty),
          avgPrice: parseFloat(p.avg_entry_price),
          currentValue: parseFloat(p.market_value),
          profitLoss: parseFloat(p.unrealized_pl)
        })),
        totalProfitLoss: positions.reduce((sum: number, p: any) => sum + parseFloat(p.unrealized_pl), 0)
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error)
      return { totalValue: 0, cash: 0, buyingPower: 0, positions: [], totalProfitLoss: 0 }
    }
  }

  private buildAnalysisPrompt(
    symbol: string,
    marketData: MarketQuote,
    newsSentiment: any,
    technicalAnalysis: any,
    portfolioContext: any
  ): string {
    return `
Analyze ${symbol} for trading:

MARKET DATA:
- Current Price: $${marketData.price}
- Change: ${marketData.change} (${marketData.changePercent}%)
- Volume: ${marketData.volume}
- Day Range: $${marketData.low} - $${marketData.high}
- Previous Close: $${marketData.previousClose}

TECHNICAL INDICATORS:
- SMA (10-day): $${technicalAnalysis.sma}
- RSI (10-day): ${technicalAnalysis.rsi}
- Trend: ${technicalAnalysis.trend}
- Overbought: ${technicalAnalysis.overbought}
- Oversold: ${technicalAnalysis.oversold}

NEWS SENTIMENT:
- Articles: ${newsSentiment.articles.length}
- Sentiment Score: ${newsSentiment.sentimentScore}
- Average Sentiment: ${newsSentiment.averageSentiment}

PORTFOLIO CONTEXT:
- Total Portfolio Value: $${portfolioContext.totalValue}
- Available Cash: $${portfolioContext.cash}
- Buying Power: $${portfolioContext.buyingPower}
- Current Positions: ${portfolioContext.positions.length}
- Total P&L: $${portfolioContext.totalProfitLoss}

Provide analysis in this format:
ACTION: [BUY/SELL/HOLD]
CONFIDENCE: [0-1]
PRICE_TARGET: [number]
REASONING: [detailed analysis]
RISK_LEVEL: [LOW/MEDIUM/HIGH]
TIMEFRAME: [SHORT/MEDIUM/LONG]
EXPECTED_RETURN: [percentage]
`
  }

  private parseAIAnalysis(analysis: string, symbol: string, marketData: MarketQuote): TradingSignal {
    const lines = analysis.split('\n')
    const signal: Partial<TradingSignal> = {
      symbol,
      action: 'HOLD',
      confidence: 0.5,
      priceTarget: marketData.price,
      reasoning: '',
      riskLevel: 'MEDIUM',
      timeframe: 'SHORT',
      expectedReturn: 0
    }

    lines.forEach(line => {
      if (line.includes('ACTION:')) {
        const action = line.split(':')[1]?.trim()
        if (['BUY', 'SELL', 'HOLD'].includes(action)) {
          signal.action = action as 'BUY' | 'SELL' | 'HOLD'
        }
      } else if (line.includes('CONFIDENCE:')) {
        const confidence = parseFloat(line.split(':')[1]?.trim() || '0.5')
        signal.confidence = Math.min(Math.max(confidence, 0), 1)
      } else if (line.includes('PRICE_TARGET:')) {
        signal.priceTarget = parseFloat(line.split(':')[1]?.trim() || marketData.price.toString())
      } else if (line.includes('REASONING:')) {
        signal.reasoning = line.split(':')[1]?.trim() || ''
      } else if (line.includes('RISK_LEVEL:')) {
        const risk = line.split(':')[1]?.trim()
        if (['LOW', 'MEDIUM', 'HIGH'].includes(risk)) {
          signal.riskLevel = risk as 'LOW' | 'MEDIUM' | 'HIGH'
        }
      } else if (line.includes('TIMEFRAME:')) {
        const timeframe = line.split(':')[1]?.trim()
        if (['SHORT', 'MEDIUM', 'LONG'].includes(timeframe)) {
          signal.timeframe = timeframe as 'SHORT' | 'MEDIUM' | 'LONG'
        }
      } else if (line.includes('EXPECTED_RETURN:')) {
        const returnStr = line.split(':')[1]?.trim() || '0'
        signal.expectedReturn = parseFloat(returnStr.replace('%', ''))
      }
    })

    return signal as TradingSignal
  }

  async generateSignals(symbols: string[]): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = []
    
    for (const symbol of symbols) {
      try {
        const signal = await this.analyzeMarket(symbol)
        if (signal.confidence >= 0.7) { // Only include high confidence signals
          signals.push(signal)
        }
      } catch (error) {
        console.error(`Error generating signal for ${symbol}:`, error)
      }
    }
    
    return signals
  }
}
'@ | Set-Content -Path ".\src\application\services\ai-agent-orchestrator.ts" -Encoding UTF8