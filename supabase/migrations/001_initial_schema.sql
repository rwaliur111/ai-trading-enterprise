-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE trade_side AS ENUM ('buy', 'sell');
CREATE TYPE trade_status AS ENUM ('pending', 'filled', 'cancelled', 'rejected', 'expired');
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE market_sentiment AS ENUM ('bullish', 'bearish', 'neutral');
CREATE TYPE signal_action AS ENUM ('BUY', 'SELL', 'HOLD');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  encrypted_password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  alpaca_api_key VARCHAR(255),
  alpaca_secret_key VARCHAR(255),
  risk_tolerance risk_level DEFAULT 'medium',
  daily_trade_limit DECIMAL(15,2) DEFAULT 10000.00,
  max_position_size DECIMAL(15,2) DEFAULT 5000.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  initial_capital DECIMAL(15,2) NOT NULL,
  current_value DECIMAL(15,2) DEFAULT 0.00,
  total_pnl DECIMAL(15,2) DEFAULT 0.00,
  daily_pnl DECIMAL(15,2) DEFAULT 0.00,
  win_rate DECIMAL(5,4) DEFAULT 0.00,
  sharpe_ratio DECIMAL(10,4),
  max_drawdown DECIMAL(10,4),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
  external_order_id VARCHAR(100), -- Alpaca order ID
  symbol VARCHAR(10) NOT NULL,
  side trade_side NOT NULL,
  quantity INTEGER NOT NULL,
  entry_price DECIMAL(15,4) NOT NULL,
  exit_price DECIMAL(15,4),
  pnl DECIMAL(15,2),
  pnl_percentage DECIMAL(10,4),
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
  exit_time TIMESTAMP WITH TIME ZONE,
  holding_period INTERVAL,
  ai_confidence DECIMAL(5,4) NOT NULL,
  risk_level risk_level NOT NULL,
  status trade_status NOT NULL,
  stop_loss DECIMAL(15,4),
  take_profit DECIMAL(15,4),
  notes TEXT,
  
  -- Technical indicators at entry
  entry_rsi DECIMAL(10,4),
  entry_macd DECIMAL(10,4),
  entry_macd_signal DECIMAL(10,4),
  entry_moving_average_20 DECIMAL(15,4),
  entry_moving_average_50 DECIMAL(15,4),
  entry_moving_average_200 DECIMAL(15,4),
  entry_bollinger_upper DECIMAL(15,4),
  entry_bollinger_lower DECIMAL(15,4),
  
  -- Metadata
  market_sentiment market_sentiment,
  news_sentiment_score DECIMAL(5,4),
  sector VARCHAR(50),
  market_cap DECIMAL(20,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create market_data table
CREATE TABLE IF NOT EXISTS market_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol VARCHAR(10) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  interval VARCHAR(10) NOT NULL, -- 'minute', 'hour', 'day'
  
  -- OHLCV data
  open DECIMAL(15,4) NOT NULL,
  high DECIMAL(15,4) NOT NULL,
  low DECIMAL(15,4) NOT NULL,
  close DECIMAL(15,4) NOT NULL,
  volume BIGINT NOT NULL,
  vwap DECIMAL(15,4),
  
  -- Technical indicators
  rsi DECIMAL(10,4),
  macd DECIMAL(10,4),
  macd_signal DECIMAL(10,4),
  macd_histogram DECIMAL(10,4),
  moving_average_20 DECIMAL(15,4),
  moving_average_50 DECIMAL(15,4),
  moving_average_200 DECIMAL(15,4),
  bollinger_upper DECIMAL(15,4),
  bollinger_lower DECIMAL(15,4),
  atr DECIMAL(15,4),
  stochastic_k DECIMAL(10,4),
  stochastic_d DECIMAL(10,4),
  
  -- Market context
  market_sentiment market_sentiment,
  fear_greed_index DECIMAL(5,2),
  vix DECIMAL(10,4),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Composite index for faster queries
  UNIQUE(symbol, timestamp, interval)
);

-- Create signals table
CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol VARCHAR(10) NOT NULL,
  action signal_action NOT NULL,
  confidence DECIMAL(5,4) NOT NULL,
  reason TEXT NOT NULL,
  price DECIMAL(15,4) NOT NULL,
  risk_level risk_level NOT NULL,
  
  -- Target prices
  target_price DECIMAL(15,4),
  stop_loss DECIMAL(15,4),
  position_size INTEGER,
  expected_return DECIMAL(10,4),
  holding_period_days INTEGER,
  
  -- Technical indicators
  rsi DECIMAL(10,4),
  macd DECIMAL(10,4),
  macd_signal DECIMAL(10,4),
  macd_histogram DECIMAL(10,4),
  moving_average_20 DECIMAL(15,4),
  moving_average_50 DECIMAL(15,4),
  moving_average_200 DECIMAL(15,4),
  bollinger_upper DECIMAL(15,4),
  bollinger_lower DECIMAL(15,4),
  
  -- Metadata
  sector VARCHAR(50),
  market_cap DECIMAL(20,2),
  is_executed BOOLEAN DEFAULT false,
  executed_trade_id UUID REFERENCES trades(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create market_analysis table
CREATE TABLE IF NOT EXISTS market_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  overall_sentiment market_sentiment NOT NULL,
  fear_greed_index DECIMAL(5,2) NOT NULL,
  vix DECIMAL(10,4) NOT NULL,
  put_call_ratio DECIMAL(10,4) NOT NULL,
  
  -- Sector performance (stored as JSON)
  sector_performance JSONB NOT NULL,
  
  -- Market indicators
  sp500_change DECIMAL(10,4),
  nasdaq_change DECIMAL(10,4),
  dow_jones_change DECIMAL(10,4),
  advance_decline_ratio DECIMAL(10,4),
  
  -- Risk factors (stored as JSON array)
  risk_factors JSONB,
  
  -- Top opportunities (stored as JSON array of signal IDs)
  top_opportunities JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create news_articles table
CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id VARCHAR(255) UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  url TEXT NOT NULL,
  source VARCHAR(100) NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Sentiment analysis
  sentiment market_sentiment,
  sentiment_score DECIMAL(5,4),
  
  -- Associated symbols (stored as JSON array)
  symbols JSONB,
  
  -- Categories/tags (stored as JSON array)
  categories JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create portfolio_analysis table
CREATE TABLE IF NOT EXISTS portfolio_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Risk metrics
  overall_risk risk_level NOT NULL,
  diversification_score DECIMAL(5,4) NOT NULL,
  total_value DECIMAL(15,2) NOT NULL,
  max_drawdown DECIMAL(10,4),
  sharpe_ratio DECIMAL(10,4),
  volatility DECIMAL(10,4),
  beta DECIMAL(10,4),
  alpha DECIMAL(10,4),
  
  -- Performance metrics
  daily_return DECIMAL(10,4),
  weekly_return DECIMAL(10,4),
  monthly_return DECIMAL(10,4),
  ytd_return DECIMAL(10,4),
  
  -- Allocation (stored as JSON)
  sector_allocation JSONB,
  asset_allocation JSONB,
  
  -- Recommendations (stored as JSON array of signal IDs)
  recommendations JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_monitoring table
CREATE TABLE IF NOT EXISTS system_monitoring (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- System metrics
  cpu_usage DECIMAL(5,2) NOT NULL,
  memory_usage DECIMAL(5,2) NOT NULL,
  disk_usage DECIMAL(5,2) NOT NULL,
  api_latency_ms DECIMAL(10,2) NOT NULL,
  error_rate DECIMAL(5,4) NOT NULL,
  
  -- Trading system metrics
  active_trades INTEGER NOT NULL DEFAULT 0,
  pending_orders INTEGER NOT NULL DEFAULT 0,
  daily_trade_count INTEGER NOT NULL DEFAULT 0,
  queue_size INTEGER NOT NULL DEFAULT 0,
  
  -- AI system metrics
  ai_analysis_count INTEGER NOT NULL DEFAULT 0,
  ai_average_confidence DECIMAL(5,4),
  ai_error_rate DECIMAL(5,4),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_trades_portfolio_id ON trades(portfolio_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_entry_time ON trades(entry_time);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_ai_confidence ON trades(ai_confidence);

CREATE INDEX idx_market_data_symbol_timestamp ON market_data(symbol, timestamp DESC);
CREATE INDEX idx_market_data_interval ON market_data(interval);
CREATE INDEX idx_market_data_timestamp ON market_data(timestamp DESC);

CREATE INDEX idx_signals_symbol ON signals(symbol);
CREATE INDEX idx_signals_confidence ON signals(confidence DESC);
CREATE INDEX idx_signals_created_at ON signals(created_at DESC);
CREATE INDEX idx_signals_is_executed ON signals(is_executed);

CREATE INDEX idx_news_articles_published_at ON news_articles(published_at DESC);
CREATE INDEX idx_news_articles_symbols ON news_articles USING gin(symbols);
CREATE INDEX idx_news_articles_sentiment ON news_articles(sentiment);

CREATE INDEX idx_market_analysis_timestamp ON market_analysis(timestamp DESC);

CREATE INDEX idx_portfolio_analysis_portfolio_id ON portfolio_analysis(portfolio_id);
CREATE INDEX idx_portfolio_analysis_timestamp ON portfolio_analysis(timestamp DESC);

CREATE INDEX idx_system_monitoring_timestamp ON system_monitoring(timestamp DESC);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at 
  BEFORE UPDATE ON portfolios 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at 
  BEFORE UPDATE ON trades 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate trade P&L
CREATE OR REPLACE FUNCTION calculate_trade_pnl()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.exit_price IS NOT NULL AND NEW.entry_price IS NOT NULL THEN
    IF NEW.side = 'buy' THEN
      NEW.pnl = (NEW.exit_price - NEW.entry_price) * NEW.quantity;
    ELSE
      NEW.pnl = (NEW.entry_price - NEW.exit_price) * NEW.quantity;
    END IF;
    
    NEW.pnl_percentage = (NEW.pnl / (NEW.entry_price * NEW.quantity)) * 100;
    NEW.holding_period = NEW.exit_time - NEW.entry_time;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_trade_pnl_trigger
  BEFORE UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION calculate_trade_pnl();

-- Create function to update portfolio value
CREATE OR REPLACE FUNCTION update_portfolio_value()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update portfolio current_value and total_pnl
    UPDATE portfolios p
    SET 
      current_value = COALESCE((
        SELECT SUM(
          CASE 
            WHEN t.exit_price IS NULL THEN t.quantity * md.close
            ELSE 0
          END
        )
        FROM trades t
        LEFT JOIN market_data md ON t.symbol = md.symbol 
          AND md.interval = 'day'
          AND md.timestamp = (
            SELECT MAX(timestamp) 
            FROM market_data 
            WHERE symbol = t.symbol AND interval = 'day'
          )
        WHERE t.portfolio_id = NEW.portfolio_id
      ), 0),
      total_pnl = COALESCE((
        SELECT SUM(pnl)
        FROM trades
        WHERE portfolio_id = NEW.portfolio_id
          AND exit_price IS NOT NULL
      ), 0),
      win_rate = COALESCE((
        SELECT COUNT(*) FILTER (WHERE pnl > 0)::DECIMAL / NULLIF(COUNT(*), 0)
        FROM trades
        WHERE portfolio_id = NEW.portfolio_id
          AND exit_price IS NOT NULL
      ), 0),
      updated_at = NOW()
    WHERE p.id = NEW.portfolio_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_portfolio_value_trigger
  AFTER INSERT OR UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION update_portfolio_value();

-- Create view for dashboard metrics
CREATE VIEW dashboard_metrics AS
SELECT 
  p.id as portfolio_id,
  p.name as portfolio_name,
  p.current_value,
  p.total_pnl,
  p.win_rate,
  p.sharpe_ratio,
  COUNT(DISTINCT t.symbol) as distinct_symbols,
  COUNT(t.id) as total_trades,
  COUNT(t.id) FILTER (WHERE t.exit_time IS NULL) as active_trades,
  COALESCE(AVG(t.ai_confidence), 0) as avg_ai_confidence,
  COALESCE(AVG(t.pnl_percentage) FILTER (WHERE t.pnl_percentage IS NOT NULL), 0) as avg_pnl_percentage
FROM portfolios p
LEFT JOIN trades t ON p.id = t.portfolio_id
GROUP BY p.id, p.name, p.current_value, p.total_pnl, p.win_rate, p.sharpe_ratio;

-- Create view for trade analysis
CREATE VIEW trade_analysis AS
SELECT 
  t.*,
  p.name as portfolio_name,
  EXTRACT(EPOCH FROM (t.exit_time - t.entry_time)) / 3600 as holding_period_hours,
  CASE 
    WHEN t.pnl > 0 THEN 'win'
    WHEN t.pnl < 0 THEN 'loss'
    ELSE 'breakeven'
  END as trade_result,
  md.rsi as exit_rsi,
  md.macd as exit_macd
FROM trades t
JOIN portfolios p ON t.portfolio_id = p.id
LEFT JOIN market_data md ON t.symbol = md.symbol 
  AND md.interval = 'day'
  AND md.timestamp = (
    SELECT MAX(timestamp) 
    FROM market_data 
    WHERE symbol = t.symbol AND interval = 'day'
      AND timestamp <= t.exit_time
  )
WHERE t.exit_time IS NOT NULL;

-- Insert sample data (optional, remove in production)
INSERT INTO users (email, encrypted_password, first_name, last_name, risk_tolerance) VALUES
('demo@trading.com', '$2a$10$yourhashedpassword', 'Demo', 'Trader', 'medium');

INSERT INTO portfolios (user_id, name, initial_capital, current_value) VALUES
((SELECT id FROM users WHERE email = 'demo@trading.com'), 'Main Portfolio', 100000, 100000);

-- Grant permissions (adjust based on your security needs)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT INSERT, UPDATE, DELETE ON trades, signals, market_analysis TO authenticated;
GRANT SELECT ON dashboard_metrics, trade_analysis TO authenticated;

COMMENT ON TABLE users IS 'User accounts for the trading platform';
COMMENT ON TABLE portfolios IS 'Trading portfolios';
COMMENT ON TABLE trades IS 'Individual trades executed by the system';
COMMENT ON TABLE market_data IS 'Historical market data with technical indicators';
COMMENT ON TABLE signals IS 'AI-generated trading signals';
COMMENT ON TABLE market_analysis IS 'Market analysis snapshots';
COMMENT ON TABLE news_articles IS 'News articles with sentiment analysis';
COMMENT ON TABLE portfolio_analysis IS 'Portfolio analysis snapshots';
COMMENT ON TABLE system_monitoring IS 'System performance metrics';
COMMENT ON TABLE audit_logs IS 'Audit trail for system actions';