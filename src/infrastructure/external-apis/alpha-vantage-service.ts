export class AlphaVantageService {
  async getRealTimeQuote(symbol: string): Promise<any> {
    return {
      symbol,
      price: 150,
      change: 1.25,
      changePercent: "0.84%",
      volume: 1000000
    };
  }
}
