const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const dataPath = path.join(__dirname, 'parsed_curriculum.json');
  if (!fs.existsSync(dataPath)) {
    console.error("Parsed curriculum not found");
    return;
  }

  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log(`Loaded ${rawData.length} indicators from JSON.`);

  const mappedData = rawData.map(item => ({
    indicatorId: `ind-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
    learningArea: item.Subject,
    gradeLevel: item.Grade,
    standardCode: item.StandardCode,
    standardText: "", // We didn't parse this from the regex, but it's okay for now
    indicatorType: "ระหว่างทาง", // Defaulting, can be refined
    indicatorCode: item.IndicatorCode,
    indicatorText: item.IndicatorText,
    isActive: true
  }));

  console.log("Starting insert...");
  const batchSize = 100;
  for (let i = 0; i < mappedData.length; i += batchSize) {
    const batch = mappedData.slice(i, i + batchSize);
    const { error } = await supabase.from('Indicators').insert(batch);
    if (error) {
      console.error(`Error inserting batch ${i}:`, error);
    } else {
      console.log(`Inserted batch ${i/batchSize + 1} (${batch.length} rows)`);
    }
  }
  console.log("Done inserting indicators.");
}

run();
