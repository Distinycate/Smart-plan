const fs = require('fs');
const path = require('path');
const https = require('https');

// Load .env.local manually
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

// Alter Table SQL Query
const sql = `
ALTER TABLE "LessonPlans" 
ADD COLUMN IF NOT EXISTS "rubricK" TEXT,
ADD COLUMN IF NOT EXISTS "rubricP" TEXT,
ADD COLUMN IF NOT EXISTS "rubricA" TEXT;
`;

const body = JSON.stringify({ query: sql });
const urlObj = new URL(`${SUPABASE_URL}/pg/query`);

console.log('Sending alter table query to:', urlObj.toString());

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
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${data}`);
  });
});

req.on('error', (err) => {
  console.error('Error:', err);
});

req.write(body);
req.end();
