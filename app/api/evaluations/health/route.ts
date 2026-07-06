import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEvaluationMode } from '@/lib/lesson-plan/evaluation/modes';
import { getRubricCriterion } from '@/lib/lesson-plan/rubrics/master-rubric';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result: Record<string, any> = {
    supabase: 'pending',
    databaseTables: {
      evaluation_jobs: 'pending',
      evaluation_results: 'pending',
    },
    ai: {
      geminiApiKey: 'pending',
    },
    rubrics: 'pending',
    modes: ['lesson_plan_basic', 'wpa_w9', 'committee_4d'],
  };

  let isOk = true;

  try {
    // 1. Check ENV variables and Supabase connection
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      result.supabase = 'missing_credentials';
      isOk = false;
    } else {
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      
      // 2. Check Database Tables
      const { error: jobsError } = await admin.from('evaluation_jobs').select('id').limit(1);
      if (jobsError) {
        result.databaseTables.evaluation_jobs = `error: ${jobsError.code} ${jobsError.message}`;
        isOk = false;
      } else {
        result.databaseTables.evaluation_jobs = 'ok';
      }

      const { error: resultsError } = await admin.from('evaluation_results').select('id').limit(1);
      if (resultsError) {
        result.databaseTables.evaluation_results = `error: ${resultsError.code} ${resultsError.message}`;
        isOk = false;
      } else {
        result.databaseTables.evaluation_results = 'ok';
      }
      
      if (!jobsError && !resultsError) {
        result.supabase = 'ok';
      } else {
        result.supabase = 'table_error';
      }
    }

    // 3. Check Gemini API key
    if (process.env.GEMINI_API_KEY_EVALUATE || process.env.GEMINI_API_KEY) {
      result.ai.geminiApiKey = 'present';
    } else {
      result.ai.geminiApiKey = 'missing';
      isOk = false;
    }

    // 4. Check Rubrics & Modes
    try {
      for (const mode of result.modes) {
        const sections = getEvaluationMode(mode as any).sections;
        for (const sec of sections) {
          const crit = getRubricCriterion(mode as any, sec);
          if (!crit || !crit.maxScore) {
            throw new Error(`Missing rubric for mode=${mode} section=${sec}`);
          }
        }
      }
      result.rubrics = 'ok';
    } catch (e) {
      result.rubrics = `error: ${e instanceof Error ? e.message : String(e)}`;
      isOk = false;
    }

  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: 'Health check failed unexpectedly',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }

  return NextResponse.json({
    ok: isOk,
    data: result
  }, { status: isOk ? 200 : 503 });
}
