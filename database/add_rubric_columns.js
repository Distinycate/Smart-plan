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

// The correct Supabase Management API endpoint for running SQL
// Uses: POST /rest/v1/rpc/exec_sql (if RPC is available)
// OR we can use the Supabase pg endpoint directly
const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
console.log('Project Ref:', projectRef);

// Use the correct Supabase Management API
const sql = `ALTER TABLE "LessonPlans" ADD COLUMN IF NOT EXISTS "rubricK" TEXT; ALTER TABLE "LessonPlans" ADD COLUMN IF NOT EXISTS "rubricP" TEXT; ALTER TABLE "LessonPlans" ADD COLUMN IF NOT EXISTS "rubricA" TEXT;`;

const body = JSON.stringify({ query: sql });

// Try using /sql endpoint (Management API)
const managementUrl = new URL(`https://api.supabase.com/v1/projects/${projectRef}/database/query`);

const options = {
  hostname: managementUrl.hostname,
  path: managementUrl.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Length': Buffer.byteLength(body)
  }
};

console.log('🚀 Sending ALTER TABLE to add rubricK, rubricP, rubricA columns...');
console.log('URL:', managementUrl.toString());

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${data}`);
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ Successfully added rubric columns!');
    } else {
      console.log('❌ Failed. Please add columns manually via Supabase SQL Editor:');
      console.log('---');
      console.log('ALTER TABLE "LessonPlans"');
      console.log('ADD COLUMN IF NOT EXISTS "rubricK" TEXT,');
      console.log('ADD COLUMN IF NOT EXISTS "rubricP" TEXT,');
      console.log('ADD COLUMN IF NOT EXISTS "rubricA" TEXT;');
      console.log('---');
      console.log('Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
    }
  });
});

req.on('error', (err) => {
  console.error('Error:', err);
});

req.write(body);
req.end();
