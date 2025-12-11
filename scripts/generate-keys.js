import crypto from 'crypto';

function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex'); // 64 character hex
}

console.log('🔐 Generating secure keys for your environment...\n');

console.log('ENCRYPTION_KEY=' + generateEncryptionKey());
console.log('JWT_SECRET=' + generateSecureKey(32));
console.log('ADMIN_API_KEY=' + generateSecureKey(32));

console.log('\n⚠️  Add these keys to your .env.local file immediately!');
console.log('🚨 Keep these keys secure and never commit them to version control!');