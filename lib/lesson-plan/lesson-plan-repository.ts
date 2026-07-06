import { supabaseAdmin } from '@/lib/supabase/admin';

export async function getLessonPlanById(planId: string, userId?: string) {
  let query = supabaseAdmin
    .from('LessonPlans')
    .select('*')
    .eq('planId', planId);
    
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data, error } = await query.maybeSingle();
  return { data, error };
}

export async function updateLessonPlan(planId: string, content: Record<string, unknown>, userId?: string) {
  let query = supabaseAdmin
    .from('LessonPlans')
    .update(content)
    .eq('planId', planId);
    
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data, error } = await query.select().single();
  return { data, error };
}
