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

// Use Supabase REST API to query column info from information_schema
// We'll call /rest/v1/rpc/exec_sql if available, or check via a SELECT
const sql = `
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'LessonPlans' 
AND column_name IN ('rubricK', 'rubricP', 'rubricA')
ORDER BY column_name;
`;

const body = JSON.stringify({ query: sql });

// Try Supabase SQL endpoint (different path)
const urlStr = `${SUPABASE_URL}/rest/v1/`;
const urlObj = new URL(urlStr);

console.log('🔍 Checking if rubric columns exist in LessonPlans table...');
console.log('Supabase URL:', SUPABASE_URL);

// Try to fetch a single record to check if rubricK field exists
const checkUrl = new URL(`${SUPABASE_URL}/rest/v1/LessonPlans?select=rubricK,rubricP,rubricA&limit=1`);

const options = {
  hostname: checkUrl.hostname,
  path: checkUrl.pathname + checkUrl.search,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'apikey': SERVICE_ROLE_KEY,
    'Prefer': 'return=representation'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    if (res.statusCode === 200) {
      console.log('✅ rubricK, rubricP, rubricA columns EXIST in the database!');
      console.log('Response:', data.substring(0, 200));
    } else if (res.statusCode === 400 && data.includes('column')) {
      console.log('❌ Rubric columns are MISSING! You need to add them via Supabase Dashboard.');
      console.log('Go to: Supabase Dashboard > Table Editor > LessonPlans > Add Column');
      console.log('Add columns: rubricK TEXT, rubricP TEXT, rubricA TEXT');
      console.log('Response:', data);
    } else {
      console.log('⚠️  Unexpected response:', data.substring(0, 300));
    }
  });
});

req.on('error', (err) => {
  console.error('Error:', err);
});

req.end();
