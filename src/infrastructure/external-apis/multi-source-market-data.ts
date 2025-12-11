export class MultiSourceMarketData {
  async getMarketData(symbol: string): Promise<any> {
    // Mock implementation
    return { 
      symbol, 
      price: 150.25, 
      volume: 1000000,
      change: 1.25,
      changePercent: 0.84
    };
  }
  
  async getHistoricalData(symbol: string, period: string): Promise<any[]> {
    return [];
  }
}
