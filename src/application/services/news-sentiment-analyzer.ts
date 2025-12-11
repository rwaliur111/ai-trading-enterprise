import { HuggingFaceService } from '@/infrastructure/external-apis/huggingface-service';
import { OpenAIService } from '@/infrastructure/external-apis/openai-service';

export class NewsSentimentAnalyzer {
  private huggingFace: HuggingFaceService;
  private openAI: OpenAIService;

  constructor() {
    this.huggingFace = new HuggingFaceService();
    this.openAI = new OpenAIService();
  }

  async analyzeBatch(newsItems: any[]): Promise<any[]> {
    const results = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < newsItems.length; i += batchSize) {
      const batch = newsItems.slice(i, i + batchSize);
      const batchPromises = batch.map(item => this.analyzeSingle(item));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Rate limiting
      if (i + batchSize < newsItems.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  private async analyzeSingle(newsItem: any): Promise<any> {
    const text = `${newsItem.title}. ${newsItem.description || ''}`;
    
    try {
      // Try HuggingFace first (free/cheaper)
      const sentiment = await this.huggingFace.analyzeSentiment(text);
      
      // If important news, get deeper analysis
      if (sentiment.score > 0.7 || sentiment.score < -0.7) {
        const impact = await this.openAI.analyzeNewsImpact(text, newsItem.source);
        return {
          ...newsItem,
          sentiment,
          impact,
          analyzedAt: new Date().toISOString()
        };
      }
      
      return {
        ...newsItem,
        sentiment,
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return {
        ...newsItem,
        sentiment: { score: 0, label: 'neutral' },
        analyzedAt: new Date().toISOString()
      };
    }
  }

  async getMarketSentiment(symbols: string[]): Promise<Record<string, any>> {
    const sentiments: Record<string, any> = {};
    
    // Aggregate sentiment across all news for each symbol
    for (const symbol of symbols) {
      const news = await this.getRecentNews(symbol);
      const analyzed = await this.analyzeBatch(news);
      
      const averageScore = analyzed.reduce((sum, item) => sum + item.sentiment.score, 0) / analyzed.length;
      const positiveCount = analyzed.filter(item => item.sentiment.score > 0.3).length;
      const negativeCount = analyzed.filter(item => item.sentiment.score < -0.3).length;
      
      sentiments[symbol] = {
        score: averageScore,
        label: averageScore > 0.2 ? 'bullish' : averageScore < -0.2 ? 'bearish' : 'neutral',
        confidence: Math.abs(averageScore),
        positiveArticles: positiveCount,
        negativeArticles: negativeCount,
        totalArticles: analyzed.length,
        keyHeadlines: analyzed.slice(0, 3).map((item: any) => ({
          title: item.title,
          sentiment: item.sentiment.label,
          score: item.sentiment.score
        }))
      };
    }
    
    return sentiments;
  }

  private async getRecentNews(symbol: string): Promise<any[]> {
    // Implement news fetching from your preferred source
    // This is a placeholder
    return [
      { title: `${symbol} reports strong earnings`, source: 'Reuters' },
      { title: `Analysts upgrade ${symbol} to buy`, source: 'Bloomberg' }
    ];
  }
}
