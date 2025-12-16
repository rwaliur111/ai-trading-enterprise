require('dotenv').config({ path: '.env.local' });

console.log('🔍 Checking environment variables...\n');

const required = {
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'ALPACA_API_KEY': process.env.ALPACA_API_KEY,
  'ALPACA_SECRET_KEY': process.env.ALPACA_SECRET_KEY,
  'HUGGINGFACE_API_KEY': process.env.HUGGINGFACE_API_KEY,
  'REDIS_HOST': process.env.REDIS_HOST,
  'REDIS_PASSWORD': process.env.REDIS_PASSWORD
};

let allGood = true;

Object.entries(required).forEach(([key, value]) => {
  if (!value) {
    console.log(`❌ MISSING: ${key}`);
    allGood = false;
  } else if (key.includes('KEY') || key.includes('SECRET')) {
    const masked = value.substring(0, 8) + '...' + value.substring(value.length - 4);
    console.log(`✅ ${key}: ${masked}`);
  } else {
    console.log(`✅ ${key}: ${value}`);
  }
});

console.log('\n');
if (allGood) {
  console.log('🎉 All required environment variables are set!');
} else {
  console.log('🚨 Some required variables are missing. Please check your .env.local file.');
  process.exit(1);
}