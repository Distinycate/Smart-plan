import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { buildEflSupplementalMasterData } from '@/lib/eflTopicTemplates';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Fetch AppConfig
    const { data: configData, error: configErr } = await supabase
      .from('AppConfig')
      .select('*')
      .eq('isActive', true);
    
    if (configErr) throw configErr;
    
    const configMap: Record<string, string> = {};
    configData?.forEach(item => {
      configMap[item.configKey] = item.configValue || '';
    });

    // 2. Fetch Subjects
    const { data: subjects, error: subErr } = await supabase
      .from('Subjects')
      .select('*')
      .eq('isActive', true)
      .order('subjectCode', { ascending: true });
      
    if (subErr) throw subErr;

    // 3. Fetch Units
    const { data: units, error: unitErr } = await supabase
      .from('Units')
      .select('*')
      .eq('isActive', true)
      .order('unitNumber', { ascending: true });
      
    if (unitErr) throw unitErr;

    // 4. Fetch LessonTopics
    const { data: topics, error: topicErr } = await supabase
      .from('LessonTopics')
      .select('*')
      .eq('isActive', true)
      .order('topicNumber', { ascending: true });
      
    if (topicErr) throw topicErr;

    // 5. Fetch Indicators
    const { data: indicators, error: indErr } = await supabase
      .from('Indicators')
      .select('*')
      .eq('isActive', true)
      .order('indicatorCode', { ascending: true });
      
    if (indErr) throw indErr;

    // 6. Fetch BasicOptions
    const { data: options, error: optErr } = await supabase
      .from('BasicOptions')
      .select('*')
      .eq('isActive', true);
      
    if (optErr) throw optErr;

    // Group options by optionType
    const groupedOptions: Record<string, any[]> = {};
    options?.forEach(opt => {
      const type = opt.optionType;
      if (!groupedOptions[type]) {
        groupedOptions[type] = [];
      }
      groupedOptions[type].push(opt);
    });

    const supplementalMasterData = buildEflSupplementalMasterData(subjects || [], units || [], topics || []);

    return NextResponse.json({
      success: true,
      data: {
        config: configMap,
        subjects,
        units: supplementalMasterData.units,
        topics: supplementalMasterData.topics,
        indicators,
        options: groupedOptions
      }
    });

  } catch (error: any) {
    console.error('Error loading initial data:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}
