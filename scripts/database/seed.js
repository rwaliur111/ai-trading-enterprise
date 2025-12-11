const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Environment check for seeding:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedData() {
  console.log('🌱 Seeding initial data...');

  try {
    // First, test the connection
    const { data: testData, error: testError } = await supabase
      .from('trading_signals')
      .select('count')
      .limit(1);

    if (testError && testError.code === '42P01') {
      console.error('❌ Tables not created yet. Please run migrations first.');
      console.log('💡 Run the SQL manually in your Supabase dashboard:');
      console.log('1. Go to: https://supabase.com/dashboard');
      console.log('2. Select your project');
      console.log('3. Go to SQL Editor');
      console.log('4. Run the SQL from: supabase/migrations/001_initial_schema.sql');
      process.exit(1);
    }

    // Seed sample trading signals
    const sampleSignals = [
      {
        symbol: 'AAPL',
        action: 'BUY',
        type: 'MARKET',
        price: 150.25,
        quantity: 100,
        confidence: 0.85,
        reasoning: 'Strong earnings report and technical breakout',
        source: 'AI_ANALYSIS'
      },
      {
        symbol: 'GOOGL',
        action: 'HOLD',
        type: 'MARKET',
        price: 2750.80,
        quantity: 10,
        confidence: 0.72,
        reasoning: 'Consolidation phase, waiting for breakout',
        source: 'AI_ANALYSIS'
      },
      {
        symbol: 'TSLA',
        action: 'SELL',
        type: 'MARKET',
        price: 240.60,
        quantity: 50,
        confidence: 0.68,
        reasoning: 'Overbought conditions and negative sentiment',
        source: 'AI_ANALYSIS'
      }
    ];

    console.log('📊 Seeding sample trading signals...');
    const { error: signalsError } = await supabase
      .from('trading_signals')
      .insert(sampleSignals);

    if (signalsError) {
      console.error('Error seeding signals:', signalsError.message);
    } else {
      console.log('✅ Sample signals seeded successfully');
    }

    // Seed sample positions
    const samplePositions = [
      {
        symbol: 'AAPL',
        quantity: 100,
        average_price: 145.50,
        current_price: 150.25,
        unrealized_pl: 475.00,
        realized_pl: 0
      },
      {
        symbol: 'MSFT',
        quantity: 50,
        average_price: 325.75,
        current_price: 330.45,
        unrealized_pl: 235.00,
        realized_pl: 0
      }
    ];

    console.log('💼 Seeding sample positions...');
    const { error: positionsError } = await supabase
      .from('positions')
      .insert(samplePositions);

    if (positionsError) {
      console.error('Error seeding positions:', positionsError.message);
    } else {
      console.log('✅ Sample positions seeded successfully');
    }

    console.log('🎉 Database seeding completed!');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
  }
}

seedData();
