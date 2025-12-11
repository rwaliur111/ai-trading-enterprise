import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

console.log('🔧 Testing environment variables...');
console.log('');

// Check Supabase variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
if (supabaseUrl) {
  console.log('  Value:', supabaseUrl.substring(0, 20) + '...');
}

console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
if (supabaseAnonKey) {
  console.log('  Value:', supabaseAnonKey.substring(0, 20) + '...');
}

console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
if (supabaseServiceKey) {
  console.log('  Value:', supabaseServiceKey.substring(0, 20) + '...');
}

console.log('');
if (supabaseUrl && supabaseServiceKey) {
  console.log('🎉 All environment variables are set correctly!');
  console.log('You can now run: npm run db:migrate');
} else {
  console.log('❌ Some environment variables are missing.');
  console.log('Please check your .env.local file.');
}
