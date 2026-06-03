const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase.from('BasicOptions').select('optionType, optionText').in('optionType', ['media', 'mediaTemplate', 'learningSource', 'task']);
  let commCount = 0;
  data.forEach(d => {
    if (d.optionText && d.optionText.includes('English_Communication')) {
      commCount++;
      console.log(d.optionType, d.optionText);
    }
  });
  console.log("Total Comm:", commCount);
}
main();
