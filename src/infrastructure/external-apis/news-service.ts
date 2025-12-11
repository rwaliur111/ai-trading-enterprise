import axios from "axios";
export class NewsService {
  async getNews(symbol: string): Promise<any[]> { return []; }
  async getSentiment(symbol: string): Promise<{score: number, sentiment: string}> { 
    return { score: 0, sentiment: "neutral" }; 
  }
}
