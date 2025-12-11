// Create src/infrastructure/database/supabase-client.ts
@'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export interface Trade {
  id: string
  symbol: string
  action: 'BUY' | 'SELL' | 'PUT' | 'CALL'
  quantity: number
  price: number
  confidence_score: number
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED'
  created_at: string
  executed_at: string | null
  profit_loss: number | null
}

export interface MarketData {
  id: string
  symbol: string
  price: number
  volume: number
  timestamp: string
  source: string
  change: number
  change_percent: number
}

export interface Portfolio {
  id: string
  user_id: string
  symbol: string
  quantity: number
  average_price: number
  current_price: number
  total_value: number
  profit_loss: number
  profit_loss_percent: number
}
'@ | Set-Content -Path ".\src\infrastructure\database\supabase-client.ts" -Encoding UTF8