#!/usr/bin/env node
/**
 * Supabase Seed Script
 * รัน: node database/seed.js
 * จะสร้างตาราง + Seed ข้อมูลทั้งหมดเข้า Supabase
 */

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

// Read schema.sql
const sqlPath = path.join(__dirname, 'schema.sql');
const fullSql = fs.readFileSync(sqlPath, 'utf8');

// Extract only Seed Data (INSERT statements) — skip DROP/CREATE
const lines = fullSql.split('\n');
const seedLines = [];
let inSeed = false;

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('-- Seeding') || trimmed.startsWith('INSERT INTO')) {
    inSeed = true;
  }
  if (inSeed) {
    seedLines.push(line);
  }
}

const seedSql = seedLines.join('\n');

console.log('🌱 Starting Supabase Seed...');
console.log(`📡 Target: ${SUPABASE_URL}`);
console.log(`📄 SQL lines to execute: ${seedLines.length}`);

// Use Supabase SQL REST API via /rest/v1/rpc or direct query
// We use the pg REST endpoint (SQL Editor API)
const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
const apiUrl = `https://${projectRef}.supabase.co/rest/v1/rpc/exec_sql`;

// Actually use the Management API approach via pg
// Split by semicolons to run each statement
const statements = seedSql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 10 && !s.startsWith('--'));

console.log(`\n📊 Total INSERT statements: ${statements.length}`);

// Use node-fetch or https to call Supabase SQL
async function runSQL(sql) {
  const url = `${SUPABASE_URL}/rest/v1/`;
  // We use the pg REST endpoint
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql + ';' });
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
          resolve({ ok: true, status: res.statusCode });
        } else {
          resolve({ ok: false, status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Use Supabase's direct table insert approach via REST API
async function insertViaREST(tableName, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const urlObj = new URL(`${SUPABASE_URL}/rest/v1/${tableName}`);
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'resolution=ignore-duplicates,return=minimal',
        'Content-Length': Buffer.byteLength(body)
      }
    };


    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ ok: res.statusCode < 300, status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Parse INSERT statements into structured data
function parseInserts(sql) {
  const inserts = {};
  const insertRegex = /INSERT INTO "([^"]+)" \(([^)]+)\) VALUES \((.+?)\);/gs;
  let match;
  
  while ((match = insertRegex.exec(sql)) !== null) {
    const table = match[1];
    const cols = match[2].split(',').map(c => c.trim().replace(/"/g, ''));
    const rawVals = match[3];
    
    // Parse values - handle quotes, booleans, nulls, numbers
    const vals = [];
    let current = '';
    let inStr = false;
    let depth = 0;
    
    for (let i = 0; i < rawVals.length; i++) {
      const ch = rawVals[i];
      if (ch === "'" && rawVals[i-1] !== '\\') inStr = !inStr;
      if (!inStr && ch === ',') {
        vals.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    vals.push(current.trim());
    
    const row = {};
    cols.forEach((col, idx) => {
      let val = vals[idx];
      if (val === 'TRUE') val = true;
      else if (val === 'FALSE') val = false;
      else if (val === 'NULL') val = null;
      else if (val && val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1).replace(/\\'/g, "'");
      else if (!isNaN(val) && val !== '') val = Number(val);
      row[col] = val;
    });
    
    if (!inserts[table]) inserts[table] = [];
    inserts[table].push(row);
  }
  return inserts;
}

async function main() {
  try {
    console.log('\n🔍 Parsing seed data from schema.sql...');
    const inserts = parseInserts(seedSql);
    
    const tableOrder = ['AppConfig', 'Subjects', 'Units', 'LessonTopics', 'Indicators', 'BasicOptions'];
    
    for (const table of tableOrder) {
      const rows = inserts[table];
      if (!rows || rows.length === 0) {
        console.log(`⏭️  ${table}: ไม่มีข้อมูล`);
        continue;
      }
      
      console.log(`\n📥 Inserting ${table} (${rows.length} rows)...`);
      
      // Batch in chunks of 50
      const chunkSize = 50;
      let successCount = 0;
      
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const result = await insertViaREST(table, chunk);
        
        if (result.ok) {
          successCount += chunk.length;
          process.stdout.write(`  ✅ ${Math.min(i + chunkSize, rows.length)}/${rows.length}\r`);
        } else {
          console.log(`\n  ⚠️  Batch ${i}-${i+chunkSize}: HTTP ${result.status}`);
          if (result.body) {
            try {
              const err = JSON.parse(result.body);
              if (err.code === '23505') {
                console.log(`     (ข้อมูลซ้ำ — ข้ามไป OK)`);
                successCount += chunk.length;
              } else {
                console.log(`     Error: ${err.message || result.body.substring(0, 100)}`);
              }
            } catch(e) {
              console.log(`     Response: ${result.body.substring(0, 150)}`);
            }
          }
        }
      }
      console.log(`  ✅ ${table}: ${successCount}/${rows.length} rows inserted/skipped`);
    }
    
    console.log('\n🎉 Seed เสร็จสมบูรณ์!');
    console.log('📋 สรุป:');
    tableOrder.forEach(t => {
      const rows = inserts[t];
      if (rows) console.log(`   ${t}: ${rows.length} rows`);
    });
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();
