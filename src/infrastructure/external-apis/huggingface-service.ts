export class HuggingFaceService {
  private apiKey: string;
  private baseUrl: string = 'https://api-inference.huggingface.co/models';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeSentiment(text: string): Promise<{ label: string; score: number }> {
    const response = await this.makeRequest(
      '/cardiffnlp/twitter-roberta-base-sentiment-latest',
      { inputs: text }
    );

    if (Array.isArray(response) && response.length > 0) {
      return response[0][0]; // Returns the highest confidence sentiment
    }

    return { label: 'NEUTRAL', score: 0.5 };
  }

  async summarizeText(text: string): Promise<string> {
    const response = await this.makeRequest(
      '/facebook/bart-large-cnn',
      { inputs: text }
    );

    if (Array.isArray(response) && response.length > 0) {
      return response[0].summary_text;
    }

    return text.substring(0, 200) + '...'; // Fallback truncation
  }

  async classifyText(text: string, categories: string[]): Promise<{ label: string; score: number }> {
    const response = await this.makeRequest(
      '/facebook/bart-large-mnli',
      {
        inputs: text,
        parameters: { candidate_labels: categories.join(', ') }
      }
    );

    return response;
  }

  private async makeRequest(model: string, data: any): Promise<any> {
    const url = `${this.baseUrl}${model}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error making request to HuggingFace API:', error);
      throw error;
    }
  }
}