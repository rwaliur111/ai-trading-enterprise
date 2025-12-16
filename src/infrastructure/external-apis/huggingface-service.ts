export class HuggingFaceService {
  private apiKey: string;
  private baseUrl = 'https://api-inference.huggingface.co/models';

  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY!;
  }

  // Sentiment analysis for news/articles
  async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    scores: { positive: number; negative: number; neutral: number };
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/distilbert-base-uncased-finetuned-sst-2-english`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: text }),
        }
      );

      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const results = data[0];
        const positiveScore = results.find((r: any) => r.label === 'POSITIVE')?.score || 0;
        const negativeScore = results.find((r: any) => r.label === 'NEGATIVE')?.score || 0;
        
        const sentiment = positiveScore > negativeScore ? 'positive' : 'negative';
        const confidence = Math.max(positiveScore, negativeScore);
        
        return {
          sentiment,
          confidence,
          scores: {
            positive: positiveScore,
            negative: negativeScore,
            neutral: 1 - (positiveScore + negativeScore)
          }
        };
      }
      
      return {
        sentiment: 'neutral',
        confidence: 0.5,
        scores: { positive: 0.33, negative: 0.33, neutral: 0.34 }
      };
    } catch (error) {
      console.error('HuggingFace sentiment analysis failed:', error);
      return {
        sentiment: 'neutral',
        confidence: 0.5,
        scores: { positive: 0.33, negative: 0.33, neutral: 0.34 }
      };
    }
  }

  // Financial sentiment analysis (specialized model)
  async analyzeFinancialSentiment(text: string): Promise<{
    sentiment: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: text }),
        }
      );

      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const results = data[0];
        const bullishScore = results.find((r: any) => r.label === 'positive')?.score || 0;
        const bearishScore = results.find((r: any) => r.label === 'negative')?.score || 0;
        const neutralScore = results.find((r: any) => r.label === 'neutral')?.score || 0;
        
        const maxScore = Math.max(bullishScore, bearishScore, neutralScore);
        let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
        
        if (maxScore === bullishScore) sentiment = 'bullish';
        else if (maxScore === bearishScore) sentiment = 'bearish';
        
        return {
          sentiment,
          confidence: maxScore
        };
      }
      
      return {
        sentiment: 'neutral',
        confidence: 0.5
      };
    } catch (error) {
      console.error('HuggingFace financial sentiment analysis failed:', error);
      return {
        sentiment: 'neutral',
        confidence: 0.5
      };
    }
  }

  // Zero-shot classification for news categorization
  async categorizeNews(text: string, categories: string[]): Promise<{
    category: string;
    confidence: number;
    allScores: Record<string, number>;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/facebook/bart-large-mnli`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: text,
            parameters: { candidate_labels: categories }
          }),
        }
      );

      const data = await response.json();
      
      if (data.labels && data.scores) {
        const maxScoreIndex = data.scores.indexOf(Math.max(...data.scores));
        const allScores: Record<string, number> = {};
        
        data.labels.forEach((label: string, index: number) => {
          allScores[label] = data.scores[index];
        });
        
        return {
          category: data.labels[maxScoreIndex],
          confidence: data.scores[maxScoreIndex],
          allScores
        };
      }
      
      return {
        category: categories[0],
        confidence: 0.5,
        allScores: {}
      };
    } catch (error) {
      console.error('HuggingFace categorization failed:', error);
      return {
        category: categories[0],
        confidence: 0.5,
        allScores: {}
      };
    }
  }

  // Summarize long articles/news
  async summarizeText(text: string, maxLength: number = 150): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/facebook/bart-large-cnn`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: text,
            parameters: { max_length: maxLength, min_length: 30 }
          }),
        }
      );

      const data = await response.json();
      
      if (data[0]?.summary_text) {
        return data[0].summary_text;
      }
      
      return text.slice(0, maxLength) + '...';
    } catch (error) {
      console.error('HuggingFace summarization failed:', error);
      return text.slice(0, maxLength) + '...';
    }
  }
}