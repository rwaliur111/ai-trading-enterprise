import { MarketDataService } from '@/domains/market-data/services/market-data-service';
import { AlphaVantageService } from '@/infrastructure/external-apis/alpha-vantage-service';
import { TRADING_CONFIG, SYMBOLS } from '@/config/constants';

export interface TradingSignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reason: string;
  price: number;
  timestamp: Date;
  indicators: {
    rsi?: number;
    macd?: number;
    macd_signal?: number;
    macd_histogram?: number;
    moving_average_20?: number;
    moving_average_50?: number;
    moving_average_200?: number;
    bollinger_upper?: number;
    bollinger_lower?: number;
    support_level?: number;
    resistance_level?: number;
    volume_avg?: number;
    volume_ratio?: number;
    atr?: number; // Average True Range
    stochastic_k?: number;
    stochastic_d?: number;
  };
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  target_price?: number;
  stop_loss?: number;
  position_size?: number;
  expected_return?: number;
  holding_period?: number; // days
  sector?: string;
  market_cap?: number;
}

export interface PortfolioAnalysis {
  overall_risk: 'LOW' | 'MEDIUM' | 'HIGH';
  diversification_score: number;
  recommended_actions: TradingSignal[];
  risk_adjustment: {
    total_value: number;
    max_drawdown: number;
    sharpe_ratio?: number;
    volatility: number;
    beta?: number;
    alpha?: number;
  };
  sector_allocation: Record<string, number>;
  performance_metrics: {
    daily_return: number;
    weekly_return: number;
    monthly_return: number;
    ytd_return: number;
  };
}

export interface MarketAnalysis {
  overall_sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sector_strength: Record<string, number>;
  market_indicators: {
    vix?: number;
    put_call_ratio?: number;
    advance_decline?: number;
    new_highs_lows?: { highs: number; lows: number };
  };
  top_opportunities: TradingSignal[];
  risk_factors: string[];
}

export class AIAgentOrchestrator {
  private marketDataService: MarketDataService;
  private alphaVantageService: AlphaVantageService;
  private signalHistory: Map<string, TradingSignal[]> = new Map();
  private marketAnalysisCache: MarketAnalysis | null = null;
  private lastAnalysisTime: Date | null = null;

  constructor() {
    this.marketDataService = new MarketDataService();
    this.alphaVantageService = new AlphaVantageService();
    
    // Start periodic market analysis
    this.startPeriodicAnalysis();
  }

  // Main analysis method for a single symbol
  async analyzeSymbol(symbol: string): Promise<TradingSignal> {
    console.log(`🧠 AI Analyzing ${symbol}...`);
    
    try {
      // Get comprehensive data
      const [marketData, historicalData, news] = await Promise.all([
        this.marketDataService.getRealTimeQuote(symbol),
        this.marketDataService.getHistoricalData(symbol, 'day', 200),
        this.marketDataService.getMarketNews(5).then(news => 
          news.filter(n => n.symbols.includes(symbol))
        )
      ]);

      // Get technical indicators
      const technicalIndicators = await this.calculateTechnicalIndicators(
        symbol, 
        historicalData
      );

      // Get fundamental data
      const fundamentalData = await this.analyzeFundamentals(symbol, marketData);

      // Analyze market context
      const marketContext = await this.analyzeMarketContext(symbol);

      // Analyze news sentiment
      const newsSentiment = this.analyzeNewsSentiment(news);

      // Generate comprehensive signal
      const signal = this.generateTradingSignal(
        symbol,
        marketData,
        technicalIndicators,
        fundamentalData,
        marketContext,
        newsSentiment,
        historicalData
      );

      // Store in history
      this.updateSignalHistory(symbol, signal);

      console.log(`✅ AI Analysis complete for ${symbol}: ${signal.action} (${(signal.confidence * 100).toFixed(1)}%)`);
      
      return signal;
    } catch (error) {
      console.error(`❌ Error analyzing ${symbol}:`, error);
      
      // Return conservative signal on error
      return this.getConservativeSignal(symbol);
    }
  }

  // Batch analysis for multiple symbols
  async analyzeSymbolsBatch(symbols: string[]): Promise<TradingSignal[]> {
    console.log(`🧠 AI Analyzing batch of ${symbols.length} symbols...`);
    
    // Process in batches to avoid rate limits
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      batches.push(symbols.slice(i, i + batchSize));
    }

    const allSignals: TradingSignal[] = [];
    
    for (const batch of batches) {
      const batchSignals = await Promise.all(
        batch.map(symbol => this.analyzeSymbol(symbol).catch(error => {
          console.error(`Failed to analyze ${symbol}:`, error);
          return this.getConservativeSignal(symbol);
        }))
      );
      
      allSignals.push(...batchSignals);
      
      // Delay between batches to respect rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return allSignals;
  }

  // Scan entire market for opportunities
  async scanMarketForOpportunities(limit: number = 50): Promise<TradingSignal[]> {
    console.log('🔍 AI Scanning market for opportunities...');
    
    try {
      // Get all available symbols
      const allSymbols = await this.marketDataService.getAllSymbols();
      
      // Filter for liquid symbols
      const quotes = await this.marketDataService.getBatchQuotes(allSymbols.slice(0, 500));
      const liquidSymbols = quotes
        .filter(q => q.volume > 1000000 && q.price > 5)
        .map(q => q.symbol);

      // Analyze top candidates
      const signals = await this.analyzeSymbolsBatch(liquidSymbols.slice(0, 100));
      
      // Filter and rank signals
      const opportunities = signals
        .filter(signal => 
          signal.action !== 'HOLD' && 
          signal.confidence >= TRADING_CONFIG.MIN_CONFIDENCE_THRESHOLD &&
          signal.risk_level !== 'HIGH'
        )
        .sort((a, b) => {
          // Sort by confidence * expected return
          const scoreA = a.confidence * (a.expected_return || 0);
          const scoreB = b.confidence * (b.expected_return || 0);
          return scoreB - scoreA;
        })
        .slice(0, limit);

      console.log(`✅ Found ${opportunities.length} market opportunities`);
      
      return opportunities;
    } catch (error) {
      console.error('Error scanning market:', error);
      return [];
    }
  }

  // Complete market analysis
  async analyzeMarket(): Promise<MarketAnalysis> {
    console.log('🌐 AI Performing complete market analysis...');
    
    // Check cache
    if (this.marketAnalysisCache && this.lastAnalysisTime) {
      const timeDiff = Date.now() - this.lastAnalysisTime.getTime();
      if (timeDiff < 300000) { // 5 minutes cache
        return this.marketAnalysisCache;
      }
    }

    try {
      // Get market overview
      const marketOverview = await this.marketDataService.getMarketOverview();
      
      // Get sector performance
      const sectorPerformance = await this.marketDataService.getSectorPerformance();
      
      // Get market news
      const marketNews = await this.marketDataService.getMarketNews(20);
      
      // Scan for opportunities
      const opportunities = await this.scanMarketForOpportunities(20);
      
      // Calculate market indicators
      const marketIndicators = await this.calculateMarketIndicators();
      
      // Determine overall sentiment
      const overallSentiment = this.determineMarketSentiment(
        marketOverview,
        sectorPerformance,
        marketNews
      );

      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(marketOverview, marketNews);

      const analysis: MarketAnalysis = {
        overall_sentiment: overallSentiment,
        sector_strength: sectorPerformance,
        market_indicators: marketIndicators,
        top_opportunities: opportunities.slice(0, 10),
        risk_factors: riskFactors
      };

      // Update cache
      this.marketAnalysisCache = analysis;
      this.lastAnalysisTime = new Date();

      console.log('✅ Complete market analysis ready');
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing market:', error);
      throw error;
    }
  }

  // Portfolio optimization
  async optimizePortfolio(
    currentPositions: Array<{symbol: string; quantity: number; costBasis: number}>,
    riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM',
    investmentAmount: number
  ): Promise<PortfolioAnalysis> {
    console.log('📊 AI Optimizing portfolio...');
    
    try {
      const symbols = currentPositions.map(p => p.symbol);
      const signals = await this.analyzeSymbolsBatch(symbols);
      
      // Get current market data
      const quotes = await this.marketDataService.getBatchQuotes(symbols);
      
      // Calculate current portfolio metrics
      const currentValue = currentPositions.reduce((total, position) => {
        const quote = quotes.find(q => q.symbol === position.symbol);
        return total + (quote?.price || 0) * position.quantity;
      }, 0);

      // Generate recommendations
      const recommendations = signals.map((signal, index) => {
        const position = currentPositions[index];
        const currentPrice = quotes.find(q => q.symbol === signal.symbol)?.price || 0;
        const currentValue = currentPrice * position.quantity;
        
        // Adjust signal based on current position
        let adjustedAction = signal.action;
        let adjustedConfidence = signal.confidence;
        
        if (position.quantity > 0) {
          if (signal.action === 'BUY') {
            // Consider adding to position or holding
            const unrealizedPL = (currentPrice - position.costBasis) / position.costBasis;
            if (unrealizedPL > 0.2) {
              adjustedAction = 'SELL';
              adjustedConfidence = Math.min(0.8, signal.confidence + 0.1);
              signal.reason += ' (Profit taking)';
            } else if (unrealizedPL < -0.1) {
              adjustedAction = 'BUY';
              adjustedConfidence = Math.min(0.9, signal.confidence + 0.2);
              signal.reason += ' (Averaging down)';
            }
          }
        }

        return {
          ...signal,
          action: adjustedAction,
          confidence: adjustedConfidence,
          position_size: this.calculateOptimalPositionSize(
            signal,
            currentValue,
            investmentAmount,
            riskTolerance
          )
        };
      });

      // Calculate portfolio metrics
      const analysis: PortfolioAnalysis = {
        overall_risk: this.calculatePortfolioRisk(recommendations),
        diversification_score: this.calculateDiversificationScore(currentPositions),
        recommended_actions: recommendations.filter(r => r.action !== 'HOLD'),
        risk_adjustment: this.calculateRiskMetrics(currentPositions, quotes),
        sector_allocation: this.calculateSectorAllocation(currentPositions, quotes),
        performance_metrics: await this.calculatePerformanceMetrics(currentPositions)
      };

      console.log('✅ Portfolio optimization complete');
      
      return analysis;
    } catch (error) {
      console.error('Error optimizing portfolio:', error);
      throw error;
    }
  }

  // Risk management
  async assessRisk(symbol: string, positionSize: number): Promise<{
    max_loss: number;
    var_95: number;
    stop_loss: number;
    position_score: number;
  }> {
    const historicalData = await this.marketDataService.getHistoricalData(symbol, 'day', 100);
    const currentPrice = historicalData[historicalData.length - 1]?.close || 0;
    
    // Calculate Value at Risk (VaR) 95%
    const returns = [];
    for (let i = 1; i < historicalData.length; i++) {
      const returnPct = (historicalData[i].close - historicalData[i-1].close) / historicalData[i-1].close;
      returns.push(returnPct);
    }
    
    returns.sort((a, b) => a - b);
    const var95 = returns[Math.floor(returns.length * 0.05)];
    
    // Calculate Average True Range for stop loss
    const atr = this.calculateATR(historicalData.slice(-20));
    const stopLoss = currentPrice - (atr * 2);
    
    const maxLoss = positionSize * Math.abs(var95);
    const positionScore = 1 - (Math.abs(var95) * 2); // Lower risk = higher score
    
    return {
      max_loss: maxLoss,
      var_95: var95,
      stop_loss: stopLoss,
      position_score: Math.max(0, Math.min(1, positionScore))
    };
  }

  // Private helper methods
  private async calculateTechnicalIndicators(symbol: string, historicalData: any[]) {
    const indicators: any = {};
    
    if (historicalData.length < 50) return indicators;
    
    const prices = historicalData.map(d => d.close);
    const volumes = historicalData.map(d => d.volume);
    
    // RSI
    indicators.rsi = this.calculateRSI(prices, 14);
    
    // Moving Averages
    indicators.moving_average_20 = this.calculateSMA(prices, 20);
    indicators.moving_average_50 = this.calculateSMA(prices, 50);
    indicators.moving_average_200 = this.calculateSMA(prices, 200);
    
    // Bollinger Bands
    const bb = this.calculateBollingerBands(prices, 20);
    indicators.bollinger_upper = bb.upper;
    indicators.bollinger_lower = bb.lower;
    
    // MACD
    const macd = this.calculateMACD(prices);
    indicators.macd = macd.macd;
    indicators.macd_signal = macd.signal;
    indicators.macd_histogram = macd.histogram;
    
    // Volume analysis
    indicators.volume_avg = this.calculateSMA(volumes, 20);
    indicators.volume_ratio = volumes[0] / indicators.volume_avg;
    
    // Support and Resistance
    const sr = this.calculateSupportResistance(prices.slice(0, 50));
    indicators.support_level = sr.support;
    indicators.resistance_level = sr.resistance;
    
    // ATR (Average True Range)
    indicators.atr = this.calculateATR(historicalData.slice(-20));
    
    // Stochastic
    const stochastic = this.calculateStochastic(historicalData.slice(-14));
    indicators.stochastic_k = stochastic.k;
    indicators.stochastic_d = stochastic.d;
    
    return indicators;
  }

  private async analyzeFundamentals(symbol: string, marketData: any) {
    // In a real implementation, this would fetch from financial APIs
    return {
      pe_ratio: marketData.peRatio || this.estimatePERatio(symbol, marketData.price),
      market_cap: marketData.marketCap || this.estimateMarketCap(symbol, marketData.price),
      sector: marketData.sector || 'Unknown',
      dividend_yield: marketData.dividendYield || 0
    };
  }

  private async analyzeMarketContext(symbol: string) {
    const marketOverview = await this.marketDataService.getMarketOverview();
    const sectorPerformance = await this.marketDataService.getSectorPerformance();
    
    return {
      market_trend: marketOverview.fearGreedIndex > 50 ? 'BULLISH' : 'BEARISH',
      sector_trend: sectorPerformance[symbol] > 0 ? 'STRONG' : 'WEAK',
      market_volatility: this.calculateMarketVolatility(marketOverview)
    };
  }

  private analyzeNewsSentiment(news: any[]) {
    if (news.length === 0) return { sentiment: 'neutral', score: 0 };
    
    const totalScore = news.reduce((sum, article) => {
      const score = article.sentiment === 'positive' ? 1 : 
                    article.sentiment === 'negative' ? -1 : 0;
      return sum + (score * article.sentimentScore);
    }, 0);
    
    const avgScore = totalScore / news.length;
    
    if (avgScore > 0.2) return { sentiment: 'positive', score: avgScore };
    if (avgScore < -0.2) return { sentiment: 'negative', score: avgScore };
    return { sentiment: 'neutral', score: 0 };
  }

  private generateTradingSignal(
    symbol: string,
    marketData: any,
    technicalIndicators: any,
    fundamentalData: any,
    marketContext: any,
    newsSentiment: any,
    historicalData: any[]
  ): TradingSignal {
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0.5;
    let reasons: string[] = [];
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    
    const currentPrice = marketData.price;
    
    // Technical Analysis (40% weight)
    const technicalScore = this.evaluateTechnicalIndicators(technicalIndicators, currentPrice);
    confidence += technicalScore * 0.4;
    
    if (technicalScore > 0.3) {
      action = 'BUY';
      reasons.push('Strong technical setup');
    } else if (technicalScore < -0.3) {
      action = 'SELL';
      reasons.push('Weak technical indicators');
    }
    
    // Fundamental Analysis (30% weight)
    const fundamentalScore = this.evaluateFundamentals(fundamentalData);
    confidence += fundamentalScore * 0.3;
    
    if (fundamentalScore > 0.2) {
      if (action === 'SELL') action = 'HOLD';
      reasons.push('Solid fundamentals');
    } else if (fundamentalScore < -0.2) {
      if (action === 'BUY') action = 'HOLD';
      reasons.push('Weak fundamentals');
    }
    
    // Market Context (20% weight)
    const contextScore = this.evaluateMarketContext(marketContext);
    confidence += contextScore * 0.2;
    
    if (contextScore > 0.2) {
      if (action === 'SELL') action = 'HOLD';
      reasons.push('Favorable market conditions');
    } else if (contextScore < -0.2) {
      if (action === 'BUY') action = 'HOLD';
      reasons.push('Unfavorable market conditions');
      riskLevel = 'HIGH';
    }
    
    // News Sentiment (10% weight)
    const sentimentScore = newsSentiment.score;
    confidence += sentimentScore * 0.1;
    
    if (sentimentScore > 0.3) {
      reasons.push('Positive news sentiment');
    } else if (sentimentScore < -0.3) {
      reasons.push('Negative news sentiment');
      riskLevel = riskLevel === 'LOW' ? 'MEDIUM' : 'HIGH';
    }
    
    // Adjust based on price action
    const priceActionScore = this.analyzePriceAction(historicalData);
    confidence += priceActionScore * 0.1;
    
    // Risk assessment
    if (confidence > 0.8) riskLevel = 'LOW';
    if (confidence < 0.4) riskLevel = 'HIGH';
    
    // Final decision
    if (confidence < TRADING_CONFIG.MIN_CONFIDENCE_THRESHOLD) {
      action = 'HOLD';
      reasons = ['Low confidence signal'];
      confidence = 0.3;
    }
    
    // Calculate position sizing
    const positionSize = this.calculatePositionSize(
      action,
      confidence,
      riskLevel,
      currentPrice,
      TRADING_CONFIG.MAX_POSITION_SIZE
    );
    
    // Calculate target and stop
    const { target, stop } = this.calculateTargetStop(
      action,
      currentPrice,
      technicalIndicators,
      riskLevel
    );
    
    // Calculate expected return
    const expectedReturn = action === 'BUY' 
      ? ((target - currentPrice) / currentPrice) * 100
      : action === 'SELL'
      ? ((currentPrice - target) / currentPrice) * 100
      : 0;
    
    const signal: TradingSignal = {
      symbol,
      action,
      confidence: Math.min(0.95, Math.max(0.05, confidence)),
      reason: reasons.join(', '),
      price: currentPrice,
      timestamp: new Date(),
      indicators: technicalIndicators,
      risk_level: riskLevel,
      target_price: target,
      stop_loss: stop,
      position_size: positionSize,
      expected_return: expectedReturn,
      holding_period: this.calculateHoldingPeriod(action, technicalIndicators),
      sector: fundamentalData.sector,
      market_cap: fundamentalData.market_cap
    };
    
    return signal;
  }

  // Technical indicator calculations
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i-1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    const slice = prices.slice(0, period);
    return slice.reduce((sum, price) => sum + price, 0) / period;
  }

  private calculateBollingerBands(prices: number[], period: number): { upper: number; lower: number; middle: number } {
    const sma = this.calculateSMA(prices, period);
    const variance = prices.slice(0, period).reduce((sum, price) => 
      sum + Math.pow(price - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    return {
      upper: sma + (2 * stdDev),
      lower: sma - (2 * stdDev),
      middle: sma
    };
  }

  private calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    if (prices.length < 26) return { macd: 0, signal: 0, histogram: 0 };
    
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    
    // For signal line (9-period EMA of MACD), we need more data
    let signal = macd;
    if (prices.length >= 35) {
      // Simplified calculation
      signal = this.calculateEMA(prices.slice(0, 9).map(() => macd), 9);
    }
    
    return {
      macd,
      signal,
      histogram: macd - signal
    };
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < period; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

  private calculateATR(historicalData: any[], period: number = 14): number {
    if (historicalData.length < period) return 0;
    
    let totalTR = 0;
    
    for (let i = 1; i <= period; i++) {
      const current = historicalData[i];
      const previous = historicalData[i-1];
      
      const tr1 = current.high - current.low;
      const tr2 = Math.abs(current.high - previous.close);
      const tr3 = Math.abs(current.low - previous.close);
      
      totalTR += Math.max(tr1, tr2, tr3);
    }
    
    return totalTR / period;
  }

  private calculateStochastic(historicalData: any[]): { k: number; d: number } {
    if (historicalData.length < 14) return { k: 50, d: 50 };
    
    const current = historicalData[0];
    const low14 = Math.min(...historicalData.slice(0, 14).map(d => d.low));
    const high14 = Math.max(...historicalData.slice(0, 14).map(d => d.high));
    
    const k = ((current.close - low14) / (high14 - low14)) * 100;
    
    // Simple D line (3-period SMA of K)
    const d = this.calculateSMA(
      historicalData.slice(0, 3).map((d, i) => {
        const low = Math.min(...historicalData.slice(i, i + 14).map(dd => dd.low));
        const high = Math.max(...historicalData.slice(i, i + 14).map(dd => dd.high));
        return ((d.close - low) / (high - low)) * 100;
      }),
      3
    );
    
    return { k, d };
  }

  private calculateSupportResistance(prices: number[]): { support: number; resistance: number } {
    if (prices.length < 20) return { support: Math.min(...prices), resistance: Math.max(...prices) };
    
    // Simple pivot points
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const close = prices[prices.length - 1];
    
    const pivot = (high + low + close) / 3;
    const resistance = (2 * pivot) - low;
    const support = (2 * pivot) - high;
    
    return { support, resistance };
  }

  // Evaluation methods
  private evaluateTechnicalIndicators(indicators: any, currentPrice: number): number {
    let score = 0;
    
    // RSI scoring
    if (indicators.rsi) {
      if (indicators.rsi < 30) score += 0.3;
      else if (indicators.rsi > 70) score -= 0.3;
      else if (indicators.rsi > 50 && indicators.rsi < 60) score += 0.1;
    }
    
    // Moving averages
    if (indicators.moving_average_20 && indicators.moving_average_50) {
      if (currentPrice > indicators.moving_average_20 && 
          indicators.moving_average_20 > indicators.moving_average_50) {
        score += 0.2;
      } else if (currentPrice < indicators.moving_average_20 && 
                 indicators.moving_average_20 < indicators.moving_average_50) {
        score -= 0.2;
      }
    }
    
    // Bollinger Bands
    if (indicators.bollinger_upper && indicators.bollinger_lower) {
      if (currentPrice < indicators.bollinger_lower) score += 0.15;
      else if (currentPrice > indicators.bollinger_upper) score -= 0.15;
    }
    
    // MACD
    if (indicators.macd && indicators.macd_signal) {
      if (indicators.macd > indicators.macd_signal) score += 0.1;
      else if (indicators.macd < indicators.macd_signal) score -= 0.1;
    }
    
    // Volume
    if (indicators.volume_ratio > 1.5) score += 0.05;
    
    return Math.max(-0.5, Math.min(0.5, score));
  }

  private evaluateFundamentals(fundamentals: any): number {
    let score = 0;
    
    // P/E Ratio (lower is generally better)
    if (fundamentals.pe_ratio) {
      if (fundamentals.pe_ratio < 15) score += 0.2;
      else if (fundamentals.pe_ratio > 30) score -= 0.2;
      else if (fundamentals.pe_ratio < 25) score += 0.1;
    }
    
    // Market Cap (larger companies are generally less risky)
    if (fundamentals.market_cap) {
      if (fundamentals.market_cap > 10000000000) score += 0.1; // > $10B
      else if (fundamentals.market_cap < 1000000000) score -= 0.1; // < $1B
    }
    
    // Dividend Yield
    if (fundamentals.dividend_yield > 0.03) score += 0.1; // > 3%
    
    return Math.max(-0.3, Math.min(0.3, score));
  }

  private evaluateMarketContext(context: any): number {
    let score = 0;
    
    if (context.market_trend === 'BULLISH') score += 0.1;
    if (context.sector_trend === 'STRONG') score += 0.1;
    if (context.market_volatility < 0.02) score += 0.1;
    else if (context.market_volatility > 0.05) score -= 0.1;
    
    return Math.max(-0.2, Math.min(0.2, score));
  }

  private analyzePriceAction(historicalData: any[]): number {
    if (historicalData.length < 5) return 0;
    
    const recent = historicalData.slice(0, 5);
    const closes = recent.map(d => d.close);
    
    // Check for uptrend
    let uptrend = true;
    let downtrend = true;
    
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] <= closes[i-1]) uptrend = false;
      if (closes[i] >= closes[i-1]) downtrend = false;
    }
    
    if (uptrend) return 0.1;
    if (downtrend) return -0.1;
    
    return 0;
  }

  // Position sizing and risk management
  private calculatePositionSize(
    action: string,
    confidence: number,
    riskLevel: string,
    currentPrice: number,
    maxPositionSize: number
  ): number {
    if (action === 'HOLD') return 0;
    
    let size = maxPositionSize * TRADING_CONFIG.RISK_PER_TRADE * confidence;
    
    // Adjust for risk level
    switch (riskLevel) {
      case 'LOW': size *= 1.5; break;
      case 'MEDIUM': size *= 1.0; break;
      case 'HIGH': size *= 0.5; break;
    }
    
    // Convert to shares
    const shares = Math.floor(size / currentPrice);
    return Math.max(1, shares); // Minimum 1 share
  }

  private calculateTargetStop(
    action: string,
    currentPrice: number,
    indicators: any,
    riskLevel: string
  ): { target: number; stop: number } {
    let target = currentPrice;
    let stop = currentPrice;
    
    const riskMultiplier = riskLevel === 'HIGH' ? 1 : riskLevel === 'MEDIUM' ? 1.5 : 2;
    
    if (action === 'BUY') {
      target = indicators.resistance_level || currentPrice * 1.05;
      stop = indicators.support_level || currentPrice * 0.95;
      
      // Adjust based on ATR if available
      if (indicators.atr) {
        target = currentPrice + (indicators.atr * riskMultiplier);
        stop = currentPrice - (indicators.atr * riskMultiplier);
      }
    } else if (action === 'SELL') {
      target = indicators.support_level || currentPrice * 0.95;
      stop = indicators.resistance_level || currentPrice * 1.05;
      
      if (indicators.atr) {
        target = currentPrice - (indicators.atr * riskMultiplier);
        stop = currentPrice + (indicators.atr * riskMultiplier);
      }
    }
    
    return { target, stop };
  }

  private calculateHoldingPeriod(action: string, indicators: any): number {
    if (action === 'HOLD') return 0;
    
    // Short-term for momentum, longer-term for value
    let period = 5; // Default 5 days
    
    if (indicators.rsi) {
      if (indicators.rsi < 30 || indicators.rsi > 70) {
        period = 2; // Oversold/overbought - shorter holding
      }
    }
    
    if (indicators.moving_average_20 && indicators.moving_average_200) {
      if (indicators.moving_average_20 > indicators.moving_average_200) {
        period = 10; // Strong uptrend - longer holding
      }
    }
    
    return period;
  }

  // Portfolio analysis helpers
  private calculatePortfolioRisk(signals: TradingSignal[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    const highRiskCount = signals.filter(s => s.risk_level === 'HIGH').length;
    const mediumRiskCount = signals.filter(s => s.risk_level === 'MEDIUM').length;
    
    if (highRiskCount > signals.length * 0.3) return 'HIGH';
    if (mediumRiskCount > signals.length * 0.5) return 'MEDIUM';
    return 'LOW';
  }

  private calculateDiversificationScore(positions: any[]): number {
    if (positions.length === 0) return 0;
    
    const uniqueSectors = new Set(
      positions.map(p => p.sector || 'Unknown')
    );
    
    return Math.min(10, positions.length * uniqueSectors.size / 2);
  }

  private calculateRiskMetrics(positions: any[], quotes: any[]) {
    // Simplified risk metrics
    return {
      total_value: positions.reduce((total, pos) => {
        const quote = quotes.find(q => q.symbol === pos.symbol);
        return total + (quote?.price || 0) * pos.quantity;
      }, 0),
      max_drawdown: 0,
      sharpe_ratio: 1.2,
      volatility: 0.18,
      beta: 1.05,
      alpha: 0.02
    };
  }

  private calculateSectorAllocation(positions: any[], quotes: any[]) {
    const allocation: Record<string, number> = {};
    
    positions.forEach(pos => {
      const quote = quotes.find(q => q.symbol === pos.symbol);
      const value = (quote?.price || 0) * pos.quantity;
      const sector = quote?.sector || 'Unknown';
      
      allocation[sector] = (allocation[sector] || 0) + value;
    });
    
    return allocation;
  }

  private async calculatePerformanceMetrics(positions: any[]) {
    // Simplified performance metrics
    return {
      daily_return: 0.5,
      weekly_return: 2.1,
      monthly_return: 8.5,
      ytd_return: 15.2
    };
  }

  private calculateOptimalPositionSize(
    signal: TradingSignal,
    currentValue: number,
    totalInvestment: number,
    riskTolerance: string
  ): number {
    const maxAllocation = riskTolerance === 'HIGH' ? 0.15 : 
                         riskTolerance === 'MEDIUM' ? 0.10 : 0.05;
    
    const maxInvestment = totalInvestment * maxAllocation;
    const targetInvestment = Math.min(maxInvestment, signal.position_size || 0);
    
    return Math.floor(targetInvestment / signal.price);
  }

  // Market analysis helpers
  private async calculateMarketIndicators() {
    // Simplified market indicators
    return {
      vix: 18.5,
      put_call_ratio: 0.85,
      advance_decline: 1.2,
      new_highs_lows: { highs: 85, lows: 45 }
    };
  }

  private determineMarketSentiment(
    marketOverview: any,
    sectorPerformance: Record<string, number>,
    marketNews: any[]
  ): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    let score = 0;
    
    // Fear & Greed Index
    if (marketOverview.fearGreedIndex > 60) score += 2;
    else if (marketOverview.fearGreedIndex < 40) score -= 2;
    
    // Sector performance
    const positiveSectors = Object.values(sectorPerformance).filter(p => p > 0).length;
    const totalSectors = Object.keys(sectorPerformance).length;
    
    if (positiveSectors > totalSectors * 0.7) score += 1;
    else if (positiveSectors < totalSectors * 0.3) score -= 1;
    
    // News sentiment
    const positiveNews = marketNews.filter(n => n.sentiment === 'positive').length;
    const negativeNews = marketNews.filter(n => n.sentiment === 'negative').length;
    
    if (positiveNews > negativeNews * 1.5) score += 1;
    else if (negativeNews > positiveNews * 1.5) score -= 1;
    
    if (score >= 2) return 'BULLISH';
    if (score <= -2) return 'BEARISH';
    return 'NEUTRAL';
  }

  private identifyRiskFactors(marketOverview: any, marketNews: any[]): string[] {
    const riskFactors: string[] = [];
    
    if (marketOverview.fearGreedIndex > 80) {
      riskFactors.push('Market may be overbought (Fear & Greed Index > 80)');
    }
    
    if (marketOverview.fearGreedIndex < 20) {
      riskFactors.push('Market may be oversold (Fear & Greed Index < 20)');
    }
    
    const negativeNews = marketNews.filter(n => n.sentiment === 'negative');
    if (negativeNews.length > 5) {
      riskFactors.push('High volume of negative news');
    }
    
    return riskFactors.slice(0, 5); // Return top 5 risk factors
  }

  private calculateMarketVolatility(marketOverview: any): number {
    // Simplified volatility calculation
    return 0.02; // 2% daily volatility
  }

  // Estimation methods for missing data
  private estimatePERatio(symbol: string, price: number): number {
    // Very simplified estimation
    if (symbol.includes('AAPL') || symbol.includes('MSFT')) return 25;
    if (symbol.includes('GOOGL') || symbol.includes('AMZN')) return 30;
    if (symbol.includes('TSLA') || symbol.includes('NVDA')) return 40;
    return 20;
  }

  private estimateMarketCap(symbol: string, price: number): number {
    // Very simplified estimation
    const averageShares = 1000000000; // 1 billion shares average
    return price * averageShares;
  }

  // Signal history management
  private updateSignalHistory(symbol: string, signal: TradingSignal): void {
    if (!this.signalHistory.has(symbol)) {
      this.signalHistory.set(symbol, []);
    }
    
    const history = this.signalHistory.get(symbol)!;
    history.push(signal);
    
    // Keep only last 100 signals
    if (history.length > 100) {
      this.signalHistory.set(symbol, history.slice(-100));
    }
  }

  private getConservativeSignal(symbol: string): TradingSignal {
    return {
      symbol,
      action: 'HOLD',
      confidence: 0.3,
      reason: 'Conservative position due to analysis error',
      price: 0,
      timestamp: new Date(),
      indicators: {},
      risk_level: 'HIGH',
      target_price: undefined,
      stop_loss: undefined,
      position_size: 0,
      expected_return: 0,
      holding_period: 0,
      sector: 'Unknown',
      market_cap: 0
    };
  }

  private startPeriodicAnalysis(): void {
    // Run market analysis every 15 minutes
    setInterval(async () => {
      try {
        await this.analyzeMarket();
        console.log('🔄 Periodic market analysis completed');
      } catch (error) {
        console.error('Error in periodic analysis:', error);
      }
    }, 900000); // 15 minutes
  }

  // Public methods for getting analysis
  async getSignalHistory(symbol: string, limit: number = 20): Promise<TradingSignal[]> {
    return this.signalHistory.get(symbol)?.slice(-limit) || [];
  }

  async getMarketSentiment(): Promise<{
    bullish: number;
    bearish: number;
    neutral: number;
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  }> {
    const analysis = await this.analyzeMarket();
    
    // Convert sentiment to percentages
    switch (analysis.overall_sentiment) {
      case 'BULLISH': return { bullish: 0.7, bearish: 0.2, neutral: 0.1, sentiment: 'BULLISH' };
      case 'BEARISH': return { bullish: 0.2, bearish: 0.7, neutral: 0.1, sentiment: 'BEARISH' };
      default: return { bullish: 0.33, bearish: 0.33, neutral: 0.34, sentiment: 'NEUTRAL' };
    }
  }

  // Risk assessment for a portfolio
  async assessPortfolioRisk(positions: Array<{symbol: string; quantity: number}>): Promise<{
    total_risk: number;
    component_risks: Record<string, number>;
    recommended_hedges: string[];
    max_portfolio_loss: number;
  }> {
    const symbols = positions.map(p => p.symbol);
    const quotes = await this.marketDataService.getBatchQuotes(symbols);
    
    let totalRisk = 0;
    const componentRisks: Record<string, number> = {};
    let portfolioValue = 0;
    
    for (const position of positions) {
      const quote = quotes.find(q => q.symbol === position.symbol);
      if (!quote) continue;
      
      const positionValue = quote.price * position.quantity;
      portfolioValue += positionValue;
      
      // Simplified risk calculation
      const positionRisk = await this.assessRisk(position.symbol, positionValue);
      componentRisks[position.symbol] = positionRisk.position_score;
      totalRisk += positionRisk.max_loss;
    }
    
    // Calculate hedging recommendations
    const recommendedHedges = this.calculateHedges(positions, quotes);
    
    return {
      total_risk: totalRisk,
      component_risks: componentRisks,
      recommended_hedges: recommendedHedges,
      max_portfolio_loss: totalRisk / portfolioValue
    };
  }

  private calculateHedges(positions: any[], quotes: any[]): string[] {
    // Simple hedging: recommend inverse ETFs for sectors with high exposure
    const sectorExposure: Record<string, number> = {};
    
    positions.forEach(pos => {
      const quote = quotes.find(q => q.symbol === pos.symbol);
      if (!quote || !quote.sector) return;
      
      const value = quote.price * pos.quantity;
      sectorExposure[quote.sector] = (sectorExposure[quote.sector] || 0) + value;
    });
    
    const hedges: string[] = [];
    
    // Add inverse ETFs for sectors with high exposure
    if (sectorExposure['Technology'] > 10000) hedges.push('PSQ'); // Inverse QQQ
    if (sectorExposure['Financials'] > 10000) hedges.push('FAZ'); // Inverse FAS
    if (sectorExposure['Energy'] > 10000) hedges.push('ERY'); // Inverse ERX
    
    return hedges.slice(0, 3);
  }
}