export class AlphaVantageService {
  private baseUrl = 'https://www.alphavantage.co/query';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY!;
  }

  async getQuote(symbol: string) {
    const response = await fetch(
      `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`
    );
    return response.json();
  }

  async getDailyData(symbol: string, days: number = 100) {
    const response = await fetch(
      `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${this.apiKey}`
    );
    const data = await response.json();
    // Parse and return historical data
    return this.parseHistoricalData(data, days);
  }

  private parseHistoricalData(data: any, days: number) {
    // Implementation
    return [];
  }
}