import axios from 'axios';

export class PolygonService {
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.POLYGON_API_KEY!;
  }

  async getAggregates(symbol: string, timespan: string = 'day', from: string = '2024-01-01', to: string = '2024-01-10'): Promise<any> {
    try {
      const response = await axios.get(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/${timespan}/${from}/${to}?apiKey=${this.apiKey}`
      );
      return response.data;
    } catch (error) {
      console.error('Polygon API error:', error);
      return {};
    }
  }

  async getLastTrade(symbol: string): Promise<any> {
    try {
      const response = await axios.get(
        `https://api.polygon.io/v2/last/trade/${symbol}?apiKey=${this.apiKey}`
      );
      return response.data;
    } catch (error) {
      console.error('Polygon last trade error:', error);
      return {};
    }
  }
}