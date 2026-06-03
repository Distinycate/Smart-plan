const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase.from('BasicOptions').select('optionType');
  const types = new Set(data.map(d => d.optionType));
  console.log("Types:", Array.from(types));
}
main();
