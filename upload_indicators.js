require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function run() {
  const dataPath = path.join(__dirname, 'scratch_docx', 'parsed_indicators_v2.json');
  if (!fs.existsSync(dataPath)) {
    console.error("Data file not found at:", dataPath);
    process.exit(1);
  }

  const indicators = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`Loaded ${indicators.length} indicators from JSON.`);

  console.log("Clearing existing Indicators table...");
  // Supabase delete requires a filter. Deleting where indicatorId is not null will delete all rows.
  const { error: deleteError } = await supabase
    .from('Indicators')
    .delete()
    .not('indicatorId', 'is', null);

  if (deleteError) {
    console.error("Error clearing table:", deleteError);
    process.exit(1);
  }
  console.log("Successfully cleared existing Indicators.");

  console.log("Uploading new Indicators in batches...");
  const batchSize = 100;
  let successCount = 0;

  for (let i = 0; i < indicators.length; i += batchSize) {
    const batch = indicators.slice(i, i + batchSize);
    
    // Map JSON keys to match the DB schema (just in case they don't exactly match)
    // Actually, they exactly match based on my previous script.
    const { error: insertError } = await supabase
      .from('Indicators')
      .insert(batch);

    if (insertError) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
      // Don't exit on first error, try to insert others, or maybe exit? 
      // Let's print it. It might be due to a constraint.
    } else {
      successCount += batch.length;
      console.log(`Inserted ${successCount} / ${indicators.length}`);
    }
  }

  console.log("Upload completed!");
}

run();
