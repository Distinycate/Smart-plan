const fs = require('fs');
const path = require('path');
const https = require('https');

// Load .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && !key.startsWith('#')) {
    env[key.trim()] = vals.join('=').trim();
  }
});

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Read Migration 15 SQL
const sqlPath = path.join(__dirname, 'migrations/15_smart_plan_v3_domain_foundation.sql');
const fullSql = fs.readFileSync(sqlPath, 'utf8');

console.log('Applying Smart Plan V3 Domain Foundation Migration (15)...');

const body = JSON.stringify({ query: fullSql });
const urlObj = new URL(`${SUPABASE_URL}/pg/query`);

const options = {
  hostname: urlObj.hostname,
  path: urlObj.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'apikey': SERVICE_ROLE_KEY,
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`✅ Migration 15 applied successfully! (Status: ${res.statusCode})`);
    } else {
      console.log(`ℹ️ Supabase pg/query endpoint returned status: ${res.statusCode}`);
      console.log(data);
      console.log('\nNote: If direct pg/query is disabled on this Supabase project, execute migration 15 via Supabase Dashboard SQL Editor.');
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Network request error:', err.message);
});

req.write(body);
req.end();
