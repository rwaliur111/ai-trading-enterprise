import axios from 'axios';

export class PolygonService {
  private apiKey: string;
  private baseUrl = 'https://api.polygon.io';

  constructor() {
    this.apiKey = process.env.POLYGON_API_KEY!;
  }

  async getAggregates(symbol: string, timespan: string, from?: string, to?: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/v2/aggs/ticker/${symbol}/range/1/${timespan}/${from || '2023-01-01'}/${to || new Date().toISOString().split('T')[0]}`, {
        params: {
          apiKey: this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching aggregates:', error);
      throw error;
    }
  }

  async getTickerDetails(symbol: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/v3/reference/tickers/${symbol}`, {
        params: {
          apiKey: this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching ticker details:', error);
      throw error;
    }
  }

  async getNews(symbol?: string) {
    try {
      const params: any = {
        apiKey: this.apiKey,
        limit: 10
      };
      
      if (symbol) {
        params.ticker = symbol;
      }

      const response = await axios.get(`${this.baseUrl}/v2/reference/news`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching news:', error);
      throw error;
    }
  }
}
