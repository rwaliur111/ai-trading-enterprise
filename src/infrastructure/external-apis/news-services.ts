import axios from 'axios';

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  symbol?: string;
}

export class NewsService {
  private apiKey: string;
  private baseUrl = 'https://newsapi.org/v2';

  constructor() {
    this.apiKey = process.env.NEWS_API_KEY!;
  }

  async getMarketNews(symbol?: string): Promise<NewsArticle[]> {
    try {
      const params: any = {
        apiKey: this.apiKey,
        q: symbol || 'stock market',
        language: 'en',
        pageSize: 20,
        sortBy: 'publishedAt'
      };

      const response = await axios.get(`${this.baseUrl}/everything`, { params });
      
      return response.data.articles.map((article: any) => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source.name,
        publishedAt: article.publishedAt,
        symbol: symbol
      }));
    } catch (error) {
      console.error('Error fetching news:', error);
      return [];
    }
  }

  async getTopHeadlines(): Promise<NewsArticle[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/top-headlines`, {
        params: {
          apiKey: this.apiKey,
          category: 'business',
          country: 'us',
          pageSize: 10
        }
      });
      
      return response.data.articles.map((article: any) => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source.name,
        publishedAt: article.publishedAt
      }));
    } catch (error) {
      console.error('Error fetching top headlines:', error);
      return [];
    }
  }
}
