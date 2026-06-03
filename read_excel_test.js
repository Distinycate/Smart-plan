const xlsx = require('xlsx');

function readHeaders(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    console.log(`\nFile: ${filePath}`);
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      if (json.length > 0) {
        console.log(`Sheet: ${sheetName}`);
        console.log(`Headers:`, json[0]);
        console.log(`Row 2:`, json[1]);
      }
    });
  } catch(e) {
    console.error(`Error reading ${filePath}:`, e.message);
  }
}

readHeaders('../lesson-plan-generator/english_standards_indicators_database.xlsx');
readHeaders('../lesson-plan-generator/english_curriculum_appscript_database.xlsx');
