import PlanForm from '../PlanForm';
import { createClient } from '@/utils/supabase/server';

export default async function EditPlanPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    isAdmin = data?.role === 'admin';
  }
  return <PlanForm planId={params.id} isAdmin={isAdmin} />;
}
