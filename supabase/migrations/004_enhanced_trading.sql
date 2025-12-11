-- supabase/migrations/004_enhanced_trading.sql
CREATE TABLE enhanced_market_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(10) NOT NULL,
  signal_type VARCHAR(20) NOT NULL,
  confidence_score DECIMAL(5,4),
  source_data JSONB,
  ai_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_market_signals_symbol_time 
ON enhanced_market_signals(symbol, created_at DESC);