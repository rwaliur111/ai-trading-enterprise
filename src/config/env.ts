// src/config/env.ts
export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
  },
  trading: {
    polygonApiKey: process.env.POLYGON_API_KEY!,
    alpacaApiKey: process.env.ALPACA_API_KEY!,
    alpacaSecretKey: process.env.ALPACA_SECRET_KEY!,
    alpacaPaper: process.env.ALPACA_PAPER === 'true'
  },
  ai: {
    huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY!,
    openaiApiKey: process.env.OPENAI_API_KEY!
  },
  redis: {
    url: process.env.REDIS_URL!
  },
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY!,
    jwtSecret: process.env.JWT_SECRET!
  },
  discord: {
    tradingWebhook: process.env.DISCORD_WEBHOOK_URL_TRADING!,
    alertsWebhook: process.env.DISCORD_WEBHOOK_URL_ALERTS!,
    errorsWebhook: process.env.DISCORD_WEBHOOK_URL_ERRORS!
  },
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000'),
    appUrl: process.env.NEXT_PUBLIC_APP_URL!
  }
} as const;

// Validate required environment variables
export function validateEnvironment() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'ALPACA_API_KEY',
    'ALPACA_SECRET_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
