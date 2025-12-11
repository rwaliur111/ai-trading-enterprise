-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Portfolios table
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    strategy TEXT,
    risk_tolerance TEXT CHECK (risk_tolerance IN ('LOW', 'MEDIUM', 'HIGH')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, name)
);

-- Symbols table (for reference)
CREATE TABLE symbols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL UNIQUE,
    name TEXT,
    exchange TEXT,
    sector TEXT,
    industry TEXT,
    market_cap NUMERIC,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Positions table
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    symbol_id UUID REFERENCES symbols(id),
    symbol TEXT NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity >= 0),
    avg_entry_price NUMERIC NOT NULL,
    current_price NUMERIC,
    market_value NUMERIC GENERATED ALWAYS AS (quantity * current_price) STORED,
    cost_basis NUMERIC GENERATED ALWAYS AS (quantity * avg_entry_price) STORED,
    unrealized_pl NUMERIC GENERATED ALWAYS AS ((quantity * current_price) - (quantity * avg_entry_price)) STORED,
    unrealized_pl_percent NUMERIC GENERATED ALWAYS AS (
        CASE 
            WHEN quantity * avg_entry_price > 0 
            THEN ((quantity * current_price) - (quantity * avg_entry_price)) / (quantity * avg_entry_price) * 100
            ELSE 0
        END
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(portfolio_id, symbol)
);

-- Trades table
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    price NUMERIC NOT NULL,
    commission NUMERIC DEFAULT 0,
    total_amount NUMERIC GENERATED ALWAYS AS (
        CASE 
            WHEN side = 'BUY' THEN (quantity * price) + commission
            ELSE (quantity * price) - commission
        END
    ) STORED,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'FILLED', 'CANCELLED', 'REJECTED')) DEFAULT 'FILLED',
    order_id TEXT,
    alpaca_order_id TEXT,
    signal_id UUID,
    strategy TEXT,
    risk_percentage NUMERIC,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    filled_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- AI Signals table
CREATE TABLE ai_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('BUY', 'SELL', 'HOLD')),
    confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    reason TEXT,
    price NUMERIC,
    target_price NUMERIC,
    stop_loss NUMERIC,
    risk_level TEXT CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    indicators JSONB,
    metadata JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    executed BOOLEAN DEFAULT FALSE,
    executed_at TIMESTAMP WITH TIME ZONE,
    execution_notes TEXT
);

-- Market data cache table
CREATE TABLE market_data_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL,
    data_type TEXT NOT NULL CHECK (data_type IN ('QUOTE', 'HISTORICAL', 'NEWS', 'OVERVIEW')),
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(symbol, data_type)
);

-- Portfolio performance history
CREATE TABLE portfolio_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    total_value NUMERIC NOT NULL,
    cash_balance NUMERIC NOT NULL,
    invested_value NUMERIC NOT NULL,
    daily_pl NUMERIC,
    daily_pl_percent NUMERIC,
    positions_count INTEGER,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(portfolio_id, recorded_at)
);

-- Risk metrics table
CREATE TABLE risk_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    volatility NUMERIC,
    sharpe_ratio NUMERIC,
    sortino_ratio NUMERIC,
    max_drawdown NUMERIC,
    beta NUMERIC,
    var_95 NUMERIC,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings (for API keys, preferences)
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    alpaca_api_key TEXT,
    alpaca_api_secret TEXT,
    alpaca_paper BOOLEAN DEFAULT TRUE,
    polygon_api_key TEXT,
    alpha_vantage_api_key TEXT,
    news_api_key TEXT,
    trading_preferences JSONB DEFAULT '{}',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_positions_portfolio ON positions(portfolio_id);
CREATE INDEX idx_positions_symbol ON positions(symbol);
CREATE INDEX idx_trades_portfolio ON trades(portfolio_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_created ON trades(created_at);
CREATE INDEX idx_signals_symbol ON ai_signals(symbol);
CREATE INDEX idx_signals_generated ON ai_signals(generated_at);
CREATE INDEX idx_market_cache_expires ON market_data_cache(expires_at);
CREATE INDEX idx_portfolio_history_recorded ON portfolio_history(recorded_at);
CREATE INDEX idx_portfolio_history_portfolio ON portfolio_history(portfolio_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS (Row Level Security) policies
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policies for multi-tenant security
CREATE POLICY "Users can only access their own portfolios" ON portfolios
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own positions" ON positions
    FOR ALL USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can only access their own trades" ON trades
    FOR ALL USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can only access their own signals" ON ai_signals
    FOR ALL USING (EXISTS (SELECT 1 FROM portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can only access their own settings" ON user_settings
    FOR ALL USING (auth.uid() = user_id);

-- Insert default symbols
INSERT INTO symbols (symbol, name, exchange, sector) VALUES
    ('AAPL', 'Apple Inc.', 'NASDAQ', 'Technology'),
    ('MSFT', 'Microsoft Corporation', 'NASDAQ', 'Technology'),
    ('GOOGL', 'Alphabet Inc.', 'NASDAQ', 'Technology'),
    ('AMZN', 'Amazon.com Inc.', 'NASDAQ', 'Consumer Cyclical'),
    ('TSLA', 'Tesla Inc.', 'NASDAQ', 'Automotive'),
    ('NVDA', 'NVIDIA Corporation', 'NASDAQ', 'Technology'),
    ('META', 'Meta Platforms Inc.', 'NASDAQ', 'Communication Services'),
    ('JPM', 'JPMorgan Chase & Co.', 'NYSE', 'Financial Services'),
    ('JNJ', 'Johnson & Johnson', 'NYSE', 'Healthcare'),
    ('V', 'Visa Inc.', 'NYSE', 'Financial Services'),
    ('SPY', 'SPDR S&P 500 ETF Trust', 'NYSEARCA', 'ETF'),
    ('QQQ', 'Invesco QQQ Trust', 'NASDAQ', 'ETF'),
    ('DIA', 'SPDR Dow Jones Industrial Average ETF', 'NYSEARCA', 'ETF'),
    ('IWM', 'iShares Russell 2000 ETF', 'NYSEARCA', 'ETF');

-- Create a function to update portfolio history
CREATE OR REPLACE FUNCTION update_portfolio_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO portfolio_history (portfolio_id, total_value, cash_balance, invested_value, positions_count)
    SELECT 
        p.id,
        COALESCE(SUM(pos.quantity * pos.current_price), 0) + 100000 as total_value, -- Example cash
        100000 as cash_balance, -- Example cash
        COALESCE(SUM(pos.quantity * pos.current_price), 0) as invested_value,
        COUNT(pos.id) as positions_count
    FROM portfolios p
    LEFT JOIN positions pos ON p.id = pos.portfolio_id
    WHERE p.id = NEW.portfolio_id
    GROUP BY p.id
    ON CONFLICT (portfolio_id, recorded_at) DO UPDATE SET
        total_value = EXCLUDED.total_value,
        cash_balance = EXCLUDED.cash_balance,
        invested_value = EXCLUDED.invested_value,
        positions_count = EXCLUDED.positions_count;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_history_after_trade AFTER INSERT ON trades
    FOR EACH ROW EXECUTE FUNCTION update_portfolio_history();