const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ALPACA_API_KEY',
  'ALPACA_SECRET_KEY',
  'HUGGINGFACE_API_KEY',
  'REDIS_URL'
];

function validateEnv() {
  console.log('🔍 Validating environment variables...\n');
  
  const missing = [];
  const present = [];
  
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    } else {
      present.push(varName);
    }
  });
  
  console.log('✅ Present variables:');
  present.forEach(varName => {
    const value = process.env[varName];
    const maskedValue = varName.includes('KEY') || varName.includes('SECRET') || varName.includes('PASSWORD')
      ? value.substring(0, 8) + '...' + value.substring(value.length - 4)
      : value;
    console.log(`   ${varName}: ${maskedValue}`);
  });
  
  console.log('\n❌ Missing variables:');
  missing.forEach(varName => {
    console.log(`   ${varName}`);
  });
  
  if (missing.length > 0) {
    console.log('\n🚨 Add missing variables to .env.local and Vercel environment');
    process.exit(1);
  }
  
  console.log('\n🎉 All environment variables are set!');
}

validateEnv();