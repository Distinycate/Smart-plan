const fs = require('fs');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const EXCEL_PATH = '../lesson-plan-generator/english_curriculum_appscript_database.xlsx';

async function importData() {
  console.log(`Reading Excel file: ${EXCEL_PATH}`);
  let workbook;
  try {
    workbook = xlsx.readFile(EXCEL_PATH);
  } catch (err) {
    console.error(`Failed to read Excel file: ${err.message}`);
    process.exit(1);
  }

  // --- 1. IMPORT STANDARDS ---
  console.log("\n--- Processing Standards ---");
  const stdSheet = workbook.Sheets['Standards'];
  if (stdSheet) {
    const stdData = xlsx.utils.sheet_to_json(stdSheet);
    console.log(`Found ${stdData.length} standards in Excel.`);

    // Fetch existing standards from Supabase
    const { data: existingOpts, error: fetchErr } = await supabase
      .from('BasicOptions')
      .select('optionName')
      .eq('optionType', 'standard');
    
    if (fetchErr) {
      console.error("Error fetching existing standards:", fetchErr);
    } else {
      const existingStdNames = new Set(existingOpts.map(o => o.optionName));
      
      const newStandards = [];
      for (const row of stdData) {
        const standardCode = row['StandardCode'];
        const standardText = row['StandardText'];
        
        if (standardCode && !existingStdNames.has(standardCode)) {
          newStandards.push({
            optionId: `opt-std-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
            optionType: 'standard',
            optionName: standardCode,
            optionText: standardText,
            isActive: true
          });
          existingStdNames.add(standardCode); // prevent duplicates within the file itself
        }
      }

      if (newStandards.length > 0) {
        console.log(`Inserting ${newStandards.length} new standards...`);
        const { error: insertErr } = await supabase.from('BasicOptions').insert(newStandards);
        if (insertErr) {
          console.error("Error inserting new standards:", insertErr);
        } else {
          console.log(`Successfully inserted ${newStandards.length} standards.`);
        }
      } else {
        console.log("No new standards to insert.");
      }
    }
  } else {
    console.log("Sheet 'Standards' not found.");
  }

  // --- 2. IMPORT INDICATORS ---
  console.log("\n--- Processing Indicators ---");
  const indSheet = workbook.Sheets['Indicators'];
  if (indSheet) {
    const indData = xlsx.utils.sheet_to_json(indSheet);
    console.log(`Found ${indData.length} indicators in Excel.`);

    // Fetch existing indicators from Supabase
    const { data: existingInds, error: fetchIndErr } = await supabase
      .from('Indicators')
      .select('indicatorCode');
    
    if (fetchIndErr) {
      console.error("Error fetching existing indicators:", fetchIndErr);
    } else {
      const existingIndCodes = new Set(existingInds.map(i => i.indicatorCode));
      
      const newIndicators = [];
      for (const row of indData) {
        const indicatorCode = row['IndicatorCode'];
        
        if (indicatorCode && !existingIndCodes.has(indicatorCode)) {
          newIndicators.push({
            indicatorId: row['ID'] || `ind-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
            learningArea: row['Strand'] || 'ภาษาต่างประเทศ',
            gradeLevel: row['Grade'],
            standardCode: row['StandardCode'],
            standardText: row['StandardText'] || '',
            indicatorType: row['IndicatorTypeKey'] || 'during',
            indicatorCode: indicatorCode,
            indicatorText: row['IndicatorText'] || '',
            isActive: true
          });
          existingIndCodes.add(indicatorCode); // prevent duplicates within file
        }
      }

      if (newIndicators.length > 0) {
        console.log(`Inserting ${newIndicators.length} new indicators...`);
        // Insert in batches if large
        const batchSize = 100;
        for (let i = 0; i < newIndicators.length; i += batchSize) {
          const batch = newIndicators.slice(i, i + batchSize);
          const { error: insertIndErr } = await supabase.from('Indicators').insert(batch);
          if (insertIndErr) {
            console.error(`Error inserting new indicators (batch ${i}):`, insertIndErr);
          } else {
            console.log(`Successfully inserted batch ${i/batchSize + 1} (${batch.length} rows).`);
          }
        }
      } else {
        console.log("No new indicators to insert.");
      }
    }
  } else {
    console.log("Sheet 'Indicators' not found.");
  }

  console.log("\n--- Done ---");
}

importData().catch(console.error);
