const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = require('path').join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && !key.startsWith('#')) {
    env[key.trim()] = vals.join('=').trim();
  }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);
supabase.rpc('exec_sql', { query: 'SELECT 1;' }).then(console.log).catch(console.error);
