import axios from 'axios';

export class AlphaVantageService {
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY!;
  }

  async getTimeSeriesDaily(symbol: string) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'TIME_SERIES_DAILY',
          symbol: symbol,
          apikey: this.apiKey,
          outputsize: 'compact'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching time series:', error);
      throw error;
    }
  }

  async getRSI(symbol: string, timePeriod = 14) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'RSI',
          symbol: symbol,
          interval: 'daily',
          time_period: timePeriod,
          series_type: 'close',
          apikey: this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching RSI:', error);
      throw error;
    }
  }

  async getMACD(symbol: string) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'MACD',
          symbol: symbol,
          interval: 'daily',
          series_type: 'close',
          apikey: this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching MACD:', error);
      throw error;
    }
  }
}
