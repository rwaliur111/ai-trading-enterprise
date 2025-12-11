// Trading Configuration
export const TRADING_CONFIG = {
  // Position Sizing
  MAX_POSITION_SIZE: 25000, // $25,000 max per position
  MAX_PORTFOLIO_ALLOCATION: 0.15, // 15% max allocation to single position
  MIN_POSITION_SIZE: 100, // $100 minimum position
  MAX_DAILY_POSITIONS: 20, // Maximum new positions per day
  
  // Risk Management
  MAX_DAILY_LOSS: 1000, // $1,000 max daily loss
  MAX_PORTFOLIO_DRAWDOWN: 0.10, // 10% max portfolio drawdown
  RISK_PER_TRADE: 0.01, // 1% risk per trade (conservative)
  RISK_FREE_RATE: 0.04, // 4% annual risk-free rate
  MAX_LEVERAGE: 2.0, // Maximum 2x leverage
  STOP_LOSS_PERCENT: 0.02, // 2% stop loss default
  
  // Trading Rules
  COMMISSION_PER_TRADE: 0.00, // $0 commission (Alpaca free trading)
  MIN_HOLDING_PERIOD: 1, // Minimum 1 day holding period
  MAX_ORDERS_PER_DAY: 100, // Maximum 100 orders per day
  COOLING_PERIOD: 5, // 5 minutes between same symbol trades
  
  // AI Configuration
  MIN_CONFIDENCE_THRESHOLD: 0.70, // 70% minimum confidence for AI signals
  MAX_SIGNALS_PER_DAY: 50, // Maximum AI signals to act on per day
  SIGNAL_VALIDITY_HOURS: 4, // How long a signal is considered valid (4 hours)
  REBALANCE_FREQUENCY: 'weekly', // Portfolio rebalance frequency
  
  // System Configuration
  PAPER_TRADING: process.env.ALPACA_PAPER === 'true',
  ENABLE_AUTO_TRADING: false, // Set to true to enable automatic trade execution
  TRADING_HOURS_ONLY: true, // Only trade during market hours
  ENABLE_EXTENDED_HOURS: false, // Trade during extended hours
  
  // Performance Targets
  TARGET_ANNUAL_RETURN: 0.20, // 20% target annual return
  TARGET_SHARPE_RATIO: 1.5, // Target Sharpe ratio
  MAX_VOLATILITY: 0.25, // Maximum acceptable volatility
  MIN_WIN_RATE: 0.55, // Minimum 55% win rate
  
  // Market Data
  DATA_REFRESH_INTERVAL: 30, // Seconds between data refreshes
  HISTORICAL_DATA_DAYS: 365, // Days of historical data to keep
  REAL_TIME_UPDATES: true, // Enable real-time WebSocket updates
  
  // Order Execution
  SLIPPAGE_TOLERANCE: 0.001, // 0.1% maximum slippage
  EXECUTION_TIMEOUT: 30, // 30 seconds for order execution
  RETRY_FAILED_ORDERS: true, // Retry failed orders
  MAX_ORDER_RETRIES: 3, // Maximum order retry attempts
}

// API Configuration
export const API_CONFIG = {
  // Retry Configuration
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // ms
  RETRY_BACKOFF: 2.0, // Exponential backoff factor
  
  // Timeout Configuration
  TIMEOUT: 30000, // 30 seconds
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  SOCKET_TIMEOUT: 60000, // 60 seconds for WebSocket
  
  // Rate Limits (requests per minute)
  RATE_LIMIT: {
    alpaca: 200, // 200 requests/minute
    polygon: 5, // 5 requests/minute (free tier)
    alphaVantage: 5, // 5 requests/minute (free tier)
    news: 100, // 100 requests/minute
    redis: 10000, // 10,000 requests/minute
    database: 1000, // 1,000 requests/minute
  },
  
  // Batch Configuration
  BATCH_SIZE: {
    quotes: 100, // Max symbols per quote request
    historical: 50, // Max days per historical request
    orders: 25, // Max orders per request
    signals: 20, // Max signals per analysis
  },
  
  // Cache Configuration
  CACHE_TIMEOUT: 60000, // 60 seconds default cache
  PREFETCH_ENABLED: true, // Prefetch frequently accessed data
  CACHE_WARMUP: true, // Warm up cache on startup
}

// Cache Configuration
export const CACHE_CONFIG = {
  // Time-to-live in seconds
  TTL: {
    QUOTE: 5, // 5 seconds for quotes (real-time)
    HISTORICAL: 300, // 5 minutes for historical data
    NEWS: 600, // 10 minutes for news
    SIGNAL: 1800, // 30 minutes for signals
    PORTFOLIO: 30, // 30 seconds for portfolio
    MARKET_STATUS: 60, // 1 minute for market status
    ACCOUNT: 30, // 30 seconds for account info
    ORDER: 10, // 10 seconds for order status
    ANALYSIS: 900, // 15 minutes for analysis results
    SCAN: 300, // 5 minutes for market scans
  },
  
  // Cache key prefixes
  PREFIXES: {
    QUOTE: 'q:',
    HISTORICAL: 'h:',
    NEWS: 'n:',
    SIGNAL: 's:',
    PORTFOLIO: 'p:',
    ACCOUNT: 'a:',
    ORDER: 'o:',
    MARKET: 'm:',
    ANALYSIS: 'an:',
    USER: 'u:',
  },
  
  // Redis configuration
  REDIS: {
    HOST: process.env.REDIS_HOST || 'localhost',
    PORT: parseInt(process.env.REDIS_PORT || '6379'),
    PASSWORD: process.env.REDIS_PASSWORD || '',
    DB: parseInt(process.env.REDIS_DB || '0'),
    KEY_PREFIX: 'trading:',
    CLUSTER_MODE: false,
    SENTINEL: false,
  },
  
  // Memory cache configuration
  MEMORY: {
    MAX_ITEMS: 10000,
    MAX_AGE: 3600000, // 1 hour
    UPDATE_AGE_ON_GET: true,
  }
}

// Symbols Configuration
export const SYMBOLS = {
  // Primary watchlist (50 major stocks)
  WATCHLIST: [
    // Technology (15)
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'AVGO', 'ADBE', 'CSCO',
    'CRM', 'INTC', 'AMD', 'QCOM', 'TXN',
    
    // Financials (10)
    'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'BLK', 'SPGI', 'AXP', 'V',
    
    // Healthcare (8)
    'JNJ', 'UNH', 'PFE', 'ABT', 'MRK', 'TMO', 'LLY', 'ABBV',
    
    // Consumer (7)
    'PG', 'KO', 'PEP', 'WMT', 'COST', 'MCD', 'NKE',
    
    // Industrials (5)
    'BA', 'CAT', 'HON', 'UPS', 'FDX',
    
    // Energy (5)
    'XOM', 'CVX', 'COP', 'SLB', 'EOG',
  ],
  
  // Major indices and ETFs
  INDICES: [
    'SPY',  // S&P 500
    'QQQ',  // Nasdaq 100
    'DIA',  // Dow Jones
    'IWM',  // Russell 2000
    'VOO',  // Vanguard S&P 500
    'VTI',  // Vanguard Total Market
    'IVV',  // iShares S&P 500
    'IJH',  // iShares Mid-Cap
    'IJR',  // iShares Small-Cap
  ],
  
  // Sector ETFs
  SECTORS: [
    'XLK',  // Technology
    'XLF',  // Financials
    'XLV',  // Healthcare
    'XLI',  // Industrials
    'XLP',  // Consumer Staples
    'XLY',  // Consumer Discretionary
    'XLE',  // Energy
    'XLU',  // Utilities
    'XLB',  // Materials
    'XLRE', // Real Estate
    'XLC',  // Communications
  ],
  
  // International ETFs
  INTERNATIONAL: [
    'EFA',  // Developed Markets
    'EEM',  // Emerging Markets
    'VEA',  // Developed ex-US
    'VWO',  // Emerging Markets
    'IXUS', // Total International
  ],
  
  // Bond ETFs
  BONDS: [
    'BND',  // Total Bond Market
    'AGG',  // Core US Aggregate Bond
    'TLT',  // 20+ Year Treasury
    'IEF',  // 7-10 Year Treasury
    'SHY',  // 1-3 Year Treasury
    'LQD',  // Investment Grade Corporate
    'HYG',  // High Yield Corporate
  ],
  
  // Alternative ETFs
  ALTERNATIVES: [
    'GLD',  // Gold
    'SLV',  // Silver
    'USO',  // Oil
    'UNG',  // Natural Gas
    'VNQ',  // Real Estate
    'REM',  // Mortgage REITs
  ],
  
  // Volatility ETFs
  VOLATILITY: [
    'UVXY', // 2x VIX Short-Term
    'VIXM', // VIX Mid-Term
    'VXX',  // VIX Short-Term
    'SVXY', // Inverse VIX Short-Term
  ],
  
  // Dividend ETFs
  DIVIDEND: [
    'SCHD', // US Dividend Equity
    'VYM',  // High Dividend Yield
    'SDY',  // S&P Dividend
    'DGRO', // Dividend Growth
  ],
  
  // Growth ETFs
  GROWTH: [
    'VUG',  // Growth ETF
    'IWF',  // Russell 1000 Growth
    'SCHG', // US Large-Cap Growth
    'IVW',  // S&P 500 Growth
  ],
  
  // Value ETFs
  VALUE: [
    'VTV',  // Value ETF
    'IWD',  // Russell 1000 Value
    'SCHV', // US Large-Cap Value
    'IVE',  // S&P 500 Value
  ],
  
  // Trading pairs for pairs trading
  PAIRS: [
    ['AAPL', 'MSFT'],
    ['GOOGL', 'AMZN'],
    ['TSLA', 'NVDA'],
    ['JPM', 'BAC'],
    ['XOM', 'CVX'],
    ['JNJ', 'UNH'],
    ['WMT', 'COST'],
    ['BA', 'CAT'],
  ],
  
  // High volatility symbols (for risk monitoring)
  HIGH_VOLATILITY: [
    'TSLA', 'NVDA', 'MRNA', 'SHOP', 'PYPL', 'SQ', 'NET', 'DDOG',
    'SNOW', 'CRWD', 'ZM', 'PTON', 'PLTR', 'HOOD', 'COIN',
  ],
  
  // Defensive symbols
  DEFENSIVE: [
    'JNJ', 'PG', 'KO', 'PEP', 'WMT', 'XLP', 'CL', 'MDT',
    'BDX', 'SYY', 'WM', 'RSG', 'AWK', 'WTRG', 'SO',
  ],
  
  // Cyclical symbols
  CYCLICAL: [
    'F', 'GM', 'NCLH', 'CCL', 'UAL', 'AAL', 'DAL', 'LUV',
    'MAR', 'HLT', 'EXPE', 'BKNG', 'MGM', 'CZR', 'RCL',
  ],
}

// UI Configuration
export const UI_CONFIG = {
  // Refresh intervals in milliseconds
  REFRESH_INTERVAL: {
    QUOTES: 5000, // 5 seconds
    PORTFOLIO: 10000, // 10 seconds
    SIGNALS: 30000, // 30 seconds
    NEWS: 60000, // 1 minute
    MARKET_STATUS: 30000, // 30 seconds
    ORDERS: 15000, // 15 seconds
  },
  
  // Chart configuration
  CHART: {
    PERIODS: ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'MAX'],
    DEFAULT_PERIOD: '1M',
    CANDLE_WIDTH: 8,
    VOLUME_HEIGHT: 0.25, // 25% of chart height
    INDICATORS: ['SMA', 'EMA', 'RSI', 'MACD', 'BB', 'Volume', 'ATR', 'Stochastic'],
    DEFAULT_INDICATORS: ['SMA', 'RSI', 'Volume'],
    COLORS: {
      UP: '#10B981', // Green
      DOWN: '#EF4444', // Red
      VOLUME: '#3B82F6', // Blue
      GRID: '#E5E7EB', // Gray 200
      TEXT: '#6B7280', // Gray 500
    },
  },
  
  // Theme configuration
  THEME: {
    COLORS: {
      // Primary colors
      PRIMARY: '#3B82F6',
      PRIMARY_DARK: '#1D4ED8',
      SECONDARY: '#10B981',
      SECONDARY_DARK: '#059669',
      ACCENT: '#8B5CF6',
      ACCENT_DARK: '#7C3AED',
      
      // Market colors
      BULLISH: '#10B981',
      BEARISH: '#EF4444',
      NEUTRAL: '#6B7280',
      WARNING: '#F59E0B',
      
      // UI colors
      BACKGROUND: '#F9FAFB',
      CARD: '#FFFFFF',
      BORDER: '#E5E7EB',
      TEXT_PRIMARY: '#111827',
      TEXT_SECONDARY: '#6B7280',
      TEXT_TERTIARY: '#9CA3AF',
      TEXT_DISABLED: '#D1D5DB',
      
      // Status colors
      SUCCESS: '#10B981',
      ERROR: '#EF4444',
      WARNING: '#F59E0B',
      INFO: '#3B82F6',
    },
    
    // Typography
    TYPOGRAPHY: {
      FONT_FAMILY: 'Inter, system-ui, -apple-system, sans-serif',
      FONT_SIZES: {
        xs: '0.75rem',    // 12px
        sm: '0.875rem',   // 14px
        base: '1rem',     // 16px
        lg: '1.125rem',   // 18px
        xl: '1.25rem',    // 20px
        '2xl': '1.5rem',  // 24px
        '3xl': '1.875rem', // 30px
        '4xl': '2.25rem',  // 36px
      },
      FONT_WEIGHTS: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
    },
    
    // Spacing (in rem)
    SPACING: {
      xs: '0.25rem',  // 4px
      sm: '0.5rem',   // 8px
      md: '1rem',     // 16px
      lg: '1.5rem',   // 24px
      xl: '2rem',     // 32px
      '2xl': '3rem',  // 48px
      '3xl': '4rem',  // 64px
    },
    
    // Border radius
    BORDER_RADIUS: {
      none: '0',
      sm: '0.125rem',  // 2px
      DEFAULT: '0.25rem', // 4px
      md: '0.375rem',  // 6px
      lg: '0.5rem',    // 8px
      xl: '0.75rem',   // 12px
      '2xl': '1rem',   // 16px
      full: '9999px',
    },
    
    // Shadows
    SHADOWS: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    },
  },
  
  // Layout configuration
  LAYOUT: {
    HEADER_HEIGHT: '4rem',     // 64px
    SIDEBAR_WIDTH: '16rem',    // 256px
    SIDEBAR_COLLAPSED: '4rem', // 64px
    CONTAINER_MAX: '120rem',   // 1920px
    CONTAINER_PADDING: '1rem', // 16px
  },
  
  // Animation configuration
  ANIMATION: {
    DURATION: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    TIMING: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
    },
  },
  
  // Responsive breakpoints (in pixels)
  BREAKPOINTS: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
}

// Risk Configuration
export const RISK_CONFIG = {
  // Value at Risk (VaR) settings
  VAR: {
    CONFIDENCE_LEVEL: 0.95, // 95% confidence
    TIME_HORIZON: 1, // 1 day
    HISTORICAL_PERIOD: 252, // 1 year of trading days
    MONTE_CARLO_SIMULATIONS: 10000,
  },
  
  // Stress test scenarios
  STRESS_TESTS: {
    MARKET_CRASH: -0.20, // 20% market crash
    INTEREST_RATE_HIKE: 0.02, // 2% rate hike
    SECTOR_ROTATION: -0.15, // 15% sector rotation
    VOLATILITY_SPIKE: 0.50, // 50% volatility increase
    LIQUIDITY_CRUNCH: -0.10, // 10% liquidity reduction
  },
  
  // Risk limits
  LIMITS: {
    MAX_SINGLE_POSITION_RISK: 0.05, // 5% of portfolio
    MAX_SECTOR_RISK: 0.30, // 30% of portfolio
    MAX_LEVERAGE_RISK: 0.50, // 50% of equity
    MAX_LIQUIDITY_RISK: 0.20, // 20% illiquid assets
    MAX_CURRENCY_RISK: 0.10, // 10% currency exposure
  },
  
  // Risk metrics thresholds
  THRESHOLDS: {
    SHARPE_MIN: 1.0,
    SORTINO_MIN: 1.2,
    MAX_DRAWDOWN: -0.15,
    VAR_95: -0.05,
    BETA_RANGE: [0.8, 1.2],
    CORRELATION_LIMIT: 0.7,
  },
}

// AI Model Configuration
export const AI_CONFIG = {
  // Model parameters
  MODELS: {
    SIGNAL_GENERATION: {
      NAME: 'ensemble_v1',
      VERSION: '1.2.0',
      ENSEMBLE_SIZE: 5,
      VOTING_THRESHOLD: 0.6,
    },
    RISK_ASSESSMENT: {
      NAME: 'risk_net_v2',
      VERSION: '2.1.0',
      CONFIDENCE_INTERVAL: 0.95,
    },
    PORTFOLIO_OPTIMIZATION: {
      NAME: 'portfolio_opt_v1',
      VERSION: '1.0.0',
      OBJECTIVE: 'sharpe_ratio',
      CONSTRAINTS: ['risk', 'liquidity', 'sector'],
    },
  },
  
  // Training configuration
  TRAINING: {
    DATA_DAYS: 365 * 5, // 5 years of data
    TEST_SPLIT: 0.2,
    VALIDATION_SPLIT: 0.1,
    BATCH_SIZE: 32,
    EPOCHS: 100,
    LEARNING_RATE: 0.001,
    EARLY_STOPPING_PATIENCE: 10,
  },
  
  // Feature engineering
  FEATURES: {
    TECHNICAL: [
      'rsi_14', 'macd', 'bollinger_bands', 'moving_average_20', 
      'moving_average_50', 'moving_average_200', 'atr_14', 'stochastic_14',
      'volume_ratio', 'price_momentum', 'volatility_20',
    ],
    FUNDAMENTAL: [
      'pe_ratio', 'market_cap', 'dividend_yield', 'roe', 
      'debt_to_equity', 'revenue_growth', 'profit_margin',
      'current_ratio', 'quick_ratio', 'eps_growth',
    ],
    MARKET: [
      'sector_performance', 'market_cap_weight', 'beta', 
      'correlation_sp500', 'advance_decline', 'vix',
      'treasury_yield', 'dollar_index', 'commodity_index',
    ],
    SENTIMENT: [
      'news_sentiment', 'social_sentiment', 'analyst_ratings',
      'insider_trading', 'institutional_ownership', 'short_interest',
    ],
  },
  
  // Prediction configuration
  PREDICTION: {
    HORIZON_DAYS: [1, 5, 20, 60], // 1, 5, 20, 60 day predictions
    CONFIDENCE_THRESHOLDS: {
      HIGH: 0.8,
      MEDIUM: 0.6,
      LOW: 0.4,
    },
    REBALANCE_FREQUENCY: 'weekly',
    MAX_POSITIONS: 50,
    MIN_POSITION_VALUE: 1000,
  },
}