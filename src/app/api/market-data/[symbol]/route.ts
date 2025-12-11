import { NextRequest, NextResponse } from 'next/server';
import { AlphaVantageService } from '@/infrastructure/external-apis/alpha-vantage-service';
import { AIAgentOrchestrator } from '@/application/services/ai-agent-orchestrator';

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol.toUpperCase();
    
    const marketDataService = new AlphaVantageService();
    const aiOrchestrator = new AIAgentOrchestrator();
    
    const quote = await marketDataService.getRealTimeQuote(symbol);
    const analysis = await aiOrchestrator.analyze(symbol);

    return NextResponse.json({
      symbol,
      quote,
      analysis,
      timestamp: new Date().toISOString(),
      source: 'Alpha Vantage + AI Analysis'
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      symbol: params.symbol
    }, { status: 500 });
  }
}