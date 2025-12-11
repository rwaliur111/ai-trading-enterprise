import axios from 'axios';

export class NewsService {
  private newsApiKey: string;
  private benzingaApiKey: string;

  constructor() {
    this.newsApiKey = process.env.NEWSAPI_KEY!;
    this.benzingaApiKey = process.env.BENZINGA_API_KEY!;
  }

  async getNews(symbol: string, fromDate?: string): Promise<any[]> {
    try {
      // Using NewsAPI
      const today = new Date().toISOString().split('T')[0];
      const from = fromDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await axios.get(
        `https://newsapi.org/v2/everything?q=${symbol}+stock&from=${from}&to=${today}&sortBy=publishedAt&apiKey=${this.newsApiKey}`
      );
      
      return response.data.articles?.slice(0, 10) || [];
    } catch (error) {
      console.error('News API error:', error);
      return [];
    }
  }

  async getMarketNews(): Promise<any[]> {
    try {
      const response = await axios.get(
        `https://newsapi.org/v2/top-headlines?category=business&country=us&apiKey=${this.newsApiKey}`
      );
      return response.data.articles?.slice(0, 5) || [];
    } catch (error) {
      console.error('Market news error:', error);
      return [];
    }
  }

  async getSentiment(symbol: string): Promise<{score: number, sentiment: string}> {
    try {
      // Using HuggingFace for sentiment analysis
      const news = await this.getNews(symbol);
      const headlines = news.map((article: any) => article.title).join('. ');
      
      if (headlines.length > 0) {
        const response = await axios.post(
          'https://api-inference.huggingface.co/models/finiteautomata/bertweet-base-sentiment-analysis',
          { inputs: headlines },
          {
            headers: {
              'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`
            }
          }
        );
        
        const scores = response.data[0];
        const positive = scores.find((s: any) => s.label === 'POS')?.score || 0;
        const negative = scores.find((s: any) => s.label === 'NEG')?.score || 0;
        
        const score = positive - negative;
        return {
          score,
          sentiment: score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral'
        };
      }
    } catch (error) {
      console.error('Sentiment analysis error:', error);
    }
    
    return { score: 0, sentiment: 'neutral' };
  }
}