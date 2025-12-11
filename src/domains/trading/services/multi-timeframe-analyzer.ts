// src/domains/trading/services/multi-timeframe-analyzer.ts
export class MultiTimeframeAnalyzer {
  private timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
  
  async analyzeSymbol(symbol: string): Promise<MultiTimeframeAnalysis> {
    const analyses = await Promise.all(
      this.timeframes.map(tf => 
        this.analyzeTimeframe(symbol, tf)
      )
    );
    
    return this.synthesizeAnalysis(analyses);
  }
}