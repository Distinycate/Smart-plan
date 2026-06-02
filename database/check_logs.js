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
const ANON_KEY = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const url = `${SUPABASE_URL}/rest/v1/System_Logs?select=*&order=timestamp.desc&limit=10`;

fetch(url, {
  headers: {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`
  }
})
.then(res => res.json())
.then(data => {
  console.log("Recent System Logs:", JSON.stringify(data, null, 2));
})
.catch(err => console.error(err));
