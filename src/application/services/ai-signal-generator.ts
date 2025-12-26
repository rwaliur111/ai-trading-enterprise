export class AISignalGenerator {
  async generateSignals(marketData: any[]): Promise<any[]> {
    // Mock AI signal generation
    const signals = marketData.map(quote => {
      const random = Math.random();
      let action: 'buy' | 'sell' | 'hold' = 'hold';
      let confidence = 0.5;
      
      if (random > 0.7) {
        action = 'buy';
        confidence = 0.7 + Math.random() * 0.3;
      } else if (random < 0.3) {
        action = 'sell';
        confidence = 0.6 + Math.random() * 0.2;
      }
      
      return {
        symbol: quote.symbol,
        action,
        confidence,
        price: quote.last_price,
        reason: this.getSignalReason(action, quote),
        timestamp: new Date().toISOString()
      };
    });
    
    return signals.filter(signal => signal.action !== 'hold');
  }
  
  private getSignalReason(action: string, quote: any): string {
    const reasons = {
      buy: [
        `Strong upward momentum detected for ${quote.symbol}`,
        `Oversold conditions suggest buying opportunity for ${quote.symbol}`,
        `Positive trend reversal pattern identified for ${quote.symbol}`
      ],
      sell: [
        `Price reached resistance level for ${quote.symbol}`,
        `Overbought conditions detected for ${quote.symbol}`,
        `Negative trend pattern identified for ${quote.symbol}`
      ]
    };
    
    const actionReasons = reasons[action as keyof typeof reasons] || ['No clear signal'];
    return actionReasons[Math.floor(Math.random() * actionReasons.length)];
  }
}