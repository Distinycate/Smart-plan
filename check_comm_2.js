const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase.from('BasicOptions').select('*');
  let comm = data.filter(d => d.optionText && d.optionText.includes('English_Communication'));
  console.log(comm);
}
main();
